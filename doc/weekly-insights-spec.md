# NutritionRx Weekly Insights — UX Research & Implementation Specification

> **Version:** 1.0  
> **Date:** February 4, 2026  
> **Scope:** Redesign of the Weekly Recap widget into a question-driven Weekly Insights system  
> **Target:** Claude Code IDE implementation handoff

---

## Part 1: Competitive Research

### 1.1 Landscape Analysis

Eight major nutrition apps were analyzed for their weekly summary and AI-powered analysis features. The market breaks into three tiers of sophistication:

**Tier 1 — Algorithmic Coaching (weekly target adjustment)**

- **MacroFactor** is the clear leader. Its weekly "Check-In" is not a summary at all — it's an interactive coaching session. The MF Coach reviews your week's weight trend and nutrition logs, then walks you through modular "Coaching Modules" — checking for partially-logged days, offering weigh-in prompts, flagging fasting gaps, and ultimately recalculating your calorie and macro targets for the coming week. The entire system is adherence-neutral: it adjusts based on what you actually ate, not how well you hit targets. This is the gold standard for weekly intelligence in a nutrition app. Key insight: the weekly moment is _action-oriented_ (new targets for next week), not just retrospective.

**Tier 2 — Structured Weekly Reports (data visualization, no AI narrative)**

- **Cronometer** offers the most comprehensive _data_ weekly view. Its Nutrition Report shows average daily intake over any timeframe, with bar graphs per nutrient measured against min/max targets. Users can toggle between All Days, Non-Empty Days, and Complete Days. Gold subscribers get extended date ranges. The report includes Nutrition Scores — composite scores across categories like Vitamins, Minerals, Electrolytes, and demographic-specific scores (Men's Health, Women's Health). The big insight: Cronometer lets users _exclude incomplete days and today_ from their averages, preventing skewed data. This is critical data hygiene NutritionRx currently ignores.

- **MyFitnessPal** produces a "Weekly Digest" every Sunday. It includes: total calories consumed vs. weekly goal, frequently logged foods, total exercise calories, and — notably — "Food Group Insights" that categorize logged items into Vegetables, Fresh Fruits, Proteins, Sweets & Snacks, and Alcoholic Beverages. Premium users can revisit any past week. The food group categorization is a simple but effective pattern recognition that NutritionRx doesn't do at all.

- **YAZIO** gates weekly and monthly analysis behind its PRO subscription. It offers detailed breakdown of calories, macros, and nutrients across daily/weekly/monthly views. Its "Weekend Calories" feature lets users allocate more calories to specific days — acknowledging real eating patterns rather than treating every day equally. This flexible-target concept is worth noting for how NutritionRx could analyze day-type patterns.

- **Lose It!** offers "Patterns" — premium insights that identify food and calorie intake habits. These include: over/under calorie charts showing which days of the week you consistently exceed budget, meal-level calorie breakdowns (which meals contribute most calories), and food-level insights (highest/lowest calorie foods). The "which days throw you off" pattern is exactly the kind of question NutritionRx's weekly insights should answer.

**Tier 3 — AI Chat / Conversational Analysis**

- **Noom** uses its AI assistant "Welli" for per-meal insights after logging, plus daily behavioral psychology content. It does _not_ have a dedicated weekly AI summary. Noom's approach is psychology-first: daily lessons on habit formation, weekly challenges, and behavior change. The weekly cadence is about _education and habit building_, not data review.

- **FeedAI** represents the emerging MCP-connected model: users log meals in the app, then ask ChatGPT or Claude natural-language questions like "review my diet over the last two weeks and give me my macros." This is the most open-ended approach — no curated questions, just raw data exposed to an LLM via API. Key limitation: requires cloud LLM access, which NutritionRx's on-device approach cannot do.

- **NutriScan** features "NutriBites" — a conversational interface where users ask questions about their meal timeline: "What did I eat last week that had the most protein?" or "Show me meals that might have caused my bloating." It returns answers with relevant meal cards. This is the closest model to NutritionRx's proposed curated-question approach, but cloud-dependent.

- **Welling** provides an AI nutrition coach chat with weekly insights, calorie trends, and macro balance reviews. It analyzes eating patterns and gives personalized feedback. Another cloud LLM approach.

### 1.2 Emerging Trends

- **Apple Health+** (reportedly launching 2026 under "Project Mulberry") will add AI-driven health coaching, nutrition tracking, and personalized insights. This validates the direction of AI-powered health analysis but may also commoditize basic weekly summaries.

- **Foodnoms** (iOS-native) recently added "Insights" — a customizable dashboard with streaks, macro charts, weekly views, and calorie balance tracking (surplus/deficit trends over time). Its "shareable summaries" feature lets users create images of their weekly stats to share with friends — a social pattern worth noting.

### 1.3 Competitive Gap Analysis

| Capability                    | Cronometer | MacroFactor | MFP | YAZIO    | Lose It | Noom    | NutriScan | **NutritionRx (proposed)** |
| ----------------------------- | ---------- | ----------- | --- | -------- | ------- | ------- | --------- | -------------------------- |
| Weekly data averages          | ✅         | ✅          | ✅  | ✅ (PRO) | ✅      | ❌      | ❌        | ✅                         |
| Day-level drill-down          | ✅         | ✅          | ✅  | ✅       | ✅      | ❌      | ❌        | ✅                         |
| Exclude incomplete days       | ✅         | ✅          | ❌  | ❌       | ❌      | ❌      | ❌        | ✅                         |
| AI narrative summary          | ❌         | ❌          | ❌  | ❌       | ❌      | ❌      | ✅        | ✅                         |
| Question-driven AI            | ❌         | ❌          | ❌  | ❌       | ❌      | Partial | ✅        | ✅                         |
| Curated question library      | ❌         | ❌          | ❌  | ❌       | ❌      | ❌      | ❌        | **✅ (unique)**            |
| Weekly target adjustment      | ❌         | ✅          | ❌  | ❌       | ❌      | ❌      | ❌        | ❌                         |
| Micronutrient weekly analysis | ✅         | ✅          | ❌  | ✅ (PRO) | ❌      | ❌      | ✅        | ✅                         |
| Food group categorization     | ❌         | ❌          | ✅  | ❌       | ❌      | ✅      | ❌        | ✅                         |
| On-device LLM                 | ❌         | ❌          | ❌  | ❌       | ❌      | ❌      | ❌        | **✅ (unique)**            |
| Past week navigation          | ✅         | ✅          | ✅  | ✅       | ✅      | ❌      | ❌        | ✅                         |

**NutritionRx's unique differentiators:**

1. **Curated question library** — no competitor offers pre-computed, scored, contextually-relevant questions about weekly data
2. **On-device LLM narration** — all computation in JS, only narration on-device. No cloud dependency, full privacy
3. **Progressive disclosure** — widget headline → full screen → question selection → AI response. No competitor uses this pattern for weekly insights

### 1.4 Key Design Patterns Worth Adopting

1. **MacroFactor's Check-In Modules** — Break the weekly review into discrete, skippable modules rather than one monolithic summary. Each question in NutritionRx's library is essentially a module.

2. **Cronometer's Data Hygiene** — Exclude incomplete days from averages. Flag "data confidence" so the LLM can caveat its analysis appropriately.

3. **Lose It!'s Pattern Detection** — "Which days of the week are you consistently over budget?" This is a specific, answerable, high-value question that should be in the library.

4. **MFP's Food Group Insights** — Categorizing foods into groups (proteins, vegetables, sweets) provides a different lens than pure macro numbers.

5. **MacroFactor's Adherence-Neutral Tone** — No red numbers, no shaming, no "you went over." This aligns perfectly with NutritionRx's Nourished Calm philosophy.

6. **YAZIO's Day-Type Awareness** — Acknowledging that weekends differ from weekdays. The question library should include weekend vs. weekday analysis.

7. **Foodnoms' Calorie Balance Tracking** — Showing surplus/deficit trends over time, not just absolute intake. Useful for users with weight goals.

---

## Part 2: Curated Question Library

### 2.1 Design Principles

Each question must satisfy these criteria:

- **Answerable with data** — the answer can be fully computed from the week's nutrition logs, goals, and optionally multi-week history
- **Non-obvious** — the answer reveals something the user wouldn't see by glancing at daily logs
- **Actionable** — the insight implies something the user could do differently
- **Tone-safe** — the question framing and expected response fit "Nourished Calm" (no judgment, no failure language)
- **Interesting to the user** — scored by relevance to the user's actual data patterns

### 2.2 Question Categories & Definitions

```typescript
type WeeklyQuestionCategory =
  | "consistency" // Day-to-day variance and reliability
  | "macro_balance" // Protein/carb/fat distribution
  | "calorie_trend" // Energy intake patterns relative to goals
  | "hydration" // Water intake patterns
  | "timing" // Meal distribution and frequency
  | "nutrients" // Micronutrient patterns (from deficiency calculator)
  | "comparison" // Week-over-week or weekday-vs-weekend comparisons
  | "highlights"; // Best days, top foods, achievements
```

### 2.3 The Question Library

Each entry includes: ID, display text, category, data requirements, interestingness scoring logic, and the specific data fetcher it maps to.

---

#### Category: CONSISTENCY

**Q-CON-01: "How consistent were my macros this week?"**

- Category: `consistency`
- Data: 7 days of macro breakdowns (calories, protein, carbs, fat)
- Computation: Coefficient of variation (CV) for each macro across logged days. Classify as "very consistent" (CV < 10%), "fairly consistent" (10-20%), "variable" (20-35%), "quite variable" (>35%)
- Interestingness: Higher when CV varies significantly between macros (e.g., protein consistent but carbs erratic) — MIN score 0.3, MAX 1.0
- Score boost: +0.2 if user has logged 5+ days

**Q-CON-02: "Which days threw off my averages?"**

- Category: `consistency`
- Data: 7 days of calorie totals + calorie target
- Computation: Identify days >1.5 standard deviations from the week's mean. Flag the outlier days and their deviation direction (high/low). Calculate what the week's average would be without them.
- Interestingness: Proportional to the number of outlier days and magnitude of deviation — MIN 0.2, MAX 1.0
- Score boost: +0.3 if exactly 1-2 outlier days exist (clean narrative), -0.2 if 0 outliers (boring answer)

**Q-CON-03: "How many days did I hit my targets this week?"**

- Category: `consistency`
- Data: 7 days of calories + calorie target, protein + protein target
- Computation: Count days within ±15% of calorie target and ±10g of protein target. Present as X/Y logged days.
- Interestingness: Moderate baseline (0.5). Boost if streak of consecutive on-target days exists. Reduce if user logged < 4 days.
- Score boost: +0.2 if 5+ on-target days, +0.3 if perfect week

---

#### Category: MACRO_BALANCE

**Q-MAC-01: "Is my protein intake where it needs to be?"**

- Category: `macro_balance`
- Data: 7 days of protein + protein target, avg protein 7d
- Computation: Calculate average protein vs. target, protein as % of total calories, days meeting protein target. Compare to recommended range for fitness enthusiasts (1.6-2.2g/kg if weight available, else target-relative).
- Interestingness: Higher when protein is consistently under target (>15% below) or when it fluctuates widely. MIN 0.4 (protein is always relevant for fitness users)
- Score boost: +0.2 if protein trending differently from calories

**Q-MAC-02: "How balanced are my macros across the week?"**

- Category: `macro_balance`
- Data: 7 days of protein/carb/fat grams and calories
- Computation: Calculate average macro split (% calories from P/C/F). Compare to standard fitness splits. Identify if any macro is disproportionately variable vs. others.
- Interestingness: Higher when split is significantly skewed (one macro >50% of calories) or when the split changes dramatically day to day. MIN 0.3, MAX 0.9
- Score boost: +0.2 if a specific macro shifted notably vs. prior week

**Q-MAC-03: "Am I eating enough fiber?"**

- Category: `macro_balance`
- Data: 7 days of fiber intake (when available)
- Computation: Average fiber vs. 25-38g/day recommendation. Days meeting minimum. Trend direction.
- Interestingness: Only shown if fiber data is available (>0 for 3+ days). Higher when consistently low. MIN 0.2, MAX 0.8
- Score boost: +0.3 if fiber is below 50% of target on 5+ days
- Gate: Hidden if fiber data is zeros/unavailable (known gap in current data pipeline)

---

#### Category: CALORIE_TREND

**Q-CAL-01: "Am I in a caloric surplus or deficit this week?"**

- Category: `calorie_trend`
- Data: 7 days of calories + calorie target
- Computation: Total weekly intake vs. total weekly target. Calculate daily average surplus/deficit. Express as both total and percentage.
- Interestingness: Baseline 0.5. Higher if the surplus/deficit contradicts the user's stated goal (e.g., goal is cut but in surplus). MIN 0.4, MAX 1.0
- Score boost: +0.3 if weekly total deviates >10% from target total

**Q-CAL-02: "Is my calorie intake trending up or down?"**

- Category: `calorie_trend`
- Data: 14-21 days of calorie totals (current week + 1-2 prior weeks)
- Computation: Simple linear regression across 2-3 weeks of daily averages. Calculate slope, direction, and magnitude. Express as "increasing by ~X calories/week" or "holding steady."
- Interestingness: Higher when trend is clear and significant (R² > 0.3 and slope > 50 cal/week). MIN 0.2, MAX 0.9
- Score boost: +0.3 if trend contradicts goal direction
- Gate: Requires at least 10 days of data across 2+ weeks

**Q-CAL-03: "What does my calorie pattern look like day by day?"**

- Category: `calorie_trend`
- Data: 7 days of calories + calorie target
- Computation: Classify each day as: on-target (85-115%), slightly over (115-130%), significantly over (>130%), slightly under (70-85%), significantly under (<70%), no data. Create a narrative day-by-day walk-through.
- Interestingness: Baseline 0.6 — this is always somewhat interesting because it references the mini calendar dots. MIN 0.5, MAX 0.8
- Score boost: +0.2 if there's a clear pattern (e.g., starts strong then trails off)

---

#### Category: HYDRATION

**Q-HYD-01: "How was my water intake this week?"**

- Category: `hydration`
- Data: 7 days of water intake from waterStore + water target
- Computation: Average daily intake vs. target. Days meeting target. Best and worst days. Consistency (CV).
- Interestingness: Baseline 0.3. Higher if consistently below target or if there's a notable pattern (e.g., great on weekdays, drops on weekends). MIN 0.2, MAX 0.7
- Score boost: +0.2 if water correlates with a calorie pattern
- Gate: Only shown if water tracking is active (>0 for 3+ days)

---

#### Category: TIMING

**Q-TIM-01: "How many meals am I eating per day?"**

- Category: `timing`
- Data: 7 days of meal counts
- Computation: Average meals per day, variance, days with notably more or fewer meals. Identify if meal count correlates with calorie overshoot/undershoot.
- Interestingness: Higher when meal count varies significantly (CV > 25%) or when there's a clear correlation with calorie performance. MIN 0.2, MAX 0.7
- Score boost: +0.3 if days with more meals tend to exceed calorie targets

**Q-TIM-02: "Are weekdays and weekends different for me?"**

- Category: `timing`
- Data: 7 days of calories, protein, meal counts, tagged by day-of-week
- Computation: Split data into weekdays (Mon-Fri) and weekends (Sat-Sun). Compare average calories, protein, meal counts. Calculate the "weekend effect" (% change in calories from weekday average).
- Interestingness: Higher when weekend differs by >15% from weekday. MIN 0.2, MAX 0.9
- Score boost: +0.3 if weekend surplus undermines weekday deficit
- Gate: Requires data on at least 1 weekend day and 3 weekday days

---

#### Category: NUTRIENTS

**Q-NUT-01: "Are there nutrients I've been consistently low on?"**

- Category: `nutrients`
- Data: Deficiency calculator results for the week, nutrient thresholds
- Computation: Pull active deficiency alerts. Group by severity (Notice/Warning/Concern). Identify which nutrients have been low for multiple weeks.
- Interestingness: Proportional to number and severity of alerts. MIN 0.1 (no alerts = not interesting), MAX 1.0 (concern-level alerts)
- Score boost: +0.3 if a nutrient has worsened vs. prior assessment
- Gate: Only shown if deficiency calculator has results (requires 5+ days of data in last 7, 7+ days using app)

