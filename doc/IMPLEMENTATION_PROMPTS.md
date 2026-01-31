# NutritionRx Implementation Prompts for Claude Code IDE

> **Last Updated:** 2026-01-31  
> **Purpose:** Drop these prompts into Claude Code IDE to implement each feature. Each prompt is self-contained and includes UX research, acceptance criteria, and implementation guidance.

---

## Quick Reference

| Feature | Prompt Length | Est. Time | Complexity |
|---------|---------------|-----------|------------|
| 1. Macro Cycling Settings Link | Short | < 1 hour | Low |
| 2. Restaurant Premium Enforcement | Short | < 1 hour | Low |
| 3. LLM Widget Integration | Medium | 4-6 hours | Medium |
| 4. Micronutrient USDA Integration | Long | 2-3 days | High |
| 5. GPT Nutrition Chat | Long | 3-5 days | High |

---

## Prompt 1: Macro Cycling Settings Link

### Copy this prompt into Claude Code IDE:

```
## Task: Add Macro Cycling Settings Entry Point

### Context
The Macro Cycling feature is 100% functional—the store, repository, 3-step wizard, and dashboard integration all work. Route `/macro-cycling-setup` exists and premium gating is correct. **The only problem:** there's no way for users to discover or access it.

### What to Implement
Add a single `PremiumSettingsRow` to the Settings screen that links to `/macro-cycling-setup`.

### Files to Modify
- `src/app/settings/index.tsx` (add the new row)

### Implementation Details

1. **Find the right section** in Settings. Look for groups like:
   - "Goals & Planning"
   - "Targets" 
   - "Nutrition"
   Place the row near related items (calorie targets, goal weight, activity level).

2. **Add the row:**
```typescript
import { PremiumSettingsRow } from '@/components/premium/PremiumSettingsRow';

<PremiumSettingsRow
  icon="calendar-sync"  // or "refresh-cw" — match existing icon style
  title="Macro Cycling"
  subtitle="Different targets for training vs rest days"
  onPress={() => router.push('/macro-cycling-setup')}
  paywallContext="planning"
/>
```

3. **Icon selection:** Check what icons exist in the app's icon system. Good options:
   - `calendar-sync` — represents cycling/repeating schedule
   - `refresh-cw` — represents cycling pattern  
   - `bar-chart-2` — represents varying targets

### UX Requirements (from research)
- **Visual hierarchy:** Row should match the visual weight of neighboring settings rows
- **Grouping:** Place near related goal/planning items (not isolated at bottom)
- **Lock badge:** `PremiumSettingsRow` handles showing the lock icon for non-premium users automatically
- **Plain language:** "Different targets for training vs rest days" is clearer than "Customize daily macro allocation by day type"

### Acceptance Criteria
- [ ] Row appears in Settings screen in a logical position
- [ ] Row icon matches style of other settings icons  
- [ ] Tapping row navigates to `/macro-cycling-setup`
- [ ] Non-premium users see lock badge and are taken to paywall with context="planning"
- [ ] Premium users go directly to setup wizard
- [ ] Row has appropriate accessibility label

### Test Cases
1. **Premium user:** Settings → Find row → Tap → Should go to setup wizard
2. **Non-premium user:** Settings → Find row (with lock badge) → Tap → Should show paywall
3. **Visual check:** Row icon and styling match neighboring rows

This is a one-line fix plus import. No new components, no database changes, no new routes.
```

---

## Prompt 2: Restaurant Premium Enforcement

### Copy this prompt into Claude Code IDE:

```
## Task: Fix Restaurant Premium Gating

### Context
Restaurant Database is fully functional (10 chains, 155+ items, search, logging). A `PremiumBanner` is displayed, but `onUpgradePress` just does `console.log('Navigate to premium')`. **Free users can browse AND log everything** — this is a revenue leak.

### What to Implement
1. Fix the banner CTA to navigate to paywall
2. Gate the logging action (soft gate pattern)

### UX Pattern: Soft Gate (Research-Backed)
Based on paywall UX research, we're using a **soft gate** approach:
- ✅ Non-premium users CAN browse restaurants
- ✅ Non-premium users CAN view menu items and nutrition info  
- ❌ Non-premium users CANNOT log food (gate at point of action)

**Why soft gate?** Research shows soft paywalls have better long-term retention because users discover value before hitting the paywall. Hard paywalls convert better initially but have higher churn. For a feature like restaurant database where seeing the data IS the value proposition, letting users explore creates desire.

### Files to Modify

**1. `src/app/restaurant/index.tsx`** — Fix banner CTA

Current (broken):
```typescript
<PremiumBanner
  onUpgradePress={() => console.log('Navigate to premium')}
/>
```

Fixed:
```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

<PremiumBanner
  onUpgradePress={() => router.push('/paywall?context=nutrition')}
/>
```

**2. `src/app/restaurant/food/[foodId].tsx`** — Gate logging action

```typescript
import { useSubscription } from '@/stores/subscriptionStore';
import { useRouter } from 'expo-router';

const { isPremium } = useSubscription();
const router = useRouter();

