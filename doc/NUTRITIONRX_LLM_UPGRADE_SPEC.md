# NutritionRx Local LLM Upgrade Specification

## Objective

Bring NutritionRx's local LLM system to feature parity with GymRx's proven architecture. The current implementation is a flat, single-model setup with basic prompting. The target is GymRx's 4-stage context pipeline with confidence gating, derived insights, tiered model selection, and Apple Foundation Models support.

This spec covers three major systems:

1. **Multi-Provider Architecture** — Dynamic model selection based on device capability
2. **Context Generation Pipeline** — Turning raw SQLite nutrition data into high-quality prompts
3. **System Prompt Engineering** — Clear, bounded instructions that control LLM behavior

---

## Part 1: Multi-Provider Architecture

### 1.1 Device Classifier

**File:** `src/services/llm/deviceClassifier.ts`

Classify device capability to determine which LLM provider to use.

```typescript
import DeviceInfo from "react-native-device-info";
import { Platform } from "react-native";

export type DeviceCapability =
  | "apple_foundation"
  | "standard"
  | "compact"
  | "minimal"
  | "unsupported";

export interface DeviceClassification {
  capability: DeviceCapability;
  ramGB: number;
  architecture: string;
  model: string;
  isAppleIntelligenceEligible: boolean;
}

export async function classifyDevice(): Promise<DeviceClassification> {
  const totalMemory = await DeviceInfo.getTotalMemory();
  const ramGB = totalMemory / (1024 * 1024 * 1024);
  const abis = await DeviceInfo.supportedAbis();
  const model = await DeviceInfo.getModel();
  const architecture = abis[0] || "unknown";

  // Check Apple Intelligence eligibility
  const isAppleIntelligenceEligible = checkAppleIntelligenceEligibility(model);

  // ARM64 required for on-device inference
  const isARM64 = abis.some(
    (abi) => abi.includes("arm64") || abi.includes("aarch64"),
  );

  if (!isARM64) {
    return {
      capability: "unsupported",
      ramGB,
      architecture,
      model,
      isAppleIntelligenceEligible: false,
    };
  }

  // iOS 26+ with eligible hardware → Apple Foundation Models
  if (
    Platform.OS === "ios" &&
    typeof Platform.Version === "string" &&
    parseInt(Platform.Version, 10) >= 26 &&
    isAppleIntelligenceEligible
  ) {
    return {
      capability: "apple_foundation",
      ramGB,
      architecture,
      model,
      isAppleIntelligenceEligible,
    };
  }

  // RAM-based tiering for llama.rn
  if (ramGB >= 6)
    return {
      capability: "standard",
      ramGB,
      architecture,
      model,
      isAppleIntelligenceEligible,
    };
  if (ramGB >= 4)
    return {
      capability: "compact",
      ramGB,
      architecture,
      model,
      isAppleIntelligenceEligible,
    };
  if (ramGB >= 3)
    return {
      capability: "minimal",
      ramGB,
      architecture,
      model,
      isAppleIntelligenceEligible,
    };

  return {
    capability: "unsupported",
    ramGB,
    architecture,
    model,
    isAppleIntelligenceEligible: false,
  };
}

function checkAppleIntelligenceEligibility(model: string): boolean {
  // iPhone 16 family and later
  const iphoneMatch = model.match(/iPhone(\d+)/);
  if (iphoneMatch && parseInt(iphoneMatch[1], 10) >= 17) return true; // iPhone17,x = iPhone 16

  // iPad with M1+ (iPad14,x and later for Pro/Air with M chips)
  const ipadMatch = model.match(/iPad(\d+)/);
  if (ipadMatch && parseInt(ipadMatch[1], 10) >= 14) return true;

  return false;
}
```

### 1.2 Model Catalog

**File:** `src/services/llm/modelCatalog.ts`

