# NutritionRx Goals Feature Specification

## Overview

The Goals feature provides personalized nutrition guidance that adapts to YOUR body — not generic formulas. By tracking what you eat and how your weight responds, NutritionRx learns your unique metabolism and fine-tunes your targets over time.

**Key Principle:** Your body is unique. Your plan should be too.

---

## Feature Philosophy

### Why Adaptive?

Traditional calorie calculators use static formulas that are routinely off by 300-350 calories/day. This leads to:
- Frustration when expected results don't materialize
- Yo-yo dieting from incorrect targets
- Users blaming themselves when it's the math that's wrong

**Our approach:** Use YOUR actual data to understand how your body responds, then adjust targets accordingly.

```
Traditional: Estimated burn = Formula (guess)
NutritionRx: Actual burn = What you ate − How your weight changed (measured)
```

### Optional by Design

Goals are **optional**. Users who just want to track what they eat without targets can skip the onboarding flow entirely. The app works perfectly as a simple food diary.

---

## 1. Data Model

### 1.1 UserProfile Entity

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | Primary key (singleton) |
| sex | enum | Male / Female |
| dateOfBirth | date | Required for age calculation |
| heightCm | number | Height in centimeters |
| activityLevel | enum | ActivityLevel |
| hasCompletedOnboarding | boolean | Default false |
| onboardingSkipped | boolean | Default false |
| createdAt | timestamp | Auto-set |
| updatedAt | timestamp | Auto-updated |

### 1.2 Goal Entity

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | Primary key |
| type | enum | GoalType (lose / maintain / gain) |
| targetWeightKg | number | Nullable (optional for user) |
| targetRatePercent | number | % of bodyweight per week (0.25, 0.5, 0.75, 1.0) |
| startDate | date | When goal was created |
| startWeightKg | number | Weight at goal creation |
| isActive | boolean | Only one active goal at a time |
| completedAt | timestamp | Nullable, when goal was achieved/abandoned |
| createdAt | timestamp | Auto-set |
| updatedAt | timestamp | Auto-updated |

### 1.3 WeeklyReflection Entity

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | Primary key |
| goalId | UUID | FK → Goal |
| weekNumber | number | 1, 2, 3... since goal start |
| weekStartDate | date | Monday of the week |
| weekEndDate | date | Sunday of the week |
| avgCalorieIntake | number | Average daily calories this week |
| startTrendWeight | number | Trend weight at week start |
| endTrendWeight | number | Trend weight at week end |
| weightChangeKg | number | Computed: end - start |
| estimatedDailyBurn | number | Back-calculated from data |
| previousTargetCalories | number | What we recommended last week |
| newTargetCalories | number | New recommendation |
| previousMacros | JSON | { protein, carbs, fat } |
| newMacros | JSON | { protein, carbs, fat } |
| wasAccepted | boolean | Did user accept the adjustment? |
| userNotes | string | Nullable |
| createdAt | timestamp | Auto-set |

### 1.4 DailyMetabolism Entity (Computed)

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | Primary key |
| date | date | Unique |
| trendWeight | number | Smoothed weight for this day |
| calorieIntake | number | Total logged calories |
| estimatedBurn | number | Running estimate of daily burn |
| dataQuality | enum | Good / Partial / Insufficient |
| createdAt | timestamp | Auto-set |
| updatedAt | timestamp | Auto-updated |

### 1.5 Enums

```typescript
enum GoalType {
  Lose = 'lose',
  Maintain = 'maintain',
  Gain = 'gain',
}

enum ActivityLevel {
  Sedentary = 'sedentary',           // 1.2
  LightlyActive = 'lightly_active',   // 1.375
  ModeratelyActive = 'moderately_active', // 1.55
  VeryActive = 'very_active',         // 1.725
  ExtremelyActive = 'extremely_active', // 1.9
}

enum DataQuality {
  Good = 'good',           // 5+ days logged this week
  Partial = 'partial',     // 3-4 days logged
  Insufficient = 'insufficient', // <3 days logged
}
```

---

## 2. Onboarding Flow