---

#### Category: COMPARISON

**Q-CMP-01: "How does this week compare to last week?"**

- Category: `comparison`
- Data: Current week + prior week's daily summaries
- Computation: Compare averages (calories, protein, water, meal count, logged days). Identify biggest improvements and regressions. Calculate % change for each metric.
- Interestingness: Baseline 0.6 — comparison is always interesting. Higher when changes are significant (>10% in any metric). MIN 0.5, MAX 1.0
- Score boost: +0.2 if logging consistency improved
- Gate: Requires at least 4 days of data in both current and prior week

**Q-CMP-02: "Is my protein intake trending up or down over recent weeks?"**

- Category: `comparison`
- Data: 3-4 weeks of average daily protein
- Computation: Calculate weekly average protein for each of the last 3-4 weeks. Determine trend direction and magnitude.
- Interestingness: Higher when trend is clear and sustained. MIN 0.2, MAX 0.8
- Score boost: +0.3 if protein trend diverges from calorie trend (eating more but protein dropping)
- Gate: Requires 3+ weeks of data with 4+ logged days each

---

#### Category: HIGHLIGHTS

**Q-HI-01: "What went well this week?"**

- Category: `highlights`
- Data: All weekly metrics, targets, streaks, comparisons
- Computation: Scan all metrics for positive signals: days on target, streak maintained/extended, protein target met on X days, improved vs. last week on Y metric, best single day for Z. Select top 2-3 highlights.
- Interestingness: Always 1.0 — this is the default "start positive" question. It should always be the first or second question shown.
- Note: This replaces the old recap's "start with something positive" rule. The entire question is about positives.

**Q-HI-02: "What's one thing I could focus on next week?"**

- Category: `highlights`
- Data: All weekly metrics, targets, deficiency alerts, comparison data
- Computation: Identify the single most impactful improvement opportunity. Priority: (1) consistent macro shortfall, (2) hydration gap, (3) logging consistency, (4) weekend pattern. Frame as a gentle suggestion, not a criticism.
- Interestingness: Always 0.9. Slightly below Q-HI-01 to ensure it's shown second.
- Note: Replaces the old recap's "end with gentle suggestion" rule.

---

### 2.4 Question Scoring & Selection Algorithm

Each question computes an interestingness score (0-1) based on the user's actual data. The UI shows the **top 4-6 questions** sorted by score, with Q-HI-01 ("What went well") always pinned first.

```typescript
interface ScoredQuestion {
  questionId: string;
  displayText: string;
  category: WeeklyQuestionCategory;
  score: number; // 0-1 interestingness
  isAvailable: boolean; // meets data gate requirements
  isPinned: boolean; // always shown regardless of score
  computedData: unknown; // pre-computed analysis results
}

function selectQuestions(
  allQuestions: ScoredQuestion[],
  maxQuestions: number = 6,
): ScoredQuestion[] {
  const pinned = allQuestions.filter((q) => q.isPinned && q.isAvailable);
  const available = allQuestions
    .filter((q) => !q.isPinned && q.isAvailable && q.score >= 0.3)
    .sort((a, b) => b.score - a.score);

  // Ensure category diversity: no more than 2 from same category
  const selected: ScoredQuestion[] = [...pinned];
  const categoryCounts: Record<string, number> = {};
  pinned.forEach((q) => {
    categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
  });

  for (const q of available) {
    if (selected.length >= maxQuestions) break;
    const catCount = categoryCounts[q.category] || 0;
    if (catCount >= 2) continue;
    selected.push(q);
    categoryCounts[q.category] = catCount + 1;
  }

  return selected;
}
```

### 2.5 Widget Headline Generation

The widget on the dashboard does **not** use the LLM. It displays a template-generated headline based on the top-scoring question's pre-computed data. Templates:

```typescript
const headlineTemplates: Record<string, (data: any) => string> = {
  "Q-HI-01": (d) => `${d.highlightCount} wins this week 🌿`,
  "Q-CON-02": (d) =>
    `${d.outlierCount} day${d.outlierCount !== 1 ? "s" : ""} shifted your average`,
  "Q-CAL-01": (d) =>
    d.isDeficit
      ? `~${d.dailyDeficit} cal daily deficit this week`
      : `~${d.dailySurplus} cal daily surplus this week`,
  "Q-MAC-01": (d) => `Protein averaged ${d.avgProteinPct}% of target`,
  "Q-CMP-01": (d) =>
    d.improved
      ? `Trending better than last week`
      : `Different pattern than last week`,
  "Q-CON-01": (d) =>
    d.isConsistent
      ? `Macros were steady this week`
      : `Macros varied quite a bit this week`,
  // ... fallback
  default: () => `Your week at a glance`,
};
```

---

## Part 3: Data Pipeline Architecture

### 3.1 Core Principle

> **All math happens in JavaScript. The LLM only narrates pre-computed results.**

The data pipeline for each question follows this flow:

```
User selects question
  → Data Fetcher (reads stores, computes stats)
    → Analysis Result (typed object with all numbers)
      → Prompt Builder (templates result into LLM prompt)
        → LLM generates response (max 200 tokens, temp 0.7)
          → Response Parser (extracts text + optional emoji)
            → UI renders
```

### 3.2 Data Sources

```typescript
// All data comes from existing stores
interface WeeklyDataSources {
  foodLogStore: {
    // 7 days of daily entries
    getDailyLogs(startDate: string, endDate: string): DailyFoodLog[];
  };
  goalStore: {
    calorieTarget: number;
    proteinTarget: number;
    waterTarget: number;
  };
  waterStore: {
    getDailyWater(startDate: string, endDate: string): DailyWater[];
  };
  insightsStore: {
    // Existing deficiency data
    cachedInsights: CachedInsights | null;
  };
  deficiencyCalculator: {
    // From src/features/insights/services/DeficiencyCalculator.ts
    calculateDeficiencies(days: DailyNutritionData[]): DeficiencyAlert[];
  };
}
```

### 3.3 Core Data Fetcher

A single `WeeklyDataCollector` gathers all data once, then individual question analyzers pull what they need:

```typescript
interface WeeklyCollectedData {
  // Week boundaries
  weekStartDate: string; // Sunday ISO date
  weekEndDate: string; // Saturday ISO date

  // Per-day data
  days: DayData[]; // 7 entries, some may be empty

  // Aggregates (computed from days)
  loggedDayCount: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  avgFiber: number;
  avgWater: number;
  avgMealCount: number;
  totalMeals: number;

  // Target comparisons
  calorieTarget: number;
  proteinTarget: number;
  waterTarget: number;

  // Trend context (optional, from prior weeks)
  priorWeek: WeeklyCollectedData | null;
  twoWeeksAgo: WeeklyCollectedData | null;

  // Deficiency data
  deficiencyAlerts: DeficiencyAlert[];

  // Metadata
  dataConfidence: number; // 0-1 based on logged days and completeness
  loggingStreak: number;
}

interface DayData {
  date: string;
  dayOfWeek: number; // 0=Sun, 6=Sat
  isLogged: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
  mealCount: number;
  foods: string[]; // food names for categorization
}
```

### 3.4 Question Analysis Pipeline

Each question has an analyzer that takes `WeeklyCollectedData` and returns a typed result:

```typescript
// Example: Q-CON-01 "How consistent were my macros?"
interface ConsistencyAnalysis {
  questionId: "Q-CON-01";
  calorieCV: number;
  proteinCV: number;
  carbCV: number;
  fatCV: number;
  mostConsistentMacro: string;
  leastConsistentMacro: string;
  overallConsistency:
    | "very_consistent"
    | "fairly_consistent"
    | "variable"
    | "quite_variable";
  loggedDays: number;
  interestingnessScore: number;
}

// Example: Q-CON-02 "Which days threw off my averages?"
interface OutlierAnalysis {
  questionId: "Q-CON-02";
  weekMean: number;
  weekStdDev: number;
  outlierDays: Array<{
    date: string;
    dayName: string;
    calories: number;
    deviationPct: number;
    direction: "high" | "low";
  }>;
  adjustedMean: number; // mean without outliers
  interestingnessScore: number;
}

// Example: Q-CAL-01 "Surplus or deficit?"
interface SurplusDeficitAnalysis {
  questionId: "Q-CAL-01";
  totalIntake: number;
  totalTarget: number;
  dailyAvgIntake: number;
  dailyAvgTarget: number;
  weeklyDelta: number; // positive = surplus
  dailyDelta: number;
  deltaPct: number; // % over/under
  isDeficit: boolean;
  isSurplus: boolean;
  isNeutral: boolean; // within ±3%
  userGoal: string; // from goalStore
  alignsWithGoal: boolean;
  loggedDays: number;
  interestingnessScore: number;
}

// ... similar typed interfaces for all 15 questions
```