const handleLogFood = async () => {
  // Gate check BEFORE any logging logic
  if (!isPremium) {
    router.push('/paywall?context=nutrition');
    return;
  }
  
  // Existing logging logic continues here...
  await restaurantStore.logFood({
    foodId,
    quantity,
    mealType,
    notes,
  });
  
  // Success feedback and navigation
};
```

**3. Consider visual indication on Log button:**

If the app uses lock badges on buttons elsewhere, add one here:
```typescript
<Button
  title="Log Food"
  onPress={handleLogFood}
  rightIcon={!isPremium ? <PremiumBadge /> : undefined}
/>
```

Or use `LockedOverlay` if that pattern is used elsewhere in the app.

### Copy & Messaging
| Element | Text |
|---------|------|
| Banner Title | "Restaurant Nutrition Database" |
| Banner Body | "Log food from your favorite restaurants with accurate nutrition data" |
| Banner CTA | "Unlock Premium" |
| Paywall Context | `nutrition` (shows restaurant database as a benefit) |

### Acceptance Criteria
- [ ] Non-premium users CANNOT log restaurant food
- [ ] Tapping "Log Food" as non-premium shows paywall
- [ ] Paywall shows with `context=nutrition`
- [ ] Premium users can log food normally
- [ ] Banner "Unlock Premium" CTA navigates to paywall
- [ ] Non-premium users CAN browse restaurants freely
- [ ] Non-premium users CAN view menu items and nutrition info
- [ ] Some visual indication that logging is premium (badge or disabled state)

### Test Cases
1. **Banner CTA:** Non-premium → Restaurant list → Tap "Unlock Premium" → Paywall appears
2. **Browse freely:** Non-premium → Browse restaurants → View menu items → Should work
3. **Log gate:** Non-premium → Navigate to food item → Tap "Log Food" → Paywall (NOT logged)
4. **Premium flow:** Premium → Navigate to food item → Tap "Log Food" → Success
5. **No bypass:** Try all paths to log as non-premium → Paywall always appears

### Notes
- Check how other premium features (AI Photo, Macro Cycling) handle gating for consistency
- `PremiumBanner` should already handle showing/hiding based on subscription status
- Use paywall `context="nutrition"` — this affects which benefits are highlighted
```

---

## Prompt 3: LLM Widget Integration

### Copy this prompt into Claude Code IDE:

```
## Task: Wire LLM Widgets to Actual LLM Service

### Context
The app has a working local LLM system:
- `LLMService.ts` — SmolLM2 1.7B downloads, loads, generates text ✅
- `DailyInsightsSection.tsx` — Uses LLM correctly with fallback ✅

But two widgets are broken:
- `AIDailyInsightWidget` — Claims "cloud LLM" but uses hardcoded templates
- `WeeklyRecapWidget` — Claims "local LLM" but uses hardcoded templates

### What to Implement
Wire both widgets to actually use `LLMService`, following the pattern in `DailyInsightsSection.tsx`.

### Reference Pattern
Study `DailyInsightsSection.tsx` (229 lines) — it demonstrates:
1. Model download prompt ("Enable AI Insights" with download button)
2. Download progress tracking (progress bar during 1GB download)
3. Graceful fallback (uses `FallbackInsights.ts` if LLM unavailable)
4. Real inference (calls `LLMService.generate()`)
5. Caching (4-hour TTL)

### Files to Modify

**1. `src/components/dashboard/widgets/AIDailyInsightWidget.tsx`**

Replace hardcoded template logic (around lines 200-250) with:

```typescript
import { useLLM } from '@/features/insights/hooks/useLLM';
// Or use LLMService directly if no hook exists