### 2.1 Flow Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      WELCOME SCREEN                         │
│                                                             │
│  "NutritionRx adapts to YOU"                               │
│                                                             │
│  We'll create a personalized plan based on your body,      │
│  then fine-tune it as we learn how you respond.            │
│                                                             │
│  • Track calories and macros                               │
│  • Get personalized daily targets                          │
│  • Watch your plan adapt over time                         │
│                                                             │
│  [Let's Get Started]                                       │
│                                                             │
│  "Just want to track food? You can skip this."            │
│  [Skip for now →]                                          │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Onboarding Steps (If User Proceeds)

#### Step 1: Basic Info
```
┌─────────────────────────────────────────────────────────────┐
│  Step 1 of 6                    ████░░░░░░░░░░░░            │
│                                                             │
│  Let's get to know you                                     │
│                                                             │
│  I am...                                                   │
│  ┌─────────────┐  ┌─────────────┐                          │
│  │    Male     │  │   Female    │                          │
│  └─────────────┘  └─────────────┘                          │
│                                                             │
│  When were you born?                                       │
│  ┌─────────────────────────────┐                           │
│  │  March 15, 1990             │                           │
│  └─────────────────────────────┘                           │
│                                                             │
│  [Continue]                                                │
└─────────────────────────────────────────────────────────────┘
```

#### Step 2: Body Stats
```
┌─────────────────────────────────────────────────────────────┐
│  Step 2 of 6                    ████████░░░░░░░░            │
│                                                             │
│  Your current stats                                        │
│                                                             │
│  Height                                                    │
│  ┌─────────────────────────────┐                           │
│  │  5' 10" (178 cm)            │  [ft/in ↔ cm]             │
│  └─────────────────────────────┘                           │
│                                                             │
│  Current Weight                                            │
│  ┌─────────────────────────────┐                           │
│  │  185 lbs (84 kg)            │  [lbs ↔ kg]               │
│  └─────────────────────────────┘                           │
│                                                             │
│  [Continue]                                                │
└─────────────────────────────────────────────────────────────┘
```

#### Step 3: Activity Level
```
┌─────────────────────────────────────────────────────────────┐
│  Step 3 of 6                    ████████████░░░░            │
│                                                             │
│  How active are you?                                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ○  Not very active                                 │   │
│  │     Desk job, not much movement                     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ○  A little active                                 │   │
│  │     Some walking, light exercise 1-2x/week          │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ●  Fairly active                       ← default   │   │
│  │     Regular exercise 3-4x/week                      │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ○  Very active                                     │   │
│  │     Hard workouts 5-6x/week                         │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ○  Extremely active                                │   │
│  │     Intense daily training or physical job          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ℹ️ Not sure? Start lower — we'll adjust based on         │
│     how your body actually responds.                       │
│                                                             │
│  [Continue]                                                │
└─────────────────────────────────────────────────────────────┘
```

#### Step 4: Goal Selection
```
┌─────────────────────────────────────────────────────────────┐
│  Step 4 of 6                    ████████████████░░          │
│                                                             │
│  What's your goal?                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ↓  Lose weight                                     │   │
│  │     Feel lighter, burn fat                          │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ↔  Stay where I am                                 │   │
│  │     Maintain my current weight                      │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ↑  Build up                                        │   │
│  │     Gain muscle, get stronger                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Continue]                                                │
└─────────────────────────────────────────────────────────────┘
```

#### Step 5: Your Pace (if Lose/Gain)
```
┌─────────────────────────────────────────────────────────────┐
│  Step 5 of 6                    ████████████████████░░      │
│                                                             │
│  What pace feels right for you?                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ○  Gentle — take it slow                           │   │
│  │     ~0.5 lbs/week • Easiest to sustain              │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ●  Steady — balanced approach       ← recommended  │   │
│  │     ~1 lb/week • Works for most people              │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ○  Ambitious — push a bit harder                   │   │
│  │     ~1.5 lbs/week • Requires more discipline        │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ○  Aggressive — fastest option                     │   │
│  │     ~2 lbs/week • Harder to maintain                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ℹ️ Slower isn't worse. Gentle changes tend to stick.     │
│                                                             │
│  [Continue]                                                │
└─────────────────────────────────────────────────────────────┘
```

#### Step 5b: Goal Weight (Optional)
```
┌─────────────────────────────────────────────────────────────┐
│  Step 5b of 6                   ████████████████████░░      │
│                                                             │
│  Do you have a goal weight in mind?                        │
│                                                             │
│  ┌─────────────────────────────┐                           │
│  │  165 lbs (75 kg)            │                           │
│  └─────────────────────────────┘                           │
│                                                             │
│  At your current pace, you'll get there in about:         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  ~14 weeks (late March)                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Continue]    [Skip — I'll decide later]                  │
└─────────────────────────────────────────────────────────────┘
```

#### Step 6: Your Plan
```
┌─────────────────────────────────────────────────────────────┐
│  Step 6 of 6                    ████████████████████████    │
│                                                             │
│  Here's your starting plan                                 │
│                                                             │
│  Based on your info, we estimate your body burns           │
│  around 2,450 calories on a typical day.                   │
│                                                             │
│  To lose about 1 lb per week:                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Daily Target           1,950 cal                   │   │
│  │                                                     │   │
│  │  Protein                170g  (35%)                 │   │
│  │  Carbs                  175g  (36%)                 │   │
│  │  Fat                    65g   (29%)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ℹ️ This is your starting point. As you log food and      │
│     weight, we'll learn how YOUR body responds and        │
│     fine-tune these numbers for you.                       │
│                                                             │
│  [Start Tracking]                                          │
│                                                             │
│  ⚙️ [Adjust manually]                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Core Calculations

### 3.1 BMR Calculation (Mifflin-St Jeor)

```typescript
/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
 * This is the most accurate widely-used BMR formula
 */
function calculateBMR(
  sex: 'male' | 'female',
  weightKg: number,
  heightCm: number,
  ageYears: number
): number {
  // BMR = (10 × weight in kg) + (6.25 × height in cm) − (5 × age) + s
  // where s = +5 for males, −161 for females
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears);
  return sex === 'male' ? base + 5 : base - 161;
}
```

### 3.2 Activity Multipliers

```typescript
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