### 3.5 Prompt Templates

Each question has a dedicated prompt template that injects the pre-computed analysis:

```typescript
function buildConsistencyPrompt(analysis: ConsistencyAnalysis): string {
  return `You are a warm, supportive nutrition companion using the "Nourished Calm" voice.
Rules: Be warm and never judgmental. Never use words like "failed", "cheated", "warning", "bad", or "guilt". Keep response to 2-3 sentences. Start with an observation, then a brief insight.

The user tracked ${analysis.loggedDays} days this week.
Their macro consistency (coefficient of variation):
- Calories: ${analysis.calorieCV.toFixed(1)}% (${classifyCV(analysis.calorieCV)})
- Protein: ${analysis.proteinCV.toFixed(1)}% (${classifyCV(analysis.proteinCV)})
- Carbs: ${analysis.carbCV.toFixed(1)}% (${classifyCV(analysis.carbCV)})
- Fat: ${analysis.fatCV.toFixed(1)}% (${classifyCV(analysis.fatCV)})
Most consistent: ${analysis.mostConsistentMacro}
Least consistent: ${analysis.leastConsistentMacro}

Write a 2-3 sentence insight about their macro consistency this week. Note what was steady and what varied. If something varied a lot, frame it as an observation, not a problem.`;
}
```

### 3.6 Response Format

All LLM responses are parsed into a consistent structure:

```typescript
interface WeeklyInsightResponse {
  questionId: string;
  text: string; // 2-3 sentence AI narrative
  icon: string; // emoji for display
  generatedAt: number; // timestamp
  analysisData: unknown; // the typed analysis for potential UI use
}
```

---

## Part 4: Implementation Specification

### 4.1 File Structure

```
src/features/weekly-insights/
├── types/
│   └── weeklyInsights.types.ts        # All TypeScript interfaces
├── constants/
│   ├── questionLibrary.ts             # Question definitions & metadata
│   └── headlineTemplates.ts           # Widget headline templates
├── services/
│   ├── WeeklyDataCollector.ts         # Gathers data from all stores
│   ├── analyzers/
│   │   ├── index.ts                   # Barrel export
│   │   ├── ConsistencyAnalyzer.ts     # Q-CON-01, Q-CON-02, Q-CON-03
│   │   ├── MacroBalanceAnalyzer.ts    # Q-MAC-01, Q-MAC-02, Q-MAC-03
│   │   ├── CalorieTrendAnalyzer.ts    # Q-CAL-01, Q-CAL-02, Q-CAL-03
│   │   ├── HydrationAnalyzer.ts       # Q-HYD-01
│   │   ├── TimingAnalyzer.ts          # Q-TIM-01, Q-TIM-02
│   │   ├── NutrientAnalyzer.ts        # Q-NUT-01
│   │   ├── ComparisonAnalyzer.ts      # Q-CMP-01, Q-CMP-02
│   │   └── HighlightsAnalyzer.ts      # Q-HI-01, Q-HI-02
│   ├── QuestionScorer.ts              # Scores & selects top questions
│   ├── WeeklyPromptBuilder.ts         # Prompt templates for all questions
│   └── WeeklyInsightGenerator.ts      # Orchestrates full pipeline
├── stores/
│   └── weeklyInsightsStore.ts         # Zustand store with persistence
├── hooks/
│   ├── useWeeklyData.ts               # Collects weekly data from stores
│   ├── useWeeklyQuestions.ts          # Scores & returns top questions
│   └── useWeeklyInsightGeneration.ts  # Orchestrates LLM generation
├── components/
│   ├── WeeklyInsightsScreen.tsx       # Full screen (route: /weekly-insights)
│   ├── QuestionCard.tsx               # Individual question card component
│   ├── QuestionResponseCard.tsx       # AI response display card
│   ├── MiniCalendar.tsx               # Extracted mini calendar (7 dots)
│   ├── WeeklyStatsGrid.tsx            # Extracted stats grid
│   └── WeekNavigation.tsx             # Week selector (prev/next arrows)
└── utils/
    ├── weekUtils.ts                   # Week boundary calculations
    └── statisticsUtils.ts             # CV, std dev, regression helpers
```

**Modified existing files:**

```
src/components/dashboard/widgets/WeeklyRecapWidget.tsx
  → Refactored to be a thin gateway widget that renders:
    - Template headline (no LLM)
    - Mini calendar dots (extracted to MiniCalendar.tsx)
    - CTA: "Explore your week →"
    - Tap navigates to /weekly-insights
```

### 4.2 TypeScript Interfaces

```typescript
// ── src/features/weekly-insights/types/weeklyInsights.types.ts ──

export type WeeklyQuestionCategory =
  | "consistency"
  | "macro_balance"
  | "calorie_trend"
  | "hydration"
  | "timing"
  | "nutrients"
  | "comparison"
  | "highlights";

export interface WeeklyQuestionDefinition {
  id: string;
  displayText: string;
  category: WeeklyQuestionCategory;
  icon: string; // emoji
  isPinned: boolean; // always shown if available
  minimumLoggedDays: number; // gate: minimum days with data
  requiresPriorWeek: boolean; // gate: needs prior week data
  requiresWaterData: boolean; // gate: needs water tracking
  requiresDeficiencyData: boolean; // gate: needs deficiency calculator
  requiresFiberData: boolean; // gate: needs fiber data
}

export interface DayData {
  date: string; // ISO date string
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  dayName: string; // "Monday", etc.
  isLogged: boolean;
  isComplete: boolean; // heuristic: meal count >= 2
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
  mealCount: number;
  foods: string[];
}

export interface WeeklyCollectedData {
  weekStartDate: string;
  weekEndDate: string;
  days: DayData[];
  loggedDayCount: number;
  completeDayCount: number;

  // Averages (computed from LOGGED days only, excluding empty days)
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  avgFiber: number;
  avgWater: number;
  avgMealCount: number;
  totalMeals: number;

  // Targets
  calorieTarget: number;
  proteinTarget: number;
  waterTarget: number;

  // Prior week context
  priorWeek: WeeklyCollectedData | null;
  twoWeeksAgo: WeeklyCollectedData | null;

  // Deficiency alerts
  deficiencyAlerts: DeficiencyAlert[];

  // Data quality
  dataConfidence: number; // 0-1
  loggingStreak: number;
  daysUsingApp: number;
}

export interface ScoredQuestion {
  questionId: string;
  definition: WeeklyQuestionDefinition;
  score: number; // 0-1 interestingness
  isAvailable: boolean; // passes all gates
  isPinned: boolean;
  analysisResult: QuestionAnalysisResult;
}

export type QuestionAnalysisResult =
  | ConsistencyAnalysis
  | OutlierAnalysis
  | TargetHitAnalysis
  | ProteinAnalysis
  | MacroBalanceAnalysis
  | FiberAnalysis
  | SurplusDeficitAnalysis
  | CalorieTrendAnalysis
  | DayByDayAnalysis
  | HydrationAnalysis
  | MealCountAnalysis
  | WeekdayWeekendAnalysis
  | NutrientAlertAnalysis
  | WeekComparisonAnalysis
  | ProteinTrendAnalysis
  | HighlightsAnalysis
  | FocusSuggestionAnalysis;

export interface WeeklyInsightResponse {
  questionId: string;
  text: string;
  icon: string;
  generatedAt: number;
  source: "llm" | "template";
  weekStartDate: string;
}

export interface WeeklyInsightsCache {
  weekStartDate: string;
  questions: ScoredQuestion[];
  headline: string;
  responses: Record<string, WeeklyInsightResponse>; // questionId → response
  generatedAt: number;
  validUntil: number;
}

// Mini calendar dot classification (preserved from existing widget)
export type DayStatus =
  | "on_target" // 85-115% of calorie target — green
  | "no_data" // no log — gray
  | "over_high" // >130% — terracotta
  | "over_moderate" // 115-130% — tan
  | "under_moderate" // 70-85% — light blue
  | "under_low"; // <70% — blue
```