const AIDailyInsightWidget: React.FC<Props> = ({ ... }) => {
  const { 
    isReady,           // Model downloaded AND loaded
    isDownloading, 
    downloadProgress,
    generate,
    downloadModel 
  } = useLLM();
  
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Check cache first (4-hour TTL)
  useEffect(() => {
    const loadInsight = async () => {
      const cached = await getCachedInsight('daily');
      if (cached && !isStale(cached, 4 * 60 * 60 * 1000)) {
        setInsight(cached.text);
        return;
      }
      
      if (isReady) {
        generateDailyInsight();
      }
    };
    loadInsight();
  }, [isReady]);
  
  const generateDailyInsight = async () => {
    setIsLoading(true);
    try {
      const prompt = buildDailyInsightPrompt(todayData);
      const result = await generate(prompt, 150); // max 150 tokens
      setInsight(result);
      await cacheInsight('daily', result);
    } catch (error) {
      // Fallback to template-based insight
      setInsight(generateFallbackInsight(todayData));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render states
  if (!isReady && !insight) {
    return <EnableAIPrompt onEnable={downloadModel} />;
  }
  
  if (isDownloading) {
    return <DownloadProgress progress={downloadProgress} />;
  }
  
  if (isLoading) {
    return <InsightSkeleton />;
  }
  
  return <InsightDisplay text={insight} />;
};
```

**Daily Insight Prompt:**
```typescript
const buildDailyInsightPrompt = (data: DailyData): string => {
  return `You are a supportive nutrition assistant using the "Nourished Calm" voice: warm, encouraging, never judgmental. Based on today's eating:

Calories: ${data.calories} / ${data.calorieTarget} (${Math.round(data.calories / data.calorieTarget * 100)}%)
Protein: ${data.protein}g / ${data.proteinTarget}g
Carbs: ${data.carbs}g / ${data.carbTarget}g
Fat: ${data.fat}g / ${data.fatTarget}g
Water: ${data.water} / ${data.waterTarget} glasses

Provide ONE brief, encouraging insight (1-2 sentences). Focus on one actionable observation. Never use words like "failed", "cheated", "warning", or "deficiency".

Output only the insight text, no labels or formatting.`;
};
```

**2. `src/components/dashboard/widgets/WeeklyRecapWidget.tsx`**

Replace template logic (lines 338-382) with similar pattern:

```typescript
const buildWeeklyRecapPrompt = (data: WeeklyData): string => {
  return `You are a supportive nutrition coach using the "Nourished Calm" voice. Here's a user's week:

Week of ${data.weekStart} to ${data.weekEnd}

Daily Summaries:
${data.days.map(d => `${d.day}: ${d.calories} cal, ${d.protein}g protein`).join('\n')}

Averages:
- Calories: ${data.avgCalories} / ${data.targetCalories}
- Protein: ${data.avgProtein}g / ${data.targetProtein}g
- Consistency: ${data.daysLogged}/7 days logged

Provide a brief weekly recap with:
1. One highlight (something positive)
2. One observation (pattern or trend)
3. One gentle suggestion for next week

Be warm, encouraging, never judgmental. Never use "failed", "cheated", "warning".

Respond in JSON format:
{
  "highlight": "...",
  "observation": "...",
  "suggestion": "..."
}`;
};
```

### Caching Strategy

```typescript
// Cache keys
const CACHE_KEYS = {
  dailyInsight: 'llm_daily_insight',
  weeklyRecap: 'llm_weekly_recap',
};

// TTLs
const DAILY_INSIGHT_TTL = 4 * 60 * 60 * 1000;  // 4 hours
const WEEKLY_RECAP_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedInsight {
  text: string;
  generatedAt: number;
}

const getCachedInsight = async (key: string): Promise<CachedInsight | null> => {
  const stored = await AsyncStorage.getItem(key);
  return stored ? JSON.parse(stored) : null;
};

const isStale = (cached: CachedInsight, ttl: number): boolean => {
  return Date.now() - cached.generatedAt > ttl;
};

const cacheInsight = async (key: string, text: string) => {
  await AsyncStorage.setItem(key, JSON.stringify({
    text,
    generatedAt: Date.now(),
  }));
};
```

### EnableAIPrompt Component

If it doesn't exist, create a shared component:

```typescript
// src/components/insights/EnableAIPrompt.tsx

interface Props {
  onEnable: () => void;
  title?: string;
  description?: string;
}

export const EnableAIPrompt: React.FC<Props> = ({
  onEnable,
  title = "Enable AI Insights",
  description = "Download a 1GB AI model for personalized insights. Works offline."
}) => (
  <View style={styles.container}>
    <Icon name="sparkles" size={24} color={colors.sage} />
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
    <Button 
      title="Download Model" 
      onPress={onEnable}
      variant="secondary"
    />
  </View>
);
```

### UX States (from chatbot/AI UX research)

| State | Widget Display |
|-------|----------------|
| Model not downloaded | "Enable AI Insights" prompt with download button |
| Downloading | Progress bar with "Downloading AI Model..." |
| Model ready, cache empty | Loading skeleton while generating |
| Model ready, cache valid | Instant insight display (from cache) |
| LLM failure | Fallback template insight (no error to user) |

### Voice Guidelines ("Nourished Calm")
All LLM prompts must specify this voice:
- ✅ Use: "nutrient gaps", "eating window", "great consistency"
- ❌ Avoid: "deficiencies", "failed", "cheated", "warning"
- Focus on positives first
- Gentle suggestions, not commands

**Example Good Insights:**
- "Great protein intake today! Your body has what it needs for recovery."
- "You're close to your hydration goal — one more glass would be perfect."
- "Balanced macros today. This kind of consistency adds up over time."

### Acceptance Criteria
- [ ] AIDailyInsightWidget uses LLMService when model is ready
- [ ] AIDailyInsightWidget shows "Enable AI" prompt when model not downloaded
- [ ] AIDailyInsightWidget falls back to templates if LLM fails
- [ ] AIDailyInsightWidget caches insights (4-hour TTL)
- [ ] WeeklyRecapWidget uses LLMService when model is ready
- [ ] WeeklyRecapWidget shows "Enable AI" prompt when model not downloaded
- [ ] WeeklyRecapWidget falls back to templates if LLM fails
- [ ] WeeklyRecapWidget caches recap (weekly TTL)
- [ ] LLM inference completes in < 10 seconds on modern devices
- [ ] Widgets show loading state during generation
- [ ] Cached results display instantly
- [ ] No errors shown to user (graceful degradation)
- [ ] Remove misleading comments about "cloud LLM"

### Test Cases
1. **Fresh install:** Open dashboard → See "Enable AI" prompt → Tap download → Progress shows → Model downloads → Insight generates
2. **Model ready, empty cache:** Open dashboard → Loading skeleton → Insight appears (contextual to data)
3. **Cache valid:** Open dashboard → Insight appears instantly
4. **Cache expired:** Wait 4+ hours → Open dashboard → New insight generates
5. **LLM failure:** Corrupt model → Widget shows fallback insight → No error to user
```

---

## Prompt 4: Micronutrient USDA Integration

### Copy this prompt into Claude Code IDE:

```
## Task: Integrate USDA FoodData Central API for Micronutrients

### Context
The micronutrient tracking system is complete:
- ✅ 82 nutrients defined (vitamins, minerals, amino acids, fatty acids)
- ✅ Gender/age/life-stage RDA tables
- ✅ Database schema with `food_item_nutrients` junction table
- ✅ `micronutrientStore.ts` calculates daily intake
- ✅ UI widget shows top 3 gaps

**The problem:** Only 10 seed foods have micronutrient data. Real-world logged foods have zero micronutrient data.

### What to Implement
Integrate USDA FoodData Central API to populate micronutrient data for logged foods.

### USDA API Overview

**Base URL:** `https://api.nal.usda.gov/fdc/v1`
**API Key:** Free — register at https://fdc.nal.usda.gov/api-key-signup.html
**Rate Limits:** 3,600 requests/hour per key

**Key Endpoints:**
| Endpoint | Purpose |
|----------|---------|
| `/foods/search` | Search foods by name |
| `/food/{fdcId}` | Get full nutrient data for a food |
| `/foods/list` | Paginated browse |

**Data Types (prioritize for micronutrient accuracy):**
| Type | Foods | Micronutrient Coverage |
|------|-------|----------------------|
| Foundation | ~400 core foods | Complete (all 82+) — BEST |
| SR Legacy | ~8,000 standard reference | Complete |
| Branded | ~1.5M products | Partial (varies) — LEAST |

### Phase 1: Infrastructure (Day 1)

**Create `src/services/usda/USDAFoodService.ts`:**

```typescript
interface USDAFoodService {
  searchFoods(query: string, options?: SearchOptions): Promise<USDASearchResult[]>;
  getFoodDetails(fdcId: number): Promise<USDAFoodDetail>;
  getFoodDetailsBatch(fdcIds: number[]): Promise<USDAFoodDetail[]>;
  mapNutrients(usdaNutrients: USDANutrient[]): MicronutrientData;
}

interface SearchOptions {
  dataTypes?: ('Foundation' | 'SR Legacy' | 'Branded')[];
  pageSize?: number;
  pageNumber?: number;
}

interface USDASearchResult {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
}

interface USDAFoodDetail {
  fdcId: number;
  description: string;
  nutrients: USDANutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
}

interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}
```

**Nutrient ID Mapping (USDA ID → your nutrient key):**

```typescript
const USDA_NUTRIENT_MAP: Record<number, string> = {
  // Vitamins
  318: 'vitaminA',        // IU
  401: 'vitaminC',        // mg
  324: 'vitaminD',        // IU
  323: 'vitaminE',        // mg
  430: 'vitaminK',        // µg
  404: 'vitaminB1',       // Thiamin, mg
  405: 'vitaminB2',       // Riboflavin, mg
  406: 'vitaminB3',       // Niacin, mg
  410: 'vitaminB5',       // Pantothenic acid, mg
  415: 'vitaminB6',       // mg
  417: 'vitaminB9',       // Folate, µg
  418: 'vitaminB12',      // µg
  
  // Minerals
  301: 'calcium',         // mg
  303: 'iron',            // mg
  304: 'magnesium',       // mg
  305: 'phosphorus',      // mg
  306: 'potassium',       // mg
  307: 'sodium',          // mg
  309: 'zinc',            // mg
  312: 'copper',          // mg
  315: 'manganese',       // mg
  317: 'selenium',        // µg
  
  // Fatty Acids
  606: 'saturatedFat',    // g
  645: 'monounsaturatedFat', // g
  646: 'polyunsaturatedFat', // g
  675: 'omega3ALA',       // g (18:3)
  629: 'omega3EPA',       // g (20:5)
  621: 'omega3DHA',       // g (22:6)
  
  // Other
  291: 'fiber',           // g
  269: 'sugar',           // g
  601: 'cholesterol',     // mg
  262: 'caffeine',        // mg
  421: 'choline',         // mg
};
```

**API Key Management:**

```typescript
// src/config/api.ts
export const USDA_API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY;

export const usdaConfig = {
  baseUrl: 'https://api.nal.usda.gov/fdc/v1',
  apiKey: USDA_API_KEY,
};
```

**Caching Strategy:**

```typescript
interface USDACache {
  // Search results: 24 hour TTL (food names don't change often)
  searchCache: Map<string, { results: USDASearchResult[], timestamp: number }>;
  
  // Food details: 30 day TTL (nutrients don't change)
  detailsCache: Map<number, { details: USDAFoodDetail, timestamp: number }>;
}

// Persist details cache to SQLite for offline access
```

**Error Handling:**

```typescript
enum USDAError {
  RateLimited = 'RATE_LIMITED',
  InvalidApiKey = 'INVALID_API_KEY',
  FoodNotFound = 'FOOD_NOT_FOUND',
  NetworkError = 'NETWORK_ERROR',
}

// Graceful degradation — always allow logging even if API fails
const getFoodDetails = async (fdcId: number): Promise<USDAFoodDetail | null> => {
  try {
    return await usdaFoodService.getFoodDetails(fdcId);
  } catch (error) {
    if (error.code === USDAError.RateLimited) {
      // Queue for later enrichment
      await enrichmentQueue.add({ fdcId, retryAfter: Date.now() + 60000 });
    }
    return null; // Food logs without micronutrients
  }
};
```

### Phase 2: Search Integration (Day 1-2)

**Database Change:**
```sql
ALTER TABLE food_items ADD COLUMN usda_fdc_id INTEGER;
```

**Enhanced Food Search (`src/app/add-food/index.tsx`):**

```typescript
const searchResults = await Promise.all([
  localFoodRepository.search(query),
  openFoodFactsService.search(query),
  usdaFoodService.searchFoods(query, { 
    dataTypes: ['Foundation', 'SR Legacy'], // Skip Branded for better data
    pageSize: 10 
  }),
]);

// Merge, dedupe, and rank results
// Prioritize USDA Foundation foods for micronutrient accuracy
```

**Search Result UI Enhancement (UX from Cronometer research):**

```
┌─────────────────────────────────────┐
│ Chicken Breast, Grilled        USDA │
│ 165 cal · 31g protein          ✓ 82 │  ← 82 micronutrients
│ Foundation Food                     │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Tyson Chicken Breast               │
│ 110 cal · 23g protein          ✓ 12 │  ← Only 12 nutrients
│ Branded                             │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Grilled Chicken Breast             │
│ 170 cal · 30g protein          ─    │  ← No micronutrient data
│ Open Food Facts                     │
└─────────────────────────────────────┘
```

### Phase 3: Logging Integration (Day 2)

**When logging USDA food:**

```typescript
const logFood = async (food: FoodItem, servings: number) => {
  // If food has USDA fdcId, fetch full nutrients
  if (food.fdcId) {
    const details = await usdaFoodService.getFoodDetails(food.fdcId);
    if (details) {
      const micronutrients = usdaFoodService.mapNutrients(details.nutrients);
      
      // Store micronutrients with the log entry
      await foodLogRepository.create({
        ...foodLog,
        micronutrients,
      });
      
      // Cache for future lookups
      await micronutrientRepository.storeFoodNutrients(food.id, micronutrients);
    }
  }
  
  // Existing logging logic continues (macros always work)
};
```

### Phase 4: Polish (Day 3)

**Food Detail Screen Enhancement:**

```
┌─────────────────────────────────────┐
│ ← Chicken Breast, Grilled           │
├─────────────────────────────────────┤
│ Per 100g serving                    │
│                                     │
│ Calories     165                    │
│ Protein      31g                    │
│ Carbs        0g                     │
│ Fat          3.6g                   │
│                                     │
│ ──────────────────────────          │
│                                     │
│ Micronutrients                [82]  │  ← Badge showing nutrient count
│                                     │
│ 🟢 Vitamin B3 (Niacin)    13.4mg  167%  │  ← Top 3 nutrients
│ 🟢 Vitamin B6             0.9mg   69%   │
│ 🟢 Selenium               27.6µg  50%   │
│                                     │
│ [View All Nutrients →]              │  ← Premium feature
│                                     │
├─────────────────────────────────────┤
│          [Log This Food]            │
└─────────────────────────────────────┘
```

**"View All Nutrients" Screen (Premium):**
Gate with `LockedContentArea` or `PremiumGate` — shows all 82 nutrients grouped by category.

### Copy & Messaging

| Context | Text |
|---------|------|
| USDA badge | "USDA" |
| Source line | "Data from USDA FoodData Central" |
| Foundation badge | "Foundation Food" |
| Nutrient count | "82 nutrients" or "✓ 82" |
| No micronutrients | "Micronutrient data not available" |
| Partial data | "12 of 82 nutrients available" |
| Fetching | "Loading nutrient details..." |

### Acceptance Criteria

**Functional:**
- [ ] USDA API key configured and working
- [ ] Food search includes USDA results
- [ ] USDA foods show micronutrient count badge
- [ ] Logging USDA food stores micronutrients
- [ ] Micronutrient widget shows real data (not just seed foods)
- [ ] Daily micronutrient summary reflects logged foods
- [ ] Full nutrient list viewable for USDA foods (premium)

**Data Quality:**
- [ ] Foundation foods have 80+ nutrients populated
- [ ] SR Legacy foods have 50+ nutrients populated
- [ ] Nutrient mapping covers all 82 defined nutrients
- [ ] Unit conversions are correct (IU ↔ µg where needed)

**Performance:**
- [ ] Search results return in < 2 seconds
- [ ] Nutrient fetch doesn't block food logging
- [ ] API responses cached appropriately
- [ ] Rate limiting handled gracefully

**Offline:**
- [ ] Cached USDA foods work offline
- [ ] Previously logged foods show micronutrients offline
- [ ] Graceful degradation when API unavailable

### Test Cases
1. **Search USDA food:** Search "chicken breast" → See USDA Foundation result with "✓ 82" badge
2. **Log USDA food:** Log chicken from USDA → Check micronutrient widget updates
3. **Mixed logging:** Log USDA food + Open Food Facts food → Totals reflect partial data
4. **Offline:** Log USDA food while online → Go offline → View food → Micronutrients show from cache
5. **API failure:** Simulate network error → Log food → Should still log (without micronutrients)

### Notes
- USDA API is free but requires registration
- Foundation foods are highest quality — prioritize in search results
- Branded foods often have minimal nutrient data
- Unit conversions: USDA uses IU for vitamins A/D, you may use µg
- Some nutrients have multiple forms (folate, folic acid, DFE) — map carefully
```

---

## Prompt 5: GPT Nutrition Chat

### Copy this prompt into Claude Code IDE:

```
## Task: Build GPT-Powered Nutrition Chat

### Context
The app has:
- OpenAI client in `openAIVisionService.ts` (for photo recognition)
- Local LLM via `LLMService.ts` (SmolLM2 for insights)
- Voice assistant for Siri/Google shortcuts (command-based, not conversational)

**No chat feature exists** — this is a new premium feature.

### What to Build
A conversational AI nutrition assistant that helps users with meal planning, nutrition questions, and personalized advice using their logged data as context.

### UX Research Summary

**From competitor analysis:**
- ChatGPT: Great conversation flow, but generic (no user data)
- MyFitnessPal AI: Has food log context, but feels robotic
- Noom: Warm, supportive tone, but human coaches not AI

**From chatbot UX research:**
- Typing indicators are essential (users need to know it's working)
- Message streaming creates better perceived performance
- Quick reply suggestions reduce friction
- Familiar messaging UI (bubbles, timestamps) feels natural
- Graceful errors > technical error messages

**What users want (from Reddit research):**
- "What should I eat for dinner to hit my protein goal?"
- "Why am I always hungry in the afternoon?"
- "Is this meal balanced?"
- "Am I eating enough fiber?"

**What users hate:**
- Judgment about food choices
- Generic responses that ignore their data
- Unsolicited weight loss advice

### Feature Architecture

```
src/
├── features/
│   └── chat/
│       ├── screens/
│       │   └── ChatScreen.tsx          # Main chat UI
│       ├── components/
│       │   ├── ChatBubble.tsx          # Message bubble
│       │   ├── TypingIndicator.tsx     # "..." animation
│       │   ├── QuickReplies.tsx        # Suggested follow-ups
│       │   ├── ChatInput.tsx           # Text input + send
│       │   └── WelcomeMessage.tsx      # Onboarding prompt
│       ├── services/
│       │   ├── chatService.ts          # OpenAI chat completion
│       │   └── contextBuilder.ts       # Build system prompt with user data
│       ├── stores/
│       │   └── chatStore.ts            # Conversation state (Zustand)
│       └── types/
│           └── chat.ts                 # Message types
├── app/
│   └── chat/
│       └── index.tsx                   # Route
```

### Phase 1: Infrastructure (Day 1)

**Types (`src/features/chat/types/chat.ts`):**

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
}

interface ChatSession {
  id: string;
  messages: ChatMessage[];
  startedAt: Date;
  context: ChatContext;
}

interface ChatContext {
  todayLog: DailyLogSummary;
  weeklyAverage: WeeklyAverage;
  goals: UserGoals;
  preferences: DietaryPreferences;
  recentFoods: string[];
}

interface QuickReply {
  text: string;       // What user sees
  prompt: string;     // What actually gets sent
}
```

**Chat Service (`src/features/chat/services/chatService.ts`):**

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

export const chatService = {
  async sendMessage(
    messages: ChatMessage[],
    context: ChatContext,
    options: { stream?: boolean; model?: 'gpt-4o-mini' | 'gpt-4o' } = {}
  ): Promise<string | AsyncIterable<string>> {
    const { stream = true, model = 'gpt-4o-mini' } = options;
    
    const systemPrompt = buildSystemPrompt(context);
    
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 500,
      temperature: 0.7,
      stream,
    });
    
    if (stream) {
      return response; // Return async iterator for streaming
    }
    
    return response.choices[0].message.content;
  },
};
```

**System Prompt Builder (`src/features/chat/services/contextBuilder.ts`):**

```typescript
export const buildSystemPrompt = (context: ChatContext): string => {
  return `You are a supportive nutrition assistant in the NutritionRx app. Your personality is "Nourished Calm" — warm, encouraging, never judgmental.

## Your Capabilities
- Suggest meals based on remaining macros
- Answer nutrition questions
- Analyze eating patterns from logged data
- Provide recipe ideas that fit goals
- Help with goal coaching

## Your Boundaries
- You are NOT a doctor. For medical questions, recommend consulting a healthcare provider.
- You CANNOT diagnose nutrient deficiencies — only show "nutrient gaps"
- You will NOT give eating disorder advice — if someone seems to struggle, gently suggest professional support
- You will NOT recommend extreme restriction or dangerous diets

## User's Current Data

**Today's Log:**
- Calories: ${context.todayLog.calories} / ${context.todayLog.calorieTarget} (${Math.round(context.todayLog.calories / context.todayLog.calorieTarget * 100)}%)
- Protein: ${context.todayLog.protein}g / ${context.todayLog.proteinTarget}g
- Carbs: ${context.todayLog.carbs}g / ${context.todayLog.carbTarget}g
- Fat: ${context.todayLog.fat}g / ${context.todayLog.fatTarget}g
- Water: ${context.todayLog.water} / ${context.todayLog.waterTarget} glasses

**This Week's Averages:**
- Average calories: ${context.weeklyAverage.calories}
- Average protein: ${context.weeklyAverage.protein}g
- Days logged: ${context.weeklyAverage.daysLogged}/7

**User's Goals:** ${context.goals.primaryGoal}

**Dietary Preferences:** ${context.preferences.restrictions.join(', ') || 'None specified'}

**Recent Foods:** ${context.recentFoods.slice(0, 5).join(', ')}

## Voice Guidelines
- Be warm and supportive
- Focus on positives first
- Use "nutrient gaps" not "deficiencies"
- Use "eating window" not "fasting"
- Never say "failed", "cheated", or "warning"
- Keep responses concise (2-4 sentences for simple questions)
- Use bullet points sparingly (only for lists of 3+ items)

## Response Format
Answer the user's question directly. If you suggest foods or meals, make them specific and actionable. Always tie recommendations back to their actual data when relevant.`;
};
```

### Phase 2: UI Components (Day 2)

**ChatScreen Layout:**

```
┌─────────────────────────────────────────┐
│ ← Nutrition Assistant            🔒    │  ← Premium badge
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │ 👋 Hi! I'm your nutrition       │   │  ← Welcome message
│  │ assistant.                       │   │
│  │                                  │   │
│  │ I can help you with:            │   │
│  │ • Meal suggestions based on     │   │
│  │   your remaining macros         │   │
│  │ • Answering nutrition questions │   │
│  │ • Understanding your patterns   │   │
│  │                                  │   │
│  │ What would you like to know?    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ What should I eat for dinner?   │   │  ← Quick reply buttons
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ How am I doing this week?       │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ Am I getting enough protein?    │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────┐  [➤]  │  ← Input field
│ │ Ask me anything...          │       │
│ └─────────────────────────────┘       │
└─────────────────────────────────────────┘
```

**ChatBubble Component:**

```typescript
// User messages: right-aligned, brand color background
// Assistant messages: left-aligned, light background
// Timestamps below each bubble
// Markdown support for formatting

interface ChatBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}
```

**TypingIndicator Component:**

```typescript
// Animated dots: "•••"
// Each dot fades in/out sequentially, 300ms between
// Shows while waiting for response or during streaming
```

**Quick Replies:**

| Display Text | Actual Prompt |
|--------------|---------------|
| "What should I eat for dinner?" | "Based on what I've eaten today, what should I eat for dinner to hit my macro goals?" |
| "How am I doing this week?" | "Give me a summary of my nutrition this week. What's going well and what could improve?" |
| "Am I getting enough protein?" | "Am I eating enough protein? How does my intake compare to my goal?" |
| "What's a healthy snack?" | "I need a snack. What's something healthy that fits my remaining macros?" |

### Phase 3: Context Integration (Day 3)

Wire up real user data into the context:

```typescript
// In ChatScreen.tsx
const { dailyLog } = useDailyLogStore();
const { goals } = useGoalsStore();
const { preferences } = usePreferencesStore();
const { weeklyData } = useWeeklyStore();