/**
 * Estimate daily calorie burn (TDEE)
 * Note: This is just an initial estimate — we'll refine it with real data
 */
function estimateDailyBurn(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}
```

### 3.3 Target Calories from Goal

```typescript
const CALORIES_PER_KG = 7700; // Approximate calories in 1 kg of body weight
const CALORIES_PER_LB = 3500; // Approximate calories in 1 lb of body weight

interface CalorieTargetResult {
  targetCalories: number;
  dailyChange: number;
  floorApplied: boolean;
  floorReason?: string;
}

function calculateTargetCalories(
  estimatedBurn: number,
  goal: GoalType,
  ratePercent: number, // 0.25, 0.5, 0.75, 1.0
  currentWeightKg: number,
  sex: 'male' | 'female'
): CalorieTargetResult {
  if (goal === 'maintain') {
    return { targetCalories: estimatedBurn, dailyChange: 0, floorApplied: false };
  }

  // Calculate weekly weight change target
  const weeklyWeightChangeKg = currentWeightKg * (ratePercent / 100);
  
  // Convert to daily calorie change
  const dailyCalorieChange = Math.round((weeklyWeightChangeKg * CALORIES_PER_KG) / 7);

  let targetCalories: number;
  if (goal === 'lose') {
    targetCalories = estimatedBurn - dailyCalorieChange;
  } else {
    targetCalories = estimatedBurn + dailyCalorieChange;
  }

  // Apply safety floor
  const floor = getCalorieFloor(sex);
  if (goal === 'lose' && targetCalories < floor) {
    return {
      targetCalories: floor,
      dailyChange: estimatedBurn - floor,
      floorApplied: true,
      floorReason: `We've set a minimum of ${floor} cal/day for your health. Consider a gentler pace.`,
    };
  }

  return {
    targetCalories: Math.round(targetCalories),
    dailyChange: goal === 'lose' ? estimatedBurn - targetCalories : targetCalories - estimatedBurn,
    floorApplied: false,
  };
}

function getCalorieFloor(sex: 'male' | 'female'): number {
  // Medical consensus minimum calories for safe weight loss
  return sex === 'female' ? 1200 : 1500;
}
```

### 3.4 Macro Calculation

```typescript
interface Macros {
  protein: number; // grams
  carbs: number;   // grams
  fat: number;     // grams
}

interface MacroCalculationResult {
  macros: Macros;
  percentages: { protein: number; carbs: number; fat: number };
}