### 4.3 Zustand Store

```typescript
// ── src/features/weekly-insights/stores/weeklyInsightsStore.ts ──

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface WeeklyInsightsState {
  // Cache
  cache: WeeklyInsightsCache | null;

  // Current view state
  selectedWeekStart: string | null; // ISO date, null = current week
  selectedQuestionId: string | null;
  isGenerating: boolean;
  generationError: string | null;

  // LLM status (mirrors insightsStore pattern)
  llmStatus: LLMStatus;
  downloadProgress: number;

  // Actions
  setSelectedWeek: (weekStart: string | null) => void;
  selectQuestion: (questionId: string | null) => void;
  setCache: (cache: WeeklyInsightsCache) => void;
  setCachedResponse: (
    questionId: string,
    response: WeeklyInsightResponse,
  ) => void;
  setIsGenerating: (generating: boolean) => void;
  setGenerationError: (error: string | null) => void;
  setLLMStatus: (status: LLMStatus) => void;
  setDownloadProgress: (progress: number) => void;

  // Derived
  shouldRecomputeQuestions: () => boolean;
  getCachedResponse: (questionId: string) => WeeklyInsightResponse | null;
}

export const useWeeklyInsightsStore = create<WeeklyInsightsState>()(
  persist(
    (set, get) => ({
      cache: null,
      selectedWeekStart: null,
      selectedQuestionId: null,
      isGenerating: false,
      generationError: null,
      llmStatus: { ready: false, reason: "unsupported", message: "" },
      downloadProgress: 0,

      setSelectedWeek: (weekStart) =>
        set({
          selectedWeekStart: weekStart,
          selectedQuestionId: null,
        }),
      selectQuestion: (questionId) => set({ selectedQuestionId: questionId }),
      setCache: (cache) => set({ cache }),
      setCachedResponse: (questionId, response) => {
        const current = get().cache;
        if (!current) return;
        set({
          cache: {
            ...current,
            responses: { ...current.responses, [questionId]: response },
          },
        });
      },
      setIsGenerating: (generating) => set({ isGenerating: generating }),
      setGenerationError: (error) => set({ generationError: error }),
      setLLMStatus: (status) => set({ llmStatus: status }),
      setDownloadProgress: (progress) => set({ downloadProgress: progress }),

      shouldRecomputeQuestions: () => {
        const { cache, selectedWeekStart } = get();
        if (!cache) return true;
        const targetWeek = selectedWeekStart || getCurrentWeekStart();
        if (cache.weekStartDate !== targetWeek) return true;
        if (Date.now() > cache.validUntil) return true;
        return false;
      },

      getCachedResponse: (questionId) => {
        const { cache } = get();
        return cache?.responses[questionId] ?? null;
      },
    }),
    {
      name: "weekly-insights-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ cache: state.cache }),
    },
  ),
);
```

### 4.4 Key Service: WeeklyDataCollector

```typescript
// ── src/features/weekly-insights/services/WeeklyDataCollector.ts ──

export class WeeklyDataCollector {
  /**
   * Collects all data needed for weekly analysis from existing stores.
   * Computes averages from LOGGED days only (Cronometer pattern).
   */
  static collect(weekStartDate: string): WeeklyCollectedData {
    const weekEnd = addDays(weekStartDate, 6);

    // Gather raw data from stores
    const foodLogs = useFoodLogStore
      .getState()
      .getDailyLogs(weekStartDate, weekEnd);
    const goals = useGoalStore.getState();
    const waterLogs = useWaterStore
      .getState()
      .getDailyWater(weekStartDate, weekEnd);

    // Build day-by-day data
    const days: DayData[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStartDate, i);
      const log = foodLogs.find((l) => l.date === date);
      const water = waterLogs.find((w) => w.date === date);

      days.push({
        date,
        dayOfWeek: new Date(date).getDay(),
        dayName: DAY_NAMES[new Date(date).getDay()],
        isLogged: !!log && log.mealCount > 0,
        isComplete: !!log && log.mealCount >= 2, // heuristic
        calories: log?.totalCalories ?? 0,
        protein: log?.totalProtein ?? 0,
        carbs: log?.totalCarbs ?? 0,
        fat: log?.totalFat ?? 0,
        fiber: log?.totalFiber ?? 0,
        water: water?.totalMl ?? 0,
        mealCount: log?.mealCount ?? 0,
        foods: log?.foods?.map((f) => f.name) ?? [],
      });
    }

    const loggedDays = days.filter((d) => d.isLogged);
    const loggedDayCount = loggedDays.length;

    // Compute averages from LOGGED days only
    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    // Optionally fetch prior weeks for comparison questions
    const priorWeekStart = addDays(weekStartDate, -7);
    const priorWeek = this.collectBasic(priorWeekStart);
    const twoWeeksAgoStart = addDays(weekStartDate, -14);
    const twoWeeksAgo = this.collectBasic(twoWeeksAgoStart);

    // Run deficiency calculator if enough data
    let deficiencyAlerts: DeficiencyAlert[] = [];
    if (loggedDayCount >= 5) {
      deficiencyAlerts = DeficiencyCalculator.calculate(loggedDays);
    }

    return {
      weekStartDate,
      weekEndDate: weekEnd,
      days,
      loggedDayCount,
      completeDayCount: days.filter((d) => d.isComplete).length,
      avgCalories: avg(loggedDays.map((d) => d.calories)),
      avgProtein: avg(loggedDays.map((d) => d.protein)),
      avgCarbs: avg(loggedDays.map((d) => d.carbs)),
      avgFat: avg(loggedDays.map((d) => d.fat)),
      avgFiber: avg(loggedDays.map((d) => d.fiber)),
      avgWater: avg(loggedDays.map((d) => d.water)),
      avgMealCount: avg(loggedDays.map((d) => d.mealCount)),
      totalMeals: loggedDays.reduce((sum, d) => sum + d.mealCount, 0),
      calorieTarget: goals.calorieTarget,
      proteinTarget: goals.proteinTarget,
      waterTarget: goals.waterTarget,
      priorWeek,
      twoWeeksAgo,
      deficiencyAlerts,
      dataConfidence: loggedDayCount / 7,
      loggingStreak: /* from existing streak logic */ 0,
      daysUsingApp: /* from existing app usage logic */ 0,
    };
  }
}
```

### 4.5 Example Analyzer: ConsistencyAnalyzer