const context: ChatContext = {
  todayLog: {
    calories: dailyLog.totalCalories,
    calorieTarget: goals.calorieTarget,
    protein: dailyLog.totalProtein,
    proteinTarget: goals.proteinTarget,
    // ... etc
  },
  weeklyAverage: {
    calories: weeklyData.avgCalories,
    protein: weeklyData.avgProtein,
    daysLogged: weeklyData.daysWithLogs,
  },
  goals: {
    primaryGoal: goals.primaryGoal,
  },
  preferences: {
    restrictions: preferences.dietaryRestrictions,
  },
  recentFoods: dailyLog.foods.slice(0, 10).map(f => f.name),
};
```

### Phase 4: Polish (Day 4)

**Streaming Support:**

```typescript
const sendMessage = async (text: string) => {
  // Add user message immediately
  addMessage({ role: 'user', content: text, status: 'sent' });
  
  // Start streaming response
  setIsGenerating(true);
  let fullResponse = '';
  
  try {
    const stream = await chatService.sendMessage(messages, context, { stream: true });
    
    // Create placeholder assistant message
    const assistantMessageId = addMessage({ 
      role: 'assistant', 
      content: '', 
      status: 'sending' 
    });
    
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      fullResponse += delta;
      updateMessage(assistantMessageId, { content: fullResponse });
    }
    
    updateMessage(assistantMessageId, { status: 'sent' });
  } catch (error) {
    handleError(error);
  } finally {
    setIsGenerating(false);
  }
};
```

**Error Messages:**

| Error | User Message |
|-------|--------------|
| Network error | "I couldn't connect. Please check your internet and try again." |
| API error | "Something went wrong on my end. Please try again in a moment." |
| Rate limited | "I need a short break. Please try again in a minute." |
| Offline | "Chat requires an internet connection. Please connect and try again." |

**Safety Detection:**

```typescript
const detectSafetyTriggers = (message: string): SafetyTrigger | null => {
  const lowerMessage = message.toLowerCase();
  
  // Eating disorder indicators
  const edKeywords = ['purge', 'binge', 'restrict', 'hate my body', 'eating disorder'];
  if (edKeywords.some(k => lowerMessage.includes(k))) {
    return 'eating_disorder';
  }
  
  // Medical question indicators
  const medicalKeywords = ['diagnose', 'deficiency', 'prescribe', 'medication'];
  if (medicalKeywords.some(k => lowerMessage.includes(k))) {
    return 'medical';
  }
  
  return null;
};