function calculateMacros(
  targetCalories: number,
  weightKg: number,
  goal: GoalType
): MacroCalculationResult {
  // PROTEIN: Higher when losing weight to preserve muscle
  // 1.6-2.2 g/kg is the evidence-based range for active individuals
  const proteinMultiplier = goal === 'lose' ? 2.0 : goal === 'gain' ? 1.8 : 1.6;
  const proteinGrams = Math.round(weightKg * proteinMultiplier);
  const proteinCalories = proteinGrams * 4;

  // FAT: Minimum 0.5 g/kg for hormones, target ~0.8 g/kg
  // Floor of 20% of calories
  const fatGramsFromWeight = Math.round(weightKg * 0.8);
  const fatGramsFromPercent = Math.round((targetCalories * 0.25) / 9);
  const fatGrams = Math.max(fatGramsFromWeight, fatGramsFromPercent, Math.round(weightKg * 0.5));
  const fatCalories = fatGrams * 9;

  // CARBS: Fill remaining calories
  const remainingCalories = targetCalories - proteinCalories - fatCalories;
  const carbGrams = Math.max(0, Math.round(remainingCalories / 4));

  // Calculate percentages
  const totalCalories = (proteinGrams * 4) + (carbGrams * 4) + (fatGrams * 9);
  
  return {
    macros: {
      protein: proteinGrams,
      carbs: carbGrams,
      fat: fatGrams,
    },
    percentages: {
      protein: Math.round((proteinGrams * 4 / totalCalories) * 100),
      carbs: Math.round((carbGrams * 4 / totalCalories) * 100),
      fat: Math.round((fatGrams * 9 / totalCalories) * 100),
    },
  };
}
```

### 3.5 Weight Trend Calculation

```typescript
/**
 * Calculate a smoothed weight trend using exponential moving average
 * This filters out day-to-day noise from water retention, food volume, etc.
 */
function calculateWeightTrend(
  weightEntries: WeightEntry[],
  smoothingFactor: number = 0.1 // Lower = smoother, higher = more responsive
): TrendWeight[] {
  if (weightEntries.length === 0) return [];
  
  // Sort by date ascending
  const sorted = [...weightEntries].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const trends: TrendWeight[] = [];
  let trend = sorted[0].weight; // Initialize with first weight

  for (const entry of sorted) {
    // Exponential moving average
    trend = (smoothingFactor * entry.weight) + ((1 - smoothingFactor) * trend);
    
    trends.push({
      date: entry.date,
      actualWeight: entry.weight,
      trendWeight: Math.round(trend * 10) / 10, // 1 decimal place
    });
  }

  return trends;
}

interface TrendWeight {
  date: string;
  actualWeight: number;
  trendWeight: number;
}
```

### 3.6 Learning Your Metabolism (Adaptive Calculation)

```typescript
/**
 * Calculate what your body actually burns based on real data
 * 
 * The core insight: If we know calorie intake and weight change,
 * we can figure out actual calorie burn.
 * 
 * Actual Burn = Calories In - (Weight Change × Energy Density)
 */
function calculateActualBurn(
  avgDailyCalories: number,
  weeklyWeightChangeKg: number
): number {
  // Energy density: ~7700 kcal per kg of body weight change
  // This accounts for the mix of fat and lean mass typically lost/gained
  const dailyWeightChangeKg = weeklyWeightChangeKg / 7;
  const dailyEnergyChange = dailyWeightChangeKg * CALORIES_PER_KG;
  
  // Burn = Intake - Change in stored energy
  // If losing weight, change is negative, so Burn > Intake
  // If gaining weight, change is positive, so Burn < Intake
  const calculatedBurn = avgDailyCalories - dailyEnergyChange;
  
  return Math.round(calculatedBurn);
}

/**
 * Smoothly update our estimate to avoid wild swings
 */
function updateBurnEstimate(
  previousEstimate: number,
  newCalculation: number,
  weeksOfData: number
): number {
  // More aggressive updates early on, more conservative later
  // Week 1-2: 50% weight to new data (still learning)
  // Week 3-4: 30% weight to new data (getting dialed in)
  // Week 5+:  20% weight to new data (fine-tuning)
  
  let updateWeight: number;
  if (weeksOfData <= 2) {
    updateWeight = 0.5;
  } else if (weeksOfData <= 4) {
    updateWeight = 0.3;
  } else {
    updateWeight = 0.2;
  }
  
  const updatedEstimate = Math.round(
    (updateWeight * newCalculation) + ((1 - updateWeight) * previousEstimate)
  );
  
  // Cap maximum weekly adjustment at 150 calories to prevent wild swings
  const maxAdjustment = 150;
  const adjustment = updatedEstimate - previousEstimate;
  
  if (Math.abs(adjustment) > maxAdjustment) {
    return previousEstimate + (Math.sign(adjustment) * maxAdjustment);
  }
  
  return updatedEstimate;
}
```

### 3.7 Weekly Reflection Logic

```typescript
interface WeeklyReflectionResult {
  weekNumber: number;
  avgCalorieIntake: number;
  startTrendWeight: number;
  endTrendWeight: number;
  weightChangeKg: number;
  calculatedBurn: number;
  previousBurnEstimate: number;
  newBurnEstimate: number;
  previousTargetCalories: number;
  newTargetCalories: number;
  previousMacros: Macros;
  newMacros: Macros;
  dataQuality: DataQuality;
  insights: string[];
}