```typescript
// ── src/features/weekly-insights/services/analyzers/ConsistencyAnalyzer.ts ──

import {
  coefficientOfVariation,
  standardDeviation,
} from "../../utils/statisticsUtils";

export class ConsistencyAnalyzer {
  /**
   * Q-CON-01: How consistent were my macros this week?
   */
  static analyzeMacroConsistency(
    data: WeeklyCollectedData,
  ): ConsistencyAnalysis {
    const logged = data.days.filter((d) => d.isLogged);
    if (logged.length < 3) {
      return {
        questionId: "Q-CON-01",
        interestingnessScore: 0 /* ... defaults */,
      };
    }

    const calorieCV = coefficientOfVariation(logged.map((d) => d.calories));
    const proteinCV = coefficientOfVariation(logged.map((d) => d.protein));
    const carbCV = coefficientOfVariation(logged.map((d) => d.carbs));
    const fatCV = coefficientOfVariation(logged.map((d) => d.fat));

    const cvs = {
      Calories: calorieCV,
      Protein: proteinCV,
      Carbs: carbCV,
      Fat: fatCV,
    };
    const entries = Object.entries(cvs);
    const mostConsistent = entries.reduce((a, b) => (a[1] < b[1] ? a : b))[0];
    const leastConsistent = entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0];

    const avgCV = (calorieCV + proteinCV + carbCV + fatCV) / 4;
    const overallConsistency =
      avgCV < 10
        ? "very_consistent"
        : avgCV < 20
          ? "fairly_consistent"
          : avgCV < 35
            ? "variable"
            : "quite_variable";

    // Interestingness: higher when CVs differ from each other (one steady, one wild)
    const cvRange =
      Math.max(...Object.values(cvs)) - Math.min(...Object.values(cvs));
    let score = 0.3 + (cvRange / 100) * 0.5; // 0.3-0.8 base
    if (logged.length >= 5) score += 0.2;
    score = Math.min(1, Math.max(0.3, score));

    return {
      questionId: "Q-CON-01",
      calorieCV,
      proteinCV,
      carbCV,
      fatCV,
      mostConsistentMacro: mostConsistent,
      leastConsistentMacro: leastConsistent,
      overallConsistency,
      loggedDays: logged.length,
      interestingnessScore: score,
    };
  }

  /**
   * Q-CON-02: Which days threw off my averages?
   */
  static analyzeOutliers(data: WeeklyCollectedData): OutlierAnalysis {
    const logged = data.days.filter((d) => d.isLogged);
    if (logged.length < 4) {
      return { questionId: "Q-CON-02", interestingnessScore: 0 /* defaults */ };
    }

    const cals = logged.map((d) => d.calories);
    const mean = cals.reduce((a, b) => a + b, 0) / cals.length;
    const stdDev = standardDeviation(cals);
    const threshold = 1.5 * stdDev;

    const outlierDays = logged
      .filter((d) => Math.abs(d.calories - mean) > threshold)
      .map((d) => ({
        date: d.date,
        dayName: d.dayName,
        calories: d.calories,
        deviationPct: Math.round(((d.calories - mean) / mean) * 100),
        direction: d.calories > mean ? ("high" as const) : ("low" as const),
      }));

    const nonOutlierCals = logged
      .filter((d) => Math.abs(d.calories - mean) <= threshold)
      .map((d) => d.calories);
    const adjustedMean =
      nonOutlierCals.length > 0
        ? nonOutlierCals.reduce((a, b) => a + b, 0) / nonOutlierCals.length
        : mean;

    // Interestingness: 1-2 outliers = most interesting narrative
    let score = 0.2;
    if (outlierDays.length === 1 || outlierDays.length === 2) score = 0.8;
    else if (outlierDays.length >= 3)
      score = 0.5; // too many = noisy
    else score = 0.1; // 0 outliers = boring

    return {
      questionId: "Q-CON-02",
      weekMean: Math.round(mean),
      weekStdDev: Math.round(stdDev),
      outlierDays,
      adjustedMean: Math.round(adjustedMean),
      interestingnessScore: score,
    };
  }

  /**
   * Q-CON-03: How many days did I hit my targets?
   */
  static analyzeTargetHits(data: WeeklyCollectedData): TargetHitAnalysis {
    const logged = data.days.filter((d) => d.isLogged);

    const calorieHits = logged.filter(
      (d) =>
        d.calories >= data.calorieTarget * 0.85 &&
        d.calories <= data.calorieTarget * 1.15,
    ).length;

    const proteinHits = logged.filter(
      (d) => d.protein >= data.proteinTarget - 10,
    ).length;

    let score = 0.5;
    if (calorieHits === logged.length && logged.length >= 5) score = 0.9; // perfect week!
    if (logged.length < 4) score = 0.2;

    return {
      questionId: "Q-CON-03",
      loggedDays: logged.length,
      calorieHitDays: calorieHits,
      proteinHitDays: proteinHits,
      calorieHitPct:
        logged.length > 0 ? Math.round((calorieHits / logged.length) * 100) : 0,
      proteinHitPct:
        logged.length > 0 ? Math.round((proteinHits / logged.length) * 100) : 0,
      interestingnessScore: score,
    };
  }
}
```

### 4.6 Statistics Utilities

```typescript
// ── src/features/weekly-insights/utils/statisticsUtils.ts ──

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(
    squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1),
  );
}

export function coefficientOfVariation(values: number[]): number {
  const avg = mean(values);
  if (avg === 0) return 0;
  return (standardDeviation(values) / avg) * 100;
}

export function linearRegression(values: number[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0, rSquared: 0 };

  const xs = values.map((_, i) => i);
  const xMean = mean(xs);
  const yMean = mean(values);

  let ssXY = 0,
    ssXX = 0,
    ssTot = 0,
    ssRes = 0;
  for (let i = 0; i < n; i++) {
    ssXY += (xs[i] - xMean) * (values[i] - yMean);
    ssXX += (xs[i] - xMean) ** 2;
  }

  const slope = ssXX > 0 ? ssXY / ssXX : 0;
  const intercept = yMean - slope * xMean;

  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * xs[i];
    ssRes += (values[i] - predicted) ** 2;
    ssTot += (values[i] - yMean) ** 2;
  }

  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, rSquared };
}
```

### 4.7 Week Utilities

```typescript
// ── src/features/weekly-insights/utils/weekUtils.ts ──

/**
 * Get the Sunday that starts the week containing the given date.
 */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // back to Sunday
  return d.toISOString().split("T")[0];
}

export function getWeekEnd(weekStart: string): string {
  return addDays(weekStart, 6);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(addDays(weekStart, 6));
  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

export function isCurrentWeek(weekStart: string): boolean {
  return weekStart === getWeekStart();
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
```

### 4.8 Component Specifications

#### Widget (Refactored)

```
┌─────────────────────────────────────┐
│ 📅 Weekly Insights         [streak] │  ← Header (existing icon + new title)
│                                     │
│ ● ● ● ● ● ● ●                     │  ← Mini calendar dots (preserved)
│ S M T W T F S                       │
│                                     │
│ "Protein averaged 82% of target"    │  ← Template headline (NO LLM)
│                                     │
│          Explore your week →        │  ← CTA button
└─────────────────────────────────────┘
```

- **Size:** Large widget (same as current)
- **Premium-only** (same gate)
- **No LLM call** — headline is template-generated from top question's analysis
- **Tap CTA** → navigates to `/weekly-insights`
- **Cache:** Questions recomputed when week changes (Sunday) or data updates
- Keeps the mini calendar dots — they're useful at-a-glance

#### Weekly Insights Screen

```
┌─────────────────────────────────────┐
│ ←  Weekly Insights                  │  ← Back button + title
│     < Jan 26 – Feb 1 >             │  ← Week nav with prev/next arrows
│                                     │
│ ● ● ● ● ● ● ●                     │  ← Mini calendar (larger)
│ S M T W T F S                       │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Avg Cal  │ Avg Pro │ Logged │ M │ │  ← Stats grid (preserved)
│ │  2,180   │  142g   │ 6 days │23 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ── Questions for your week ──────── │
│                                     │
│ ┌─ 🌟 What went well? ───────────┐ │  ← Pinned question card
│ │  Tap to see AI analysis         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ 📊 Surplus or deficit? ───────┐ │  ← Scored question
│ │  ~180 cal daily surplus         │ │     Shows mini-preview from template
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ 🎯 Consistency check ─────────┐ │
│ │  Macros varied quite a bit      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ 📈 Week-over-week ────────────┐ │
│ │  Trending better than last week │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ 💧 Hydration check ───────────┐ │
│ │  Water averaged 72% of target   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ 🎯 Focus for next week ───────┐ │
│ │  Tap to see AI suggestion       │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Question Card States:**

1. **Unselected** — shows question text + template mini-preview. Tap to expand.
2. **Loading** — shows loading spinner while LLM generates response.
3. **Generated** — shows AI narrative (2-3 sentences). Cached for the week.
4. **LLM Unavailable** — shows template mini-preview only (no AI narrative). Still useful because the math-based preview is informative.

**Week Navigation:**

- Left/right arrows move between weeks
- Current week shows "This Week" label
- Past weeks load from stored food log data
- LLM responses are cached per-week in the store
- No forward navigation past current week

**LLM States (same as daily widget pattern):**

- Ready → questions generate on tap
- Model download required → show download prompt at top of screen
- Unsupported → questions still show template previews, AI narrative unavailable
- Downloading → progress bar at top

### 4.9 Prompt Builder (Full)

```typescript
// ── src/features/weekly-insights/services/WeeklyPromptBuilder.ts ──