// Safety responses (added to system prompt handling)
const safetyResponses = {
  eating_disorder: "I want to make sure you're okay. If you're struggling with your relationship with food, the National Eating Disorders Association helpline is available at 1-800-931-2237. I'm here to support healthy eating, and I care about your wellbeing.",
  medical: "I'm not a medical professional, so I can't give medical advice. For health concerns, please consult a doctor or registered dietitian. Is there something else I can help with?",
};
```

**Premium Gating:**

```typescript
// Wrap ChatScreen with PremiumGate
export default function ChatRoute() {
  return (
    <PremiumGate
      feature="nutrition_chat"
      context="insights"
      fallback={<ChatPreview />}
    >
      <ChatScreen />
    </PremiumGate>
  );
}

// Or use soft gate: show first 3 messages free, then paywall
```

### Phase 5: Navigation & Testing (Day 5)

**Add navigation entry point:**
- Tab bar icon (if chat is primary feature)
- Or FAB on dashboard
- Or menu item in profile/more section

### Cost Considerations

| Model | Input | Output | Avg Conversation | Cost |
|-------|-------|--------|------------------|------|
| GPT-4o-mini | $0.15/1M | $0.60/1M | ~2,000 tokens | $0.001-0.002 |

**Cost Control Options:**
1. Message limits: 50 messages/day for premium
2. Context truncation: Last 10 messages only
3. Response length: Cap at 500 tokens
4. Model tiering: GPT-4o-mini default, GPT-4o for "deep analysis"

### Acceptance Criteria

**Functional:**
- [ ] Chat screen accessible from navigation
- [ ] Welcome message displays on first visit
- [ ] User can type and send messages
- [ ] AI responds with personalized content
- [ ] Responses use user's actual food log data
- [ ] Typing indicator shows during generation
- [ ] Quick reply suggestions work
- [ ] Chat history persists within session
- [ ] Chat clears on new session

**Premium:**
- [ ] Feature is premium-gated
- [ ] Non-premium users see paywall
- [ ] Premium users can chat freely

**Performance:**
- [ ] First response in < 5 seconds
- [ ] Streaming displays tokens as they arrive
- [ ] UI remains responsive during generation
- [ ] Offline state handled gracefully

**Safety:**
- [ ] Medical question detection works
- [ ] ED trigger detection works
- [ ] Appropriate resources provided

**UX:**
- [ ] Keyboard doesn't cover input
- [ ] Auto-scroll to bottom on new message
- [ ] Send button disabled while generating
- [ ] Clear visual distinction user vs assistant

### Test Cases
1. **Happy path:** Premium user → Open chat → See welcome → Tap quick reply → Response appears
2. **Streaming:** Send message → See typing indicator → See text appear word by word
3. **Personalized:** Ask "How am I doing?" → Response references actual calorie/protein numbers
4. **Safety:** Type ED-related message → Get supportive response with resources
5. **Error:** Turn off internet → Send message → See friendly error message
6. **Premium gate:** Non-premium user → Try to open chat → See paywall

### Notes
- Start with GPT-4o-mini for cost efficiency
- System prompt is critical — iterate on it based on response quality
- Monitor for prompt injection attempts
- Consider logging conversations (anonymized) for improvement
- Track metrics: messages per session, topics asked, user satisfaction
```