async function processWeeklyReflection(
  goal: Goal,
  profile: UserProfile,
  weekStartDate: string,
  weekEndDate: string
): Promise<WeeklyReflectionResult> {
  // 1. Gather week's data
  const logEntries = await getLogEntriesForDateRange(weekStartDate, weekEndDate);
  const weightEntries = await getWeightEntriesForDateRange(weekStartDate, weekEndDate);
  
  // 2. Calculate data quality
  const daysLogged = new Set(logEntries.map(e => e.date)).size;
  const dataQuality = daysLogged >= 5 ? 'good' : daysLogged >= 3 ? 'partial' : 'insufficient';
  
  // 3. Calculate average daily intake
  const totalCalories = logEntries.reduce((sum, e) => sum + e.calories, 0);
  const avgCalorieIntake = Math.round(totalCalories / Math.max(daysLogged, 1));
  
  // 4. Get trend weights
  const allWeightEntries = await getAllWeightEntries();
  const trendWeights = calculateWeightTrend(allWeightEntries);
  const startTrend = getTrendWeightForDate(trendWeights, weekStartDate);
  const endTrend = getTrendWeightForDate(trendWeights, weekEndDate);
  const weightChangeKg = endTrend - startTrend;
  
  // 5. Calculate what your body actually burned this week
  const calculatedBurn = calculateActualBurn(avgCalorieIntake, weightChangeKg);
  
  // 6. Get previous estimate
  const previousReflection = await getPreviousReflection(goal.id);
  const previousBurnEstimate = previousReflection?.newBurnEstimate ?? goal.initialBurnEstimate;
  const weekNumber = (previousReflection?.weekNumber ?? 0) + 1;
  
  // 7. Update our understanding of your metabolism (smoothed)
  const newBurnEstimate = dataQuality === 'insufficient' 
    ? previousBurnEstimate // Don't update with insufficient data
    : updateBurnEstimate(previousBurnEstimate, calculatedBurn, weekNumber);
  
  // 8. Calculate new targets
  const { targetCalories: newTargetCalories } = calculateTargetCalories(
    newBurnEstimate,
    goal.type,
    goal.targetRatePercent,
    endTrend,
    profile.sex
  );
  
  const { macros: newMacros } = calculateMacros(newTargetCalories, endTrend, goal.type);
  
  // 9. Generate insights in friendly language
  const insights = generateWeeklyInsights({
    weightChangeKg,
    goal,
    calculatedBurn,
    previousBurnEstimate,
    newBurnEstimate,
    dataQuality,
  });
  
  return {
    weekNumber,
    avgCalorieIntake,
    startTrendWeight: startTrend,
    endTrendWeight: endTrend,
    weightChangeKg,
    calculatedBurn,
    previousBurnEstimate,
    newBurnEstimate,
    previousTargetCalories: previousReflection?.newTargetCalories ?? goal.initialTargetCalories,
    newTargetCalories,
    previousMacros: previousReflection?.newMacros ?? goal.initialMacros,
    newMacros,
    dataQuality,
    insights,
  };
}