```typescript
export interface ModelConfig {
  tier: "standard" | "compact" | "minimal";
  name: string;
  filename: string;
  huggingFaceRepo: string;
  huggingFaceFile: string;
  sizeBytes: number;
  sizeLabel: string;
  minRAMGB: number;
  contextSize: number;
  threads: number;
  chatTemplate: "chatml" | "llama3";
  stopTokens: string[];
}

export const MODEL_CATALOG: ModelConfig[] = [
  {
    tier: "standard",
    name: "SmolLM2 1.7B",
    filename: "smollm2-1.7b-instruct-q4_k_m.gguf",
    huggingFaceRepo: "bartowski/SmolLM2-1.7B-Instruct-GGUF",
    huggingFaceFile: "SmolLM2-1.7B-Instruct-Q4_K_M.gguf",
    sizeBytes: 1_020_000_000,
    sizeLabel: "~1 GB",
    minRAMGB: 6,
    contextSize: 2048,
    threads: 4,
    chatTemplate: "chatml",
    stopTokens: ["<|im_end|>", "<|im_start|>"],
  },
  {
    tier: "compact",
    name: "Llama 3.2 1B",
    filename: "llama-3.2-1b-instruct-q4_k_m.gguf",
    huggingFaceRepo: "bartowski/Llama-3.2-1B-Instruct-GGUF",
    huggingFaceFile: "Llama-3.2-1B-Instruct-Q4_K_M.gguf",
    sizeBytes: 670_000_000,
    sizeLabel: "~670 MB",
    minRAMGB: 4,
    contextSize: 1536,
    threads: 4,
    chatTemplate: "llama3",
    stopTokens: ["<|eot_id|>", "<|end_of_text|>"],
  },
  {
    tier: "minimal",
    name: "Qwen2.5 0.5B",
    filename: "qwen2.5-0.5b-instruct-q4_k_m.gguf",
    huggingFaceRepo: "Qwen/Qwen2.5-0.5B-Instruct-GGUF",
    huggingFaceFile: "qwen2.5-0.5b-instruct-q4_k_m.gguf",
    sizeBytes: 390_000_000,
    sizeLabel: "~390 MB",
    minRAMGB: 3,
    contextSize: 2048,
    threads: 2,
    chatTemplate: "chatml",
    stopTokens: ["<|im_end|>", "<|im_start|>"],
  },
];

export function selectModelForDevice(ramGB: number): ModelConfig | null {
  return MODEL_CATALOG.find((m) => ramGB >= m.minRAMGB) ?? null;
}
```

### 1.3 Provider Interface

**File:** `src/services/llm/types.ts`

```typescript
export type LLMProviderStatus =
  | "uninitialized"
  | "checking"
  | "downloading"
  | "initializing"
  | "ready"
  | "error"
  | "unsupported";

export interface LLMProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  initialize(onProgress?: (progress: number) => void): Promise<void>;
  generate(systemPrompt: string, userMessage: string): Promise<string>;
  getStatus(): LLMProviderStatus;
  cleanup(): Promise<void>;
}
```

### 1.4 Provider Manager

**File:** `src/services/llm/providerManager.ts`

Singleton that resolves the best provider in order:

1. Apple Foundation Models (iOS 26+ on eligible hardware)
2. Llama.rn with device-appropriate model tier
3. Unsupported (terminal fallback — UI must check status)

```typescript
class ProviderManager {
  private provider: LLMProvider | null = null;
  private classification: DeviceClassification | null = null;

  async initialize(onProgress?: (progress: number) => void): Promise<void> {
    this.classification = await classifyDevice();

    if (this.classification.capability === "apple_foundation") {
      const appleProvider = new AppleFoundationProvider();
      if (await appleProvider.isAvailable()) {
        await appleProvider.initialize();
        this.provider = appleProvider;
        return;
      }
      // Fall through to llama.rn if Apple Foundation not actually available
    }

    if (this.classification.capability !== "unsupported") {
      const model = selectModelForDevice(this.classification.ramGB);
      if (model) {
        const llamaProvider = new LlamaProvider(model);
        await llamaProvider.initialize(onProgress);
        this.provider = llamaProvider;
        return;
      }
    }

    this.provider = new UnsupportedProvider();
  }

  async generate(systemPrompt: string, userMessage: string): Promise<string> {
    if (!this.provider || this.provider.getStatus() !== "ready") {
      throw new Error("LLM provider not initialized");
    }
    return this.provider.generate(systemPrompt, userMessage);
  }

  getStatus(): LLMProviderStatus {
    return this.provider?.getStatus() ?? "uninitialized";
  }

  getClassification(): DeviceClassification | null {
    return this.classification;
  }

  async cleanup(): Promise<void> {
    await this.provider?.cleanup();
    this.provider = null;
  }
}

export const providerManager = new ProviderManager();
```

### 1.5 Llama Provider (with resumable download + integrity check)

**File:** `src/services/llm/providers/llamaProvider.ts`

Key improvements over current NutritionRx implementation:

- **Model selected by device RAM**, not hardcoded
- **SHA256 checksum verification** after download
- **Resumable downloads** with progress callback
- **KV cache cleared** before each completion
- **Chat template support** for both ChatML and Llama3

### 1.6 Apple Foundation Provider

**File:** `src/services/llm/providers/appleFoundationProvider.ts`