const SYSTEM_PREAMBLE = `You are a warm, supportive nutrition companion. Use the "Nourished Calm" voice — warm, encouraging, never judgmental. NEVER use these words: "failed", "cheated", "warning", "bad", "guilt", "shame", "terrible", "awful". Keep your response to 2-3 concise sentences. Use a conversational tone. Start with an observation, add an insight.`;

export class WeeklyPromptBuilder {
  static build(questionId: string, analysis: QuestionAnalysisResult): string {
    const builder = promptBuilders[questionId];
    if (!builder) throw new Error(`No prompt builder for ${questionId}`);
    return builder(analysis);
  }
}

const promptBuilders: Record<string, (analysis: any) => string> = {
  "Q-CON-01": (a: ConsistencyAnalysis) => `${SYSTEM_PREAMBLE}

The user tracked ${a.loggedDays} days this week.
Macro consistency (coefficient of variation — lower = more consistent):
- Calories: ${a.calorieCV.toFixed(1)}% CV (${a.overallConsistency})
- Protein: ${a.proteinCV.toFixed(1)}% CV
- Carbs: ${a.carbCV.toFixed(1)}% CV
- Fat: ${a.fatCV.toFixed(1)}% CV
Most consistent macro: ${a.mostConsistentMacro}
Most variable macro: ${a.leastConsistentMacro}

Write a 2-3 sentence observation about their macro consistency. Highlight what was steady. If something varied, frame it neutrally as a pattern to be aware of.`,

  "Q-CON-02": (a: OutlierAnalysis) => `${SYSTEM_PREAMBLE}

The user's average calorie intake this week was ${a.weekMean} cal/day.
${
  a.outlierDays.length === 0
    ? "No days stood out as particularly different from the average."
    : `These days stood out:\n${a.outlierDays
        .map(
          (d) =>
            `- ${d.dayName}: ${d.calories} cal (${d.deviationPct > 0 ? "+" : ""}${d.deviationPct}% from average, ${d.direction})`,
        )
        .join("\n")}
Without those days, the average would be ${a.adjustedMean} cal/day.`
}

Write 2-3 sentences about which days shifted their weekly picture. Be observational, not critical. If outlier days were higher, note them matter-of-factly.`,

  "Q-CON-03": (a: TargetHitAnalysis) => `${SYSTEM_PREAMBLE}

This week, out of ${a.loggedDays} logged days:
- ${a.calorieHitDays} days were within range of their calorie target (${a.calorieHitPct}%)
- ${a.proteinHitDays} days met their protein target (${a.proteinHitPct}%)

Write 2-3 sentences celebrating their on-target days. If they hit targets most days, acknowledge the consistency. If fewer days hit targets, focus on the days that did work well.`,

  "Q-MAC-01": (a: ProteinAnalysis) => `${SYSTEM_PREAMBLE}

Protein this week:
- Average: ${a.avgProtein}g/day (target: ${a.proteinTarget}g)
- That's ${a.avgProteinPct}% of their target
- ${a.daysMetTarget} of ${a.loggedDays} days met the protein target
- As % of calories: ${a.proteinCalPct}%
${a.trend ? `- Trend vs. last week: ${a.trend}` : ""}

Write 2-3 sentences about their protein intake. For fitness enthusiasts, protein is important — acknowledge where they are relative to their target without being preachy.`,

  "Q-MAC-02": (a: MacroBalanceAnalysis) => `${SYSTEM_PREAMBLE}

Average macro split this week:
- Protein: ${a.proteinPct}% of calories (${a.avgProtein}g)
- Carbs: ${a.carbsPct}% of calories (${a.avgCarbs}g)
- Fat: ${a.fatPct}% of calories (${a.avgFat}g)
Most variable macro day-to-day: ${a.mostVariableMacro}
${a.skewedMacro ? `Note: ${a.skewedMacro} makes up a notably ${a.skewDirection} share of calories.` : "The split is fairly balanced."}

Write 2-3 sentences about their macro balance. Note the overall pattern and any day-to-day variability.`,

  "Q-CAL-01": (a: SurplusDeficitAnalysis) => `${SYSTEM_PREAMBLE}

Calorie summary for the week:
- Average daily intake: ${Math.round(a.dailyAvgIntake)} cal
- Daily target: ${a.dailyAvgTarget} cal
- Daily ${a.isDeficit ? "deficit" : a.isSurplus ? "surplus" : "balance"}: ~${Math.abs(Math.round(a.dailyDelta))} cal (${a.deltaPct > 0 ? "+" : ""}${a.deltaPct}%)
- ${a.loggedDays} days logged
${a.alignsWithGoal ? "- This aligns with their stated goal." : "- This is different from their stated goal direction."}

Write 2-3 sentences summarizing their energy balance for the week. Be factual. If it aligns with their goal, acknowledge that. If not, frame it as information rather than a problem.`,

  "Q-CAL-02": (a: CalorieTrendAnalysis) => `${SYSTEM_PREAMBLE}

Calorie trend over recent weeks:
- Current week average: ${a.currentWeekAvg} cal/day
- Prior week average: ${a.priorWeekAvg} cal/day
${a.twoWeeksAgoAvg ? `- Two weeks ago average: ${a.twoWeeksAgoAvg} cal/day` : ""}
- Trend direction: ${a.trendDirection} (${a.trendMagnitude} cal/week)
- Trend strength: ${a.trendStrength}

Write 2-3 sentences about the direction their calorie intake is moving. Frame trends as information.`,

  "Q-HYD-01": (a: HydrationAnalysis) => `${SYSTEM_PREAMBLE}

Water intake this week:
- Average: ${a.avgWater}ml/day (target: ${a.waterTarget}ml)
- That's ${a.avgWaterPct}% of target
- ${a.daysMetTarget} of ${a.loggedDays} days met the water target
- Most hydrated day: ${a.bestDay} (${a.bestDayAmount}ml)
- Least hydrated day: ${a.worstDay} (${a.worstDayAmount}ml)

Write 2-3 sentences about their hydration pattern. Be encouraging about good days.`,

  "Q-TIM-01": (a: MealCountAnalysis) => `${SYSTEM_PREAMBLE}

Meal frequency this week:
- Average: ${a.avgMeals} meals/day
- Range: ${a.minMeals} to ${a.maxMeals} meals/day
- Total meals logged: ${a.totalMeals}
${a.mealCalCorrelation ? `- Pattern: Days with more meals tended to have ${a.mealCalCorrelation} calories` : ""}

Write 2-3 sentences about their meal frequency pattern. Note any days that stood out.`,

  "Q-TIM-02": (a: WeekdayWeekendAnalysis) => `${SYSTEM_PREAMBLE}

Weekday vs. weekend comparison:
- Weekday avg calories: ${a.weekdayAvgCal} cal
- Weekend avg calories: ${a.weekendAvgCal} cal
- Weekend effect: ${a.weekendEffect > 0 ? "+" : ""}${a.weekendEffect}% calories
- Weekday avg protein: ${a.weekdayAvgProtein}g
- Weekend avg protein: ${a.weekendAvgProtein}g
- Weekday avg meals: ${a.weekdayAvgMeals}
- Weekend avg meals: ${a.weekendAvgMeals}

Write 2-3 sentences comparing their weekday and weekend eating patterns. Frame differences as observations.`,

  "Q-NUT-01": (a: NutrientAlertAnalysis) => `${SYSTEM_PREAMBLE}

Nutrient status from the past week's analysis:
${
  a.alerts.length === 0
    ? "No nutrient concerns were flagged this week."
    : a.alerts
        .map(
          (alert) =>
            `- ${alert.nutrient}: ${alert.severity} level (${alert.percentRDA}% of recommended intake). Good sources: ${alert.foodSources.join(", ")}`,
        )
        .join("\n")
}

Write 2-3 sentences about their nutrient status. If there are concerns, mention food sources gently. If no concerns, celebrate the balanced intake.`,

  "Q-CMP-01": (a: WeekComparisonAnalysis) => `${SYSTEM_PREAMBLE}

This week vs. last week:
${a.comparisons
  .map(
    (c) =>
      `- ${c.metric}: ${c.thisWeek} → ${c.direction === "up" ? "↑" : c.direction === "down" ? "↓" : "→"} (${c.changePct > 0 ? "+" : ""}${c.changePct}%)`,
  )
  .join("\n")}
Biggest improvement: ${a.biggestImprovement}
Biggest change: ${a.biggestChange}

Write 2-3 sentences comparing the two weeks. Lead with improvements.`,

  "Q-CMP-02": (a: ProteinTrendAnalysis) => `${SYSTEM_PREAMBLE}

Protein trend over recent weeks:
${a.weeklyAverages.map((w) => `- ${w.weekLabel}: ${w.avgProtein}g/day`).join("\n")}
- Trend: ${a.trendDirection} (${a.trendMagnitude}g/week)
- Target: ${a.proteinTarget}g/day

Write 2-3 sentences about the protein trend direction over recent weeks.`,

  "Q-HI-01": (a: HighlightsAnalysis) => `${SYSTEM_PREAMBLE}

Highlights from this week:
${a.highlights.map((h, i) => `${i + 1}. ${h}`).join("\n")}

Write 2-3 warm sentences celebrating these wins. Be specific about what went well. This should feel like a friend high-fiving them.`,

  "Q-HI-02": (a: FocusSuggestionAnalysis) => `${SYSTEM_PREAMBLE}

Based on this week's data, here's the most impactful area to focus on next week:
- Focus area: ${a.focusArea}
- Current level: ${a.currentLevel}
- Suggested direction: ${a.suggestion}
- Why it matters: ${a.rationale}

Write 2-3 sentences offering a gentle, specific suggestion for next week. Frame it as an opportunity, not a correction. Be encouraging.`,
};
```

### 4.10 Caching Strategy

```
Weekly Questions Cache (Zustand persisted store):
├── Key: weekStartDate (ISO string, e.g., "2026-02-01")
├── Contains:
│   ├── scored questions array (pre-computed analysis + scores)
│   ├── template headline string
│   └── responses map: { questionId → LLM response }
├── Invalidation:
│   ├── Week changes (new Sunday)
│   ├── Manual refresh on screen (future: pull-to-refresh)
│   └── Food log data changes for the week (debounced)
└── TTL: Until next Sunday (aligns with weekly cadence)