function generateWeeklyInsights(data: InsightData): string[] {
  const insights: string[] = [];
  
  // Data quality feedback
  if (data.dataQuality === 'insufficient') {
    insights.push("We need more data to update your plan. Try to log at least 5 days next week.");
  } else if (data.dataQuality === 'partial') {
    insights.push("More consistent logging will help us dial in your plan even better.");
  }
  
  // Progress feedback
  if (data.goal.type === 'lose') {
    if (data.weightChangeKg < 0) {
      insights.push(`You lost ${Math.abs(data.weightChangeKg).toFixed(1)} kg this week. Great progress!`);
    } else if (data.weightChangeKg > 0.2) {
      insights.push("Weight went up a bit. Totally normal — could be water retention. Stay consistent.");
    } else {
      insights.push("Weight held steady this week. We'll fine-tune your targets if this continues.");
    }
  }
  
  // Metabolism insight
  const burnDiff = data.newBurnEstimate - data.previousBurnEstimate;
  if (Math.abs(burnDiff) > 50) {
    if (burnDiff > 0) {
      insights.push(`Your body seems to burn a bit more than we thought. Adjusting your plan up.`);
    } else {
      insights.push(`Your body seems to burn a bit less than we thought. Adjusting your plan down.`);
    }
  }
  
  return insights;
}
```

---

## 4. Safety Guardrails

### 4.1 Calorie Floors

| Sex | Absolute Floor | Reason |
|-----|----------------|--------|
| Female | 1,200 kcal | Medical consensus minimum |
| Male | 1,500 kcal | Medical consensus minimum |

**Behavior when floor is reached:**
- Cap target at floor
- Show gentle warning to user
- Suggest a more gradual pace
- Never go below floor regardless of calculations

### 4.2 Pace Limits

| Goal | Max Pace | Reason |
|------|----------|--------|
| Weight Loss | 1% body weight/week | Preserve muscle, sustainability |
| Weight Gain | 0.5% body weight/week | Minimize fat gain |

### 4.3 Adjustment Limits

| Metric | Max Change | Reason |
|--------|------------|--------|
| Weekly burn estimate adjustment | ±150 kcal | Prevent wild swings |
| Weekly calorie target change | ±200 kcal | Gradual adaptation |

### 4.4 Data Quality Requirements

| Quality Level | Days Logged | Behavior |
|---------------|-------------|----------|
| Good | 5-7 days | Full adjustment |
| Partial | 3-4 days | Reduced adjustment (50%) |
| Insufficient | 0-2 days | No adjustment, notify user |

---

## 5. Native Charts Specification

### 5.1 Chart Technology

| Platform | Technology | Notes |
|----------|------------|-------|
| iOS | SwiftUI Charts | Native performance, matches GymRx |
| Android | Jetpack Compose Charts | Native performance, matches GymRx |

### 5.2 Chart: What Your Body Burns

**Purpose:** Show how our understanding of your daily burn evolves as we learn your body.

```
┌─────────────────────────────────────────────────────────────┐
│  What Your Body Burns                    [7d] 30d 90d      │
│                                                             │
│  2,600 ┤                                                    │
│        │                    ┌───────────────────────────    │
│  2,500 ┤        ┌──────────┘                                │
│        │   ┌────┘                                           │
│  2,400 ┤   │                                                │
│        │   │                                                │
│  2,300 ┤───┘                                                │
│        │                                                    │
│  2,200 ┼────┬────┬────┬────┬────┬────┬────┬────┬────┬────  │
│        Jan 1    8    15   22   29  Feb 5                   │
│                                                             │
│  Current: 2,520 cal/day                                    │
│  You burn more than we first estimated!                    │
└─────────────────────────────────────────────────────────────┘
```

**Chart Properties:**
- Type: Line chart
- X-axis: Date (scrollable)
- Y-axis: Calories (auto-scaled with padding)
- Line color: Primary accent (Ice Blue)
- Fill: Gradient below line (subtle)
- Initial estimate: Dashed horizontal line for reference
- Annotation: Current value displayed prominently

**Data Points:**
- One point per day (from DailyMetabolism table)
- Line connects points smoothly
- Dots shown on hover/tap

### 5.3 Chart: Weight Trend

**Purpose:** Show actual weights vs. smoothed trend to filter out daily noise.

```
┌─────────────────────────────────────────────────────────────┐
│  Your Weight                             [7d] 30d 90d      │
│                                                             │
│  186 ┤ ●                                                    │
│      │  ╲ ●                                                 │
│  184 ┤   ╲─●─●                                              │
│      │      ╲  ●                                            │
│  182 ┤       ╲──●──●                                        │
│      │           ╲   ●                                      │
│  180 ┤            ╲───●──●                                  │
│      │                 ╲                                    │
│  178 ┼────┬────┬────┬────┬────┬────┬────┬────┬────┬────    │
│      Jan 1    8    15   22   29  Feb 5                     │
│                                                             │
│  ● Daily weigh-ins   ─── Trend                             │
│                                                             │
│  Trend: 180.2 lbs  ↓ 5.8 lbs total                         │
└─────────────────────────────────────────────────────────────┘
```

**Chart Properties:**
- Type: Combined scatter + line chart
- Actual weights: Dots (secondary color, smaller)
- Trend line: Solid line (primary accent, thicker)
- X-axis: Date
- Y-axis: Weight in user's preferred unit
- Goal weight line: Dashed horizontal (if set)
- Start weight line: Dotted horizontal (reference)

**Interactions:**
- Tap on dot to see exact weight and date
- Pinch to zoom (time range)
- Pan to scroll through history

### 5.4 Chart: Goal Progress

**Purpose:** Visualize the journey from start weight to goal weight.

```
┌─────────────────────────────────────────────────────────────┐
│  Your Progress                                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Start        Now                   Goal            │   │
│  │  185 lbs      180 lbs               165 lbs         │   │
│  │    │            │                    │              │   │
│  │    ▼            ▼                    ▼              │   │
│  │  ████████████████░░░░░░░░░░░░░░░░░░░░░              │   │
│  │  ├─── Done ────┤├───── To go ───────┤              │   │
│  │      5 lbs            15 lbs                        │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  25% there • ~15 weeks to go                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Week by Week                                       │   │
│  │                                                     │   │
│  │  Wk1  Wk2  Wk3  Wk4  Wk5  Wk6                      │   │
│  │   ▼    ▼    ▼    ▲    ▼    ▼                       │   │
│  │  -1.2 -0.8 -1.1 +0.3 -0.9 -1.1  (lbs)              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Chart Components:**