- Conditionally import `react-native-apple-llm` (already installed but unused)
- Check `AppleLLMModule.isFoundationModelsEnabled()`
- Create session with system instructions, call `session.generateText()`
- Graceful fallback if native module missing

### 1.7 Unsupported Provider

**File:** `src/services/llm/providers/unsupportedProvider.ts`

Terminal fallback. `generate()` throws. UI must check `getStatus()` first and show appropriate messaging.

---

## Part 2: Context Generation Pipeline

This is the most critical part. The LLM is only as good as the data you pass it. NutritionRx needs to mirror GymRx's 4-stage pipeline adapted for nutrition data.

### Stage 1: Query Raw Nutrition Data

**File:** `src/services/context/nutritionContextQueries.ts`

Query SQLite for the user's nutrition data. This feeds everything downstream.

```typescript
export interface RawNutritionData {
  // Last 7 days of daily logs
  dailyLogs: DailyNutritionLog[];
  // Last 4 weeks of weekly summaries
  weeklyAverages: WeeklyNutritionSummary[];
  // User's macro targets
  macroTargets: MacroTargets;
  // Frequently logged foods (top 20)
  frequentFoods: FrequentFood[];
  // Meal timing patterns
  mealPatterns: MealTimingPattern[];
  // Body weight trend (if tracked)
  weightTrend: WeightEntry[];
}

export interface DailyNutritionLog {
  date: string; // YYYY-MM-DD
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  mealsLogged: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

export interface WeeklyNutritionSummary {
  weekStart: string;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  avgFiber: number;
  daysLogged: number;
  calorieAdherence: number; // percentage within ±10% of target
  proteinAdherence: number;
}

export interface MealTimingPattern {
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  avgTime: string; // HH:MM
  avgCalories: number;
  frequency: number; // days per week this meal is logged
}

export async function getRawNutritionData(
  db: SQLiteDatabase,
): Promise<RawNutritionData> {
  // Query last 7 days of food logs joined with daily totals
  // Query 4-week rolling averages
  // Query user's current macro targets from profile
  // Query top 20 most frequently logged foods
  // Query meal timing distribution
  // Query weight entries if available
  // All queries run in parallel with Promise.all
}
```

### Stage 2: Build Unified Nutrition Context

**File:** `src/services/context/nutritionContextBuilder.ts`

Aggregate data from multiple sources into a single typed object. **JavaScript computes ALL statistics — the LLM never performs calculations.**

```typescript
export interface UnifiedNutritionContext {
  // Computed metrics (JS does the math, NOT the LLM)
  metrics: {
    todayProgress: {
      calories: {
        consumed: number;
        target: number;
        remaining: number;
        percentComplete: number;
      };
      protein: {
        consumed: number;
        target: number;
        remaining: number;
        percentComplete: number;
      };
      carbs: {
        consumed: number;
        target: number;
        remaining: number;
        percentComplete: number;
      };
      fat: {
        consumed: number;
        target: number;
        remaining: number;
        percentComplete: number;
      };
      fiber: { consumed: number; target: number; remaining: number };
      mealsLoggedToday: number;
    };
    weeklyTrends: {
      avgCalories: number;
      avgProtein: number;
      avgCarbs: number;
      avgFat: number;
      calorieAdherence: number; // % of days within ±10% of target
      proteinAdherence: number;
      daysLoggedThisWeek: number;
      daysLoggedLastWeek: number;
      calorieDirection: "increasing" | "decreasing" | "stable";
      proteinDirection: "increasing" | "decreasing" | "stable";
    };
    consistency: {
      currentStreak: number;
      longestStreak: number;
      loggingRate7d: number; // percentage
      loggingRate30d: number;
    };
    mealDistribution: {
      breakfastFrequency: number;
      lunchFrequency: number;
      dinnerFrequency: number;
      snackFrequency: number;
      avgMealsPerDay: number;
      largestMealType: string;
      calorieDistribution: {
        breakfast: number;
        lunch: number;
        dinner: number;
        snack: number;
      };
    };
    weightTrend: {
      currentWeight: number | null;
      weightChange7d: number | null;
      weightChange30d: number | null;
      direction: "gaining" | "losing" | "maintaining" | "insufficient_data";
    } | null;
  };

  // User profile
  profile: {
    goal: string; // 'cut', 'bulk', 'maintain', 'recomp'
    activityLevel: string;
    dietaryPreferences: string[];
    allergies: string[];
    weightUnit: "lbs" | "kg";
    calorieUnit: "kcal" | "kJ";
  };

  // Confidence tier
  dataAvailability: DataAvailabilityTier;

  // Derived insights (computed locally, not by LLM)
  derivedInsights: DerivedInsight[];

  // Frequent foods for personalization
  frequentFoods: { name: string; timesLogged: number; avgCalories: number }[];
}

export async function buildUnifiedNutritionContext(
  db: SQLiteDatabase,
): Promise<UnifiedNutritionContext> {
  const [rawData, profile, weightEntries] = await Promise.all([
    getRawNutritionData(db),
    getProfile(db),
    getWeightEntries(db),
  ]);

  // Compute all metrics in JS
  const metrics = computeMetrics(rawData, weightEntries);
  const dataAvailability = computeDataAvailability(rawData);
  const derivedInsights = computeDerivedInsights(rawData, metrics, profile);

  return {
    metrics,
    profile: formatProfile(profile),
    dataAvailability,
    derivedInsights,
    frequentFoods: rawData.frequentFoods.slice(0, 10),
  };
}
```