LLM responses are generated LAZILY — only when a user taps a question.
Questions and scores are computed eagerly when the screen opens.
```

### 4.11 Testing Requirements

**Unit Tests (Jest):**

| Test Suite                     | Coverage                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `statisticsUtils.test.ts`      | mean, stdDev, CV, linearRegression with known inputs                          |
| `weekUtils.test.ts`            | getWeekStart for various dates, formatWeekRange, edge cases (year boundaries) |
| `ConsistencyAnalyzer.test.ts`  | CV calculations, outlier detection, target hit counting                       |
| `MacroBalanceAnalyzer.test.ts` | Split calculations, fiber gating                                              |
| `CalorieTrendAnalyzer.test.ts` | Surplus/deficit, linear regression trends                                     |
| `QuestionScorer.test.ts`       | Selection algorithm, category diversity, pinning logic                        |
| `WeeklyDataCollector.test.ts`  | Average calculations excluding empty days, prior week fetching                |
| `WeeklyPromptBuilder.test.ts`  | Each prompt template produces valid string with test data                     |

**Test Data Fixtures:**

```typescript
// Perfect week: 7 logged days, all on target
const PERFECT_WEEK: WeeklyCollectedData = {
  /* ... */
};

// Sparse week: 3 logged days, inconsistent
const SPARSE_WEEK: WeeklyCollectedData = {
  /* ... */
};

// Weekend-heavy week: low weekdays, high weekends
const WEEKEND_HEAVY_WEEK: WeeklyCollectedData = {
  /* ... */
};

// Trending week: clear calorie decline across the week
const DECLINING_WEEK: WeeklyCollectedData = {
  /* ... */
};

// Empty week: 0 logged days
const EMPTY_WEEK: WeeklyCollectedData = {
  /* ... */
};
```

**Integration Tests:**

- Full pipeline: data collection → analysis → scoring → question selection
- LLM prompt generation with real analysis results
- Cache invalidation on week change
- Widget headline generation from top question

### 4.12 Implementation Order

This is the recommended build sequence. Each phase is independently testable.

**Phase 1: Foundation (no UI)**

1. `weekUtils.ts` — week boundary calculations
2. `statisticsUtils.ts` — CV, stdDev, regression
3. `weeklyInsights.types.ts` — all TypeScript interfaces
4. `questionLibrary.ts` — question definitions and metadata

**Phase 2: Data Pipeline** 5. `WeeklyDataCollector.ts` — data gathering from stores 6. All analyzers in `analyzers/` — one at a time, with unit tests 7. `QuestionScorer.ts` — scoring and selection algorithm 8. `headlineTemplates.ts` — template strings for widget + question previews

**Phase 3: LLM Integration** 9. `WeeklyPromptBuilder.ts` — prompt templates 10. `WeeklyInsightGenerator.ts` — orchestration (reuse LLM provider pattern from daily insights)

**Phase 4: State** 11. `weeklyInsightsStore.ts` — Zustand store with persistence 12. `useWeeklyData.ts` — hook wrapping data collector 13. `useWeeklyQuestions.ts` — hook wrapping scorer 14. `useWeeklyInsightGeneration.ts` — hook wrapping LLM generation

**Phase 5: UI** 15. Extract `MiniCalendar.tsx` from existing WeeklyRecapWidget 16. Extract `WeeklyStatsGrid.tsx` from existing widget 17. Build `WeekNavigation.tsx` — prev/next week arrows 18. Build `QuestionCard.tsx` — individual question with states 19. Build `QuestionResponseCard.tsx` — AI response display 20. Build `WeeklyInsightsScreen.tsx` — full screen composition 21. Refactor `WeeklyRecapWidget.tsx` — thin gateway with headline + CTA

**Phase 6: Polish** 22. Cache management and invalidation testing 23. Empty/insufficient data states 24. LLM unavailable fallback (template-only mode) 25. Week navigation with data loading 26. Animation and transitions

---

## Appendix A: Nourished Calm Voice Rules

These rules apply to all LLM prompts in the weekly insights system:

- **Warm tone** — like a knowledgeable friend, not a clinical report
- **Never judgmental** — observations, not evaluations
- **Forbidden words:** "failed", "cheated", "warning", "bad", "guilt", "shame", "terrible", "awful", "poor", "struggle"
- **Reframes:** Instead of "you went over your target," say "your intake was a bit above your target." Instead of "you failed to hit protein," say "protein came in at 85% of your target."
- **Start positive** — Q-HI-01 is always available for this. Other questions should lead with what's working before noting what could shift.
- **Concise** — 2-3 sentences maximum per response. These are small-model responses at 150-200 tokens.
- **Specific** — reference actual numbers from the analysis. "Your protein averaged 138g" is better than "your protein was close to target."

## Appendix B: Mini Calendar Dot Color Mapping

Preserved from existing widget, for reference:

| Condition                 | Color                | Status           |
| ------------------------- | -------------------- | ---------------- |
| 85–115% of calorie target | Sage green (#8FAE7E) | On target        |
| No data logged            | Light gray (#D5D5D5) | No data          |
| >130% of target           | Terracotta (#C67B5C) | Notably over     |
| 115–130% of target        | Tan (#D4B896)        | Moderately over  |
| 70–85% of target          | Light blue (#92B4CC) | Moderately under |
| <70% of target            | Soft blue (#7BA3BF)  | Notably under    |

The AI narrative (Q-CAL-03 "Day by day pattern") should reference these dot colors when describing the week's shape, creating a connection between the visual and the narrative.

## Appendix C: Data Confidence Rules

Following Cronometer's pattern of data hygiene:

- **Averages exclude empty days** — if a user logged 5 of 7 days, averages are computed from those 5 days only
- **"Complete day" heuristic** — a day with ≥ 2 meals logged is considered "complete." Days with only 1 meal may be partial logs.
- **Minimum data gates** — each question declares its minimum requirements. Questions requiring trend data (2+ weeks) are only available after sufficient history.
- **Data confidence score** — 0-1 based on `loggedDays / 7`. This is injected into LLM prompts so the model can caveat appropriately (e.g., "Based on the 4 days you logged this week…").
- **The LLM should never extrapolate** — if only 3 days are logged, the analysis should say "across your 3 logged days" not "this week you averaged." The prompt templates enforce this.