1. **Progress Bar**
   - Shows journey from start → current → goal
   - Filled portion = progress made
   - Color: Gradient from start to current (success color)

2. **Weekly Breakdown**
   - Each bar represents one week's change
   - Down arrows (green): Weight loss
   - Up arrows (amber): Weight gain
   - Neutral (gray): Maintenance

3. **Stats Display**
   - Percentage complete
   - Estimated weeks remaining (at current pace)
   - Average weekly change

### 5.5 Chart: Calorie Intake

**Purpose:** Show daily calorie intake compared to target over time.

```
┌─────────────────────────────────────────────────────────────┐
│  What You Ate                            [7d] 30d 90d      │
│                                                             │
│  2,400 ┤                   █                                │
│        │         █         █                                │
│  2,200 ┤    █    █    █    █                                │
│        │    █    █    █    █    █                           │
│  2,000 ┤────█────█────█────█────█─────── Target: 1,950     │
│        │    █    █    █    █    █    █                      │
│  1,800 ┤    █    █    █    █    █    █    █                 │
│        │    █    █    █    █    █    █    █                 │
│  1,600 ┼────┬────┬────┬────┬────┬────┬────┬                │
│        Mon  Tue  Wed  Thu  Fri  Sat  Sun                   │
│                                                             │
│  This week: 2,050 avg                                      │
└─────────────────────────────────────────────────────────────┘
```

**Chart Properties:**
- Type: Bar chart
- X-axis: Days
- Y-axis: Calories
- Target line: Dashed horizontal line
- Bar colors:
  - Within 100 cal of target: Success (green)
  - Over target: Neutral (gray) — **NOT red, no shame**
  - Under target: Primary (blue)
- Weekly average: Displayed below

**Important:** No judgment coloring. Over-target days are gray, not red.

### 5.6 Chart: Macro Distribution

**Purpose:** Show macro breakdown for selected period.

```
┌─────────────────────────────────────────────────────────────┐
│  Your Macros                             Today  Week        │
│                                                             │
│        Protein          Carbs            Fat               │
│        ┌────┐          ┌────┐          ┌────┐              │
│        │████│          │████│          │████│              │
│        │████│          │████│          │████│              │
│        │████│          │░░░░│          │████│              │
│        │████│          │░░░░│          │░░░░│              │
│        │░░░░│          │░░░░│          │░░░░│              │
│        └────┘          └────┘          └────┘              │
│        145/170g        160/175g        58/65g              │
│         85%             91%             89%                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Chart Properties:**
- Type: Vertical progress bars for each macro
- Colors:
  - Protein: Ice Blue (primary accent)
  - Carbs: Soft Green
  - Fat: Warm Amber
- Fill: Solid for consumed, empty for remaining
- Percentage labels below each bar

---

## 6. UI Screens

### 6.1 Progress Tab (Main View)

```
┌─────────────────────────────────────────────────────────────┐
│  ← Your Journey                                ⚙️           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Goal: Get to 165 lbs                               │   │
│  │  ████████████░░░░░░░░░░░░░░░░░░░░░░░ 25% there      │   │
│  │  5 lbs down • 15 to go • ~15 weeks                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Your Weight                           [7d] [30d] [90d]    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  (Weight trend chart)                               │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  Trend: 180.2 lbs  ↓ 5.8 lbs                              │
│                                                             │
│  What Your Body Burns                  [7d] [30d] [90d]    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  (Metabolism chart)                                 │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  Currently: ~2,520 cal/day                                │
│                                                             │
│  What You Ate                          [7d] [30d] [90d]    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  (Intake chart)                                     │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  This week: 1,980 avg • Target: 1,950                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Weekly Reflection Modal