### Stage 3: Format to Natural Language

**File:** `src/services/context/nutritionContextFormatter.ts`

Convert the structured data into readable sections the LLM can reference. This is where you translate numbers into narrative context.

```typescript
export function formatNutritionContext(ctx: UnifiedNutritionContext): string {
  const sections: string[] = [];

  // === USER PROFILE ===
  sections.push(formatProfileSection(ctx.profile));

  // === TODAY'S PROGRESS ===
  sections.push(formatTodaySection(ctx.metrics.todayProgress, ctx.profile));

  // === WEEKLY TRENDS ===
  sections.push(formatWeeklySection(ctx.metrics.weeklyTrends));

  // === CONSISTENCY ===
  sections.push(formatConsistencySection(ctx.metrics.consistency));

  // === MEAL DISTRIBUTION ===
  sections.push(formatMealDistributionSection(ctx.metrics.mealDistribution));

  // === WEIGHT TREND (if available) ===
  if (ctx.metrics.weightTrend) {
    sections.push(
      formatWeightTrendSection(ctx.metrics.weightTrend, ctx.profile),
    );
  }

  // === DERIVED INSIGHTS ===
  if (ctx.derivedInsights.length > 0) {
    sections.push(formatDerivedInsightsSection(ctx.derivedInsights));
  }

  return sections.join("\n\n");
}

function formatProfileSection(
  profile: UnifiedNutritionContext["profile"],
): string {
  return `USER PROFILE:
Nutrition goal: ${goalToReadable(profile.goal)}
Activity level: ${profile.activityLevel}
${profile.dietaryPreferences.length > 0 ? `Dietary preferences: ${profile.dietaryPreferences.join(", ")}` : ""}
${profile.allergies.length > 0 ? `Allergies/restrictions: ${profile.allergies.join(", ")}` : ""}
Units: ${profile.weightUnit}, ${profile.calorieUnit}`;
}

function formatTodaySection(
  today: UnifiedNutritionContext["metrics"]["todayProgress"],
  profile: UnifiedNutritionContext["profile"],
): string {
  return `TODAY'S PROGRESS:
Calories: ${today.calories.consumed} / ${today.calories.target} ${profile.calorieUnit} (${today.calories.percentComplete}% complete, ${today.calories.remaining} remaining)
Protein: ${today.protein.consumed}g / ${today.protein.target}g (${today.protein.percentComplete}% complete)
Carbs: ${today.carbs.consumed}g / ${today.carbs.target}g (${today.carbs.percentComplete}% complete)
Fat: ${today.fat.consumed}g / ${today.fat.target}g (${today.fat.percentComplete}% complete)
Fiber: ${today.fiber.consumed}g / ${today.fiber.remaining}g remaining
Meals logged today: ${today.mealsLoggedToday}`;
}

function formatWeeklySection(
  weekly: UnifiedNutritionContext["metrics"]["weeklyTrends"],
): string {
  return `WEEKLY TRENDS (last 7 days):
Average daily calories: ${weekly.avgCalories} kcal (trend: ${weekly.calorieDirection})
Average daily protein: ${weekly.avgProtein}g (trend: ${weekly.proteinDirection})
Average daily carbs: ${weekly.avgCarbs}g
Average daily fat: ${weekly.avgFat}g
Calorie adherence: ${weekly.calorieAdherence}% of days within target range
Protein adherence: ${weekly.proteinAdherence}% of days hitting protein target
Days logged this week: ${weekly.daysLoggedThisWeek} (last week: ${weekly.daysLoggedLastWeek})`;
}

function formatConsistencySection(
  consistency: UnifiedNutritionContext["metrics"]["consistency"],
): string {
  return `CONSISTENCY:
Current logging streak: ${consistency.currentStreak} days
Longest streak: ${consistency.longestStreak} days
Logging rate (7 days): ${consistency.loggingRate7d}%
Logging rate (30 days): ${consistency.loggingRate30d}%`;
}

function formatMealDistributionSection(
  meals: UnifiedNutritionContext["metrics"]["mealDistribution"],
): string {
  return `MEAL DISTRIBUTION:
Average meals per day: ${meals.avgMealsPerDay}
Breakfast: logged ${meals.breakfastFrequency} days/week (~${meals.calorieDistribution.breakfast}% of daily calories)
Lunch: logged ${meals.lunchFrequency} days/week (~${meals.calorieDistribution.lunch}% of daily calories)
Dinner: logged ${meals.dinnerFrequency} days/week (~${meals.calorieDistribution.dinner}% of daily calories)
Snacks: logged ${meals.snackFrequency} days/week (~${meals.calorieDistribution.snack}% of daily calories)
Largest meal: ${meals.largestMealType}`;
}

function formatWeightTrendSection(
  weight: NonNullable<UnifiedNutritionContext["metrics"]["weightTrend"]>,
  profile: UnifiedNutritionContext["profile"],
): string {
  const unit = profile.weightUnit;
  let trend = `WEIGHT TREND:\n`;
  if (weight.currentWeight)
    trend += `Current weight: ${weight.currentWeight} ${unit}\n`;
  if (weight.weightChange7d !== null)
    trend += `Change (7 days): ${weight.weightChange7d > 0 ? "+" : ""}${weight.weightChange7d} ${unit}\n`;
  if (weight.weightChange30d !== null)
    trend += `Change (30 days): ${weight.weightChange30d > 0 ? "+" : ""}${weight.weightChange30d} ${unit}\n`;
  trend += `Direction: ${weight.direction}`;
  return trend;
}

function formatDerivedInsightsSection(insights: DerivedInsight[]): string {
  const formatted = insights
    .map((i) => `- [${i.category}] ${i.message} (confidence: ${i.confidence})`)
    .join("\n");
  return `LOCALLY COMPUTED OBSERVATIONS (expand on these, do not recompute):\n${formatted}`;
}
```

### Stage 4: Inject into System Prompt

**File:** `src/services/context/nutritionSystemPrompt.ts`

Template with placeholders, filled at runtime. See Part 4 for the full prompt.

---

## Part 3: Confidence Gating (Data Availability)

**File:** `src/services/context/dataAvailability.ts`

This prevents the LLM from hallucinating recommendations when there isn't enough data. The tier is computed locally and injected into the system prompt so the LLM knows its own limitations.

```typescript
export type DataAvailabilityTier = "none" | "minimal" | "moderate" | "high";

export interface DataAvailabilityResult {
  tier: DataAvailabilityTier;
  daysLogged: number;
  weeksWithData: number;
  hasWeightData: boolean;
  hasMealTimingData: boolean;
  promptGuidance: string; // Injected into system prompt
}

export function computeDataAvailability(
  rawData: RawNutritionData,
): DataAvailabilityResult {
  const daysLogged = rawData.dailyLogs.length;
  const weeksWithData = rawData.weeklyAverages.filter(
    (w) => w.daysLogged >= 3,
  ).length;
  const hasWeightData = rawData.weightTrend.length >= 3;
  const hasMealTimingData = rawData.mealPatterns.length > 0;

  let tier: DataAvailabilityTier;
  let promptGuidance: string;

  if (daysLogged === 0) {
    tier = "none";
    promptGuidance = `DATA AVAILABILITY: NONE
The user has not logged any nutrition data yet.
YOUR TASK: Help them get started. Ask about their goals, suggest logging their next meal, explain how tracking works.
DO NOT: Make any nutrition recommendations, reference any data, or suggest macro adjustments.`;
  } else if (daysLogged < 3) {
    tier = "minimal";
    promptGuidance = `DATA AVAILABILITY: MINIMAL (${daysLogged} days logged)
You have very limited data. Patterns are NOT reliable yet.
YOUR TASK: Encourage continued logging. You may comment on what you see but qualify everything as preliminary.
DO NOT: Identify trends, suggest calorie/macro changes, or make specific food recommendations based on patterns.
SAY: "As you log more days, I'll be able to spot patterns and give better guidance."`;
  } else if (daysLogged < 7 || weeksWithData < 2) {
    tier = "moderate";
    promptGuidance = `DATA AVAILABILITY: MODERATE (${daysLogged} days logged, ${weeksWithData} full weeks)