---

## Additional Notes for All Prompts

### Design Philosophy Reference
All features should follow the "Nourished Calm" design language:
- **Colors:** Sage green (#7C9A7C), Soft cream (#FAF8F5), Terracotta (#C4A484)
- **Voice:** Warm, supportive, never judgmental
- **Language:** Use "nutrient gaps" not "deficiencies", "eating window" not "fasting"

### Technical Standards
- TypeScript strict mode
- Zustand for state management
- SQLite via repositories for persistence
- Expo Router for navigation
- Unit tests for services, integration tests for flows

### Premium Components Available
```
src/components/premium/
├── PremiumGate.tsx          # Wraps entire screens
├── LockedContentArea.tsx    # Wraps sections within screens
├── PremiumBanner.tsx        # Promotional banner
├── PremiumBadge.tsx         # Small lock icon badge
├── LockedOverlay.tsx        # Overlay with blur
└── PremiumSettingsRow.tsx   # Settings row with lock
```

---

## Recommended Implementation Order

1. **Macro Cycling Settings Link** (< 1 hour) — Unblocks existing feature
2. **Restaurant Premium Enforcement** (< 1 hour) — Fixes revenue leak
3. **LLM Widget Integration** (4-6 hours) — Delivers promised AI features
4. **Micronutrient USDA Integration** (2-3 days) — Makes existing feature useful
5. **GPT Nutrition Chat** (3-5 days) — Major differentiator