```
┌─────────────────────────────────────────────────────────────┐
│                     This Week                          ✕    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                     ↓ 0.8 lbs                               │
│                                                             │
│           "You're making steady progress"                  │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  Here's what we saw:                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  You ate        1,920 cal/day avg                   │   │
│  │  You weighed in 5 times                             │   │
│  │  Your weight    180.8 → 179.7 lbs                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  What we learned:                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Your body seems to burn a bit more than we         │   │
│  │  initially thought. We're adjusting your plan.      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Your updated plan:                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Daily target: 1,920 cal  (was 1,950)               │   │
│  │  Protein: 168g  Carbs: 172g  Fat: 64g               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              [Sounds Good]                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Keep my current targets]                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Goal Settings Screen

```
┌─────────────────────────────────────────────────────────────┐
│  ← Settings          Your Goal                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Current Goal                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Lose weight                                    ▶   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Your Pace                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Steady (~1 lb/week)                            ▶   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Goal Weight                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  165 lbs                                        ▶   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Activity Level                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Fairly active                                  ▶   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  Your Daily Targets                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Calories          1,920                            │   │
│  │  Protein           168g                             │   │
│  │  Carbs             172g                             │   │
│  │  Fat               64g                              │   │
│  │                                                     │   │
│  │  [Set my own targets]                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  [End this goal]                                           │
│  [Switch to maintenance]                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Notifications & Prompts

### 7.1 Weekly Reflection Prompt

**Trigger:** Every 7 days after goal start, if user has logged 3+ days

**Notification:**
```
NutritionRx
Your weekly update is ready
See how your week went and what's next.
```

### 7.2 Logging Reminder

**Trigger:** Less than 3 days logged in current week (shown on day 5)

**In-app banner:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📝 Only 2 days logged this week                            │
│    Log a few more days so we can fine-tune your plan.      │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Goal Reached Celebration

**Trigger:** Trend weight reaches target weight

**Modal:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    🎉                                       │
│                                                             │
│                You made it!                                │
│                                                             │
│         185 lbs → 165 lbs in 14 weeks                      │
│                                                             │
│  What's next?                                              │
│                                                             │
│  [Set a new goal]                                          │
│                                                             │
│  [Maintain this weight]                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Data Export

### 8.1 Exportable Data

Users can export their goal data as JSON:

```json
{
  "profile": {
    "sex": "male",
    "heightCm": 178,
    "dateOfBirth": "1990-03-15"
  },
  "goals": [
    {
      "type": "lose",
      "startDate": "2026-01-01",
      "startWeightKg": 84,
      "targetWeightKg": 75,
      "targetRatePercent": 0.5,
      "completedAt": null
    }
  ],
  "weeklyReflections": [
    {
      "weekNumber": 1,
      "weekStartDate": "2026-01-01",
      "avgCalorieIntake": 1920,
      "startTrendWeight": 84,
      "endTrendWeight": 83.5,
      "estimatedDailyBurn": 2450,
      "newTargetCalories": 1900
    }
  ],
  "dailyMetabolism": [
    {
      "date": "2026-01-01",
      "trendWeight": 84,
      "calorieIntake": 1850,
      "estimatedBurn": 2420
    }
  ]
}
```

---

## 9. Integration with GymRx (Future)

When both apps are installed:

### 9.1 Exercise Calorie Import
- GymRx can export workout calories burned
- NutritionRx can optionally factor this into daily targets
- User controls whether to "eat back" exercise calories

### 9.2 Shared Weight Data
- Weight logged in either app syncs to both
- Single source of truth for weight trend

### 9.3 Unified Insights
- Combined view of workout + nutrition data
- See how training affects your progress

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-25 | Initial specification |
| 1.1 | 2026-01-25 | Revised terminology to be unique to NutritionRx |