You have enough data for general observations but not enough for confident trend analysis.
YOUR TASK: Offer general guidance based on what you see. Note where more data would help.
DO NOT: Make definitive statements about weight trends, identify multi-week patterns, or suggest specific caloric adjustments.
YOU MAY: Comment on daily consistency, protein intake patterns, meal timing, and adherence.`;
  } else {
    tier = "high";
    promptGuidance = `DATA AVAILABILITY: HIGH (${daysLogged} days logged, ${weeksWithData} full weeks${hasWeightData ? ", weight data available" : ""})
You have sufficient data for data-driven recommendations.
YOUR TASK: Provide specific, actionable nutrition guidance based on the data provided.
YOU MAY: Identify trends, suggest macro adjustments, comment on patterns, and give specific food recommendations.`;
  }

  return {
    tier,
    daysLogged,
    weeksWithData,
    hasWeightData,
    hasMealTimingData,
    promptGuidance,
  };
}
```

---

## Part 4: Derived Insights (Local Rules, No LLM)

**File:** `src/services/context/derivedNutritionInsights.ts`

Deterministic rules that run locally. These are injected into the prompt so the LLM can **expand on them** rather than having to discover patterns itself. This makes responses dramatically more grounded.

```typescript
export interface DerivedInsight {
  id: string;
  category:
    | "protein"
    | "calories"
    | "consistency"
    | "balance"
    | "timing"
    | "weight"
    | "fiber";
  message: string;
  confidence: number; // 0-1
  priority: number; // 1=highest
}

export function computeDerivedInsights(
  rawData: RawNutritionData,
  metrics: UnifiedNutritionContext["metrics"],
  profile: UnifiedNutritionContext["profile"],
): DerivedInsight[] {
  const insights: DerivedInsight[] = [];

  // 1. Protein Adherence Check
  insights.push(...detectProteinPatterns(metrics, profile));

  // 2. Calorie Consistency Check
  insights.push(...detectCalorieConsistency(rawData, metrics));

  // 3. Meal Distribution Balance
  insights.push(...detectMealImbalance(metrics));

  // 4. Weekend vs Weekday Patterns
  insights.push(...detectWeekendWeekdayDrift(rawData));

  // 5. Fiber Intake Check
  insights.push(...detectFiberIntake(metrics));

  // 6. Weight vs Calorie Alignment
  insights.push(...detectWeightCalorieAlignment(metrics, profile));

  // 7. Logging Consistency Patterns
  insights.push(...detectLoggingDropoff(metrics));

  // Filter by confidence ≥ 0.5, sort by priority, cap at 5
  return insights
    .filter((i) => i.confidence >= 0.5)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5);
}
```

### The 7 Deterministic Rules

#### Rule 1: Protein Patterns

```
IF protein adherence < 60% over 7 days
  → "Protein intake is below target on most days. Average: {avg}g vs target: {target}g."
IF protein consistently low at breakfast
  → "Breakfast meals average only {avg}g protein — this meal could be a leverage point."
IF protein front-loaded (>50% before lunch)
  → "Protein is well-distributed earlier in the day — good pattern for satiety."
```

#### Rule 2: Calorie Consistency

```
IF standard deviation of daily calories > 25% of target
  → "Daily calorie intake varies significantly (range: {min}-{max}). Consistency may help progress."
IF 3+ consecutive days over/under by >15%
  → "Calorie intake has been consistently {over/under} target for {n} days."
IF weekend avg differs from weekday avg by >20%
  → handled by Rule 4
```

#### Rule 3: Meal Distribution Balance

```
IF one meal provides >50% of daily calories
  → "{meal} accounts for ~{pct}% of daily calories. Spreading intake may improve energy."
IF snacks provide >30% of daily calories
  → "Snacking accounts for ~{pct}% of daily intake, which is higher than typical."
IF a regular meal is skipped >50% of the time
  → "{meal} is only logged {freq} days/week. Regular meals support consistent nutrition."
```

#### Rule 4: Weekend vs Weekday Drift

```
Compute separate averages for Mon-Fri and Sat-Sun.
IF weekend calories > weekday calories by >20%
  → "Weekend calories average {wkend} vs weekday {wkday} — a {diff} calorie difference."
IF weekend protein < weekday protein by >15%
  → "Protein intake tends to drop on weekends ({wkend}g vs {wkday}g weekday)."
```

#### Rule 5: Fiber Intake

```
IF average daily fiber < 20g
  → "Average fiber intake is {avg}g/day. The general recommendation is 25-30g."
IF fiber trending downward over 2+ weeks
  → "Fiber intake has been declining. Consider incorporating more vegetables, legumes, or whole grains."
```

#### Rule 6: Weight vs Calorie Alignment

```
IF goal=cut AND weight_direction=gaining AND calorie_adherence>80%
  → "Weight is trending up despite hitting calorie targets. The targets may need re-evaluation."
IF goal=bulk AND weight_direction=losing
  → "Weight is trending down despite a surplus goal. Consider whether the calorie target is sufficient."
IF goal=maintain AND weight_change_30d > ±2lbs
  → "Weight has shifted {direction} by {amount} over 30 days. Minor adjustments may help maintain."
```

#### Rule 7: Logging Dropoff

```
IF loggingRate7d < loggingRate30d by >20 percentage points
  → "Logging has dropped off this week ({rate7d}% vs your 30-day average of {rate30d}%)."
IF streak broken after 7+ days
  → "Your {streak}-day logging streak recently ended. Getting back on track is more valuable than perfection."
IF logging rate consistently >90%
  → "Excellent logging consistency at {rate}%. This level of tracking supports accurate insights."
```

---

## Part 5: System Prompt Design

**File:** `src/services/context/nutritionSystemPrompt.ts`

This is where everything comes together. The system prompt must be extremely specific about what the LLM should and should not do.

```typescript
export function buildSystemPrompt(ctx: UnifiedNutritionContext): string {
  const formattedContext = formatNutritionContext(ctx);
  return SYSTEM_PROMPT_TEMPLATE.replace(
    "{DATA_AVAILABILITY}",
    ctx.dataAvailability.promptGuidance,
  )
    .replace("{NUTRITION_CONTEXT}", formattedContext)
    .replace("{USER_PROFILE}", formatProfileSection(ctx.profile))
    .replace(
      "{DERIVED_INSIGHTS}",
      formatDerivedInsightsSection(ctx.derivedInsights),
    )
    .replace("{FREQUENT_FOODS}", formatFrequentFoods(ctx.frequentFoods));
}
```

### The System Prompt Template

```
const SYSTEM_PROMPT_TEMPLATE = `You are a nutrition insight assistant in NutritionRx, a macro-tracking app for people who take their nutrition seriously.

=== IDENTITY & TONE ===
- You are warm, supportive, and non-judgmental
- You speak like a knowledgeable friend, not a clinical dietitian
- NEVER use words like: "failed", "cheated", "bad", "guilty", "ruined", "blew it"
- INSTEAD use: "opportunity", "adjustment", "learning", "progress", "building toward"
- Celebrate effort and consistency, not perfection
- Be direct and specific — vague encouragement is unhelpful

=== DATA AVAILABILITY ===
{DATA_AVAILABILITY}

=== YOUR DATA ===
All numbers below were computed by the app. They are FACTS. Do not recalculate, estimate, or contradict them.

{NUTRITION_CONTEXT}

=== DERIVED OBSERVATIONS ===
The following patterns were detected by the app's analysis engine. They are accurate. Your job is to:
1. Acknowledge the most relevant ones
2. Explain WHY they matter in plain language
3. Suggest ONE concrete, actionable step the user could take
Do NOT recompute or contradict these observations.

{DERIVED_INSIGHTS}

=== USER'S FREQUENT FOODS ===
These are foods the user regularly logs. Reference them when making suggestions to keep advice practical and personalized.

{FREQUENT_FOODS}

=== RESPONSE FORMAT ===
- 2-3 short paragraphs maximum
- Lead with the most relevant insight for RIGHT NOW (time of day matters)
- Include ONE specific, actionable suggestion
- If the user is doing well, say so — then offer one thing to optimize
- End with an encouraging forward-looking statement
- Use the user's preferred units ({WEIGHT_UNIT}, {CALORIE_UNIT})
- Format macro numbers clearly: "142g protein" not "protein 142g"

=== HARD BOUNDARIES — NEVER DO THESE ===
1. NEVER diagnose medical conditions or eating disorders
2. NEVER prescribe specific calorie targets — only comment on adherence to the user's existing targets
3. NEVER recommend supplements, medications, or specific brands
4. NEVER invent data that wasn't provided to you
5. NEVER suggest extreme restrictions (<1200 kcal for anyone)
6. NEVER make moral judgments about food choices ("clean eating", "junk food")
7. NEVER provide specific advice about food allergies or intolerances beyond acknowledging them
8. NEVER claim to be a registered dietitian, nutritionist, or medical professional
9. If the user asks about something outside your data, say "I can only see your logged nutrition data — for {topic}, I'd recommend consulting a registered dietitian."
10. NEVER perform math or calculations — all numbers are pre-computed and provided to you as facts

=== TIME AWARENESS ===
Current time context helps you tailor advice:
- Morning: Focus on the day ahead, breakfast patterns
- Midday: Check protein pacing, remaining macros
- Evening: Reflect on the day, suggest dinner ideas if macros allow
- Late night: Keep it brief, positive, forward-looking to tomorrow
`;
```

---

## Part 6: Integration Points

### Daily Insights Flow

```
User opens Daily Insights screen
  → buildUnifiedNutritionContext() queries SQLite in parallel
  → computeDataAvailability() determines confidence tier
  → computeDerivedInsights() runs 7 local rules
  → formatNutritionContext() converts to natural language
  → buildSystemPrompt() injects all placeholders
  → providerManager.generate(systemPrompt, "Generate a daily nutrition insight")
  → Response cached for 4 hours
  → If LLM unavailable → fall back to template-based insights using derived insights directly
```

### Weekly Insights Flow

```
Same pipeline but:
  → Query window is 7 days instead of today
  → User message: "Generate a weekly nutrition recap"
  → Cache duration: until next week
  → Emphasis on trends, consistency, and week-over-week comparison
```

### Chat Feature (Cloud API — Unchanged)

The AI chat feature continues to use OpenAI cloud API (gpt-4o-mini) for interactive conversation. The local LLM is for passive insights only. However, the **same context pipeline** should feed the chat's system prompt for consistency.

---

## Part 7: Migration Plan

### Phase 1: Provider Architecture

1. Create `src/services/llm/` directory structure
2. Implement `deviceClassifier.ts`, `modelCatalog.ts`, `types.ts`
3. Implement `providerManager.ts` + three providers
4. Wire up to existing `LLMService.ts` as adapter (LLMService delegates to providerManager)
5. Add download integrity verification (SHA256)

### Phase 2: Context Pipeline

1. Create `src/services/context/` directory structure
2. Implement `nutritionContextQueries.ts` — query raw data from existing SQLite schema
3. Implement `nutritionContextBuilder.ts` — compute all metrics in JS
4. Implement `nutritionContextFormatter.ts` — format to natural language
5. Implement `dataAvailability.ts` — confidence gating
6. Implement `derivedNutritionInsights.ts` — 7 local rules

### Phase 3: System Prompt

1. Create `nutritionSystemPrompt.ts` with template + placeholders
2. Wire context pipeline output into the system prompt builder
3. Update daily insight generation to use new pipeline
4. Update weekly insight generation to use new pipeline
5. Optionally feed the same context into the cloud chat feature's system prompt

### Phase 4: Cleanup

1. Remove dead test files under `src/__tests__/services/llm/` (they test nonexistent code)
2. Wire up `react-native-apple-llm` (already installed) through the new provider
3. Remove old hardcoded model config from existing `LLMService.ts`
4. Update `doc/ON_DEVICE_LLM_IMPLEMENTATION.md` to reflect actual implementation

---

## Part 8: Testing Requirements

### Unit Tests

- `deviceClassifier.test.ts` — Mock different RAM/model/OS combinations
- `modelCatalog.test.ts` — Verify correct model selection per RAM tier
- `dataAvailability.test.ts` — Verify tier boundaries (0, 1, 2, 3, 6, 7, 14 days)
- `derivedNutritionInsights.test.ts` — Each of the 7 rules with edge cases
- `nutritionContextFormatter.test.ts` — Verify formatted output includes all sections
- `nutritionContextBuilder.test.ts` — Verify metrics computation accuracy

### Integration Tests

- Full pipeline: SQLite data → context → formatted prompt → verify prompt contains expected sections
- Provider manager: Verify fallback chain (Apple → Llama → Unsupported)
- Cache invalidation: Verify insights refresh after new food log

### E2E Tests (Maestro)

- Fresh install: Verify "none" data availability state → appropriate onboarding message
- After 1 day of logging: Verify "minimal" tier messaging
- After 7+ days: Verify "high" tier with specific recommendations
- Model download: Verify progress indicator and resumability
- LLM failure: Verify graceful fallback to template insights

---

## Key Principles (from GymRx, adapted for NutritionRx)

1. **The LLM never does math.** JavaScript computes every number. The LLM only interprets and narrates.
2. **Context is everything.** The quality of the output is directly proportional to the quality of the data you inject.
3. **Confidence gating prevents hallucination.** Tell the LLM what it doesn't know.
4. **Local insights first.** Deterministic rules are always right. Let the LLM expand on certainty, not guess.
5. **Strict boundaries in the prompt.** Explicit "never do X" rules are the only reliable way to prevent the LLM from going off-rails.
6. **Nourished Calm tone.** Every word choice matters. "Opportunity" not "failure." "Building toward" not "falling short."
7. **Provider abstraction.** Common interface, OS-specific implementations, singleton manager. Device capability determines the path.
