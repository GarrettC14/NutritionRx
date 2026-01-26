# NutritionRx Build Prompt

Copy and paste this entire prompt to Claude to build the app.

---

## PROMPT START

You are building **NutritionRx**, a React Native (Expo) nutrition tracking app. All specifications are complete and located in the `/docs` folder. Read ALL documentation before writing any code.

## Documentation (Read in Order)

```
docs/
├── README.md                       # Project overview, philosophy, tech stack
├── UX_SPECIFICATION.md             # Design philosophy, competitor analysis
├── UX_PROMPT_MOBILE.md             # Design tokens (colors, typography, spacing, components)
├── TECHNICAL_REQUIREMENTS.md       # Domain models, business rules, feature specs
├── DATABASE_SCHEMA.md              # SQLite migrations, queries, TypeScript types
├── API_INTEGRATION.md              # Open Food Facts API, USDA, caching, offline
├── PROJECT_ARCHITECTURE.md         # Folder structure, patterns, conventions
├── GOALS_FEATURE_SPECIFICATION.md  # Adaptive TDEE algorithm, weekly reflections, charts
├── USER_EXPERIENCE_FLOWS.md        # First-run, empty states, scanner UX, permissions
├── ADD_FOOD_SERVING_SPEC.md        # Flexible serving size picker (g, oz, cup, etc.)
├── BACKUP_AND_EXPORT.md            # Data export/import functionality
├── APP_STORE_LISTING.md            # Store descriptions (reference only)
├── FUTURE_FEATURES.md              # Post-MVP roadmap (reference only)
```

## Tech Stack (from docs)

- **Framework:** React Native with Expo (managed workflow)
- **Language:** TypeScript (strict mode)
- **Navigation:** Expo Router (file-based)
- **State Management:** Zustand
- **Database:** SQLite via expo-sqlite
- **Charts:** react-native-gifted-charts (or victory-native)
- **Barcode Scanner:** expo-barcode-scanner
- **Food Data:** Open Food Facts API (free)

---

## CRITICAL FEATURE: Macro Templates

Implement a **Macro Template** system that lets users customize their macro distribution. This is a core differentiator and must be included in the onboarding flow AND be editable in Settings.

### Eating Style Options

Users select how they prefer to balance carbs and fats. This affects the carb/fat ratio AFTER protein is calculated.

| Option | Description | Carb/Fat Split | Target Carbs |
|--------|-------------|----------------|--------------|
| **Flexible** | No particular preference, balanced approach | 50% carbs / 50% fat (of remaining cals) | No limit |
| **Carb-Focused** | Favors carbs for energy and performance | 65% carbs / 35% fat | No limit |
| **Fat-Focused** | Favors fats, moderate carbs | 35% carbs / 65% fat | ~150g max |
| **Very Low Carb** | Ketogenic-style eating | 10% carbs / 90% fat | ~50g max |

### Protein Priority Options

Users select their protein intake level. This is calculated FIRST, then remaining calories go to carbs/fat.

| Option | g per lb bodyweight | g per kg bodyweight | Best For |
|--------|---------------------|---------------------|----------|
| **Standard** | 0.6 g/lb | 1.3 g/kg | Sedentary, general health |
| **Active** | 0.75 g/lb | 1.65 g/kg | Regular exercise, maintenance |
| **Athletic** | 0.9 g/lb | 2.0 g/kg | Strength training, muscle building |
| **Maximum** | 1.0 g/lb | 2.2 g/kg | Bodybuilding, aggressive cuts, high performance |

### Macro Calculation Logic

```typescript
// 1. Calculate protein FIRST based on body weight and protein priority
const proteinG = bodyWeightLbs * proteinMultiplier; // e.g., 180 * 0.9 = 162g
const proteinCals = proteinG * 4;

// 2. Calculate remaining calories for carbs/fat
const remainingCals = targetCalories - proteinCals;

// 3. Split remaining between carbs/fat based on eating style
const carbCals = remainingCals * carbRatio;
const fatCals = remainingCals * fatRatio;

const carbsG = carbCals / 4;
const fatG = fatCals / 9;

// 4. Apply carb caps for low-carb styles
if (eatingStyle === 'very_low_carb' && carbsG > 50) {
  // Redistribute excess carb calories to fat
  const excessCarbCals = (carbsG - 50) * 4;
  carbsG = 50;
  fatG += excessCarbCals / 9;
}
```

### Database Schema Addition

Add these fields to the `user_profile` table:

```sql
-- Add to user_profile table
eating_style TEXT DEFAULT 'flexible',  -- 'flexible', 'carb_focused', 'fat_focused', 'very_low_carb'
protein_priority TEXT DEFAULT 'active', -- 'standard', 'active', 'athletic', 'maximum'
```

Add these fields to the `goals` table (so historical goals preserve the settings used):

```sql
-- Add to goals table
eating_style TEXT,
protein_priority TEXT,
```

### Onboarding Flow Addition

After the user selects their goal type (lose/maintain/gain), add TWO new screens:

**Screen: "How do you like to eat?"**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back                                           Step 4/7  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  How do you like to eat?                                   │
│                                                             │
│  This helps us balance your carbs and fats.                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⚖️  Flexible                                ✓     │   │
│  │  A balanced mix of carbs and fats                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🍞  Carb-Focused                                   │   │
│  │  More carbs for energy and performance              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🥑  Fat-Focused                                    │   │
│  │  More fats, moderate carbs                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🥓  Very Low Carb                                  │   │
│  │  Under 50g carbs (keto-friendly)                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              [Continue]                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Screen: "How much protein?"**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back                                           Step 5/7  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  How much protein do you want?                             │
│                                                             │
│  Higher protein helps preserve muscle, especially          │
│  when losing weight.                                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Standard                                           │   │
│  │  0.6g per lb • Good for general health             │   │
│  │  ~108g for you                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Active                                       ✓     │   │
│  │  0.75g per lb • Great for regular exercise         │   │
│  │  ~135g for you                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Athletic                                           │   │
│  │  0.9g per lb • Best for building muscle            │   │
│  │  ~162g for you                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Maximum                                            │   │
│  │  1.0g per lb • For serious athletes                │   │
│  │  ~180g for you                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              [Continue]                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Settings Screen Addition

Add a "Nutrition Preferences" section to Settings:

```
┌─────────────────────────────────────────────────────────────┐
│  ← Settings                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  NUTRITION PREFERENCES                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Eating Style                           Flexible  > │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Protein Priority                         Active  > │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Changes will recalculate your macro targets.              │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  CURRENT TARGETS                                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Calories          1,950                            │   │
│  │  Protein           145g (30%)                       │   │
│  │  Carbs             195g (40%)                       │   │
│  │  Fat               65g (30%)                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### TypeScript Types

```typescript
type EatingStyle = 'flexible' | 'carb_focused' | 'fat_focused' | 'very_low_carb';
type ProteinPriority = 'standard' | 'active' | 'athletic' | 'maximum';

interface MacroTemplate {
  eatingStyle: EatingStyle;
  proteinPriority: ProteinPriority;
}

const EATING_STYLE_CONFIG: Record<EatingStyle, { carbRatio: number; fatRatio: number; carbCap?: number }> = {
  flexible: { carbRatio: 0.5, fatRatio: 0.5 },
  carb_focused: { carbRatio: 0.65, fatRatio: 0.35 },
  fat_focused: { carbRatio: 0.35, fatRatio: 0.65, carbCap: 150 },
  very_low_carb: { carbRatio: 0.1, fatRatio: 0.9, carbCap: 50 },
};

const PROTEIN_PRIORITY_CONFIG: Record<ProteinPriority, { gPerLb: number; gPerKg: number }> = {
  standard: { gPerLb: 0.6, gPerKg: 1.3 },
  active: { gPerLb: 0.75, gPerKg: 1.65 },
  athletic: { gPerLb: 0.9, gPerKg: 2.0 },
  maximum: { gPerLb: 1.0, gPerKg: 2.2 },
};
```

### Testing Requirements for Macro Templates

**Unit Tests (CRITICAL - write extensively):**

```typescript
describe('MacroCalculationService', () => {
  describe('calculateMacros', () => {
    // Test all eating style + protein priority combinations (16 total)
    it.each([
      ['flexible', 'standard'],
      ['flexible', 'active'],
      ['flexible', 'athletic'],
      ['flexible', 'maximum'],
      ['carb_focused', 'standard'],
      // ... all 16 combinations
    ])('correctly calculates macros for %s eating style with %s protein',
      (eatingStyle, proteinPriority) => {
        // Test that protein is calculated correctly
        // Test that remaining cals go to carbs/fat in correct ratio
        // Test that carb caps are enforced
        // Test that total macros * calories = target calories (±5)
      }
    );

    it('enforces 50g carb cap for very_low_carb style', () => {});
    it('enforces 150g carb cap for fat_focused style', () => {});
    it('redistributes excess carb calories to fat when capped', () => {});
    it('uses correct protein multiplier for each priority level', () => {});
    it('handles edge case of very low calorie targets', () => {});
    it('handles edge case of very high body weight', () => {});
    it('rounds macros to reasonable precision (0.1g)', () => {});
  });

  describe('updateMacrosOnPreferenceChange', () => {
    it('recalculates macros when eating style changes', () => {});
    it('recalculates macros when protein priority changes', () => {});
    it('preserves calorie target when preferences change', () => {});
    it('updates goal record with new macro values', () => {});
  });
});

describe('MacroTemplateRepository', () => {
  it('saves eating style to user profile', () => {});
  it('saves protein priority to user profile', () => {});
  it('retrieves current macro template', () => {});
  it('stores macro template with goal for history', () => {});
});
```

**E2E Tests:**

```typescript
describe('Macro Template Onboarding Flow', () => {
  it('shows eating style selection after goal type', async () => {});
  it('shows protein priority after eating style', async () => {});
  it('displays personalized protein gram estimates', async () => {});
  it('calculates correct final macros based on selections', async () => {});
  it('saves selections to database correctly', async () => {});
});

describe('Macro Template Settings', () => {
  it('displays current eating style and protein priority', async () => {});
  it('allows changing eating style', async () => {});
  it('allows changing protein priority', async () => {});
  it('recalculates and displays new macros after change', async () => {});
  it('persists changes after app restart', async () => {});
});

describe('Macro Display Accuracy', () => {
  it('shows correct macros on Today screen after template change', async () => {});
  it('uses new macros for daily progress calculation', async () => {});
  it('weekly reflection uses correct macro targets', async () => {});
});
```

---

## Build Phases

Complete each phase fully, including tests, before moving to the next. Do not ask for confirmation between phases — iterate autonomously until the app is complete.

### Phase 1: Project Setup & Foundation
1. Initialize Expo project with TypeScript template
2. Set up folder structure per PROJECT_ARCHITECTURE.md
3. Configure ESLint, Prettier, path aliases
4. Create design tokens (colors, typography, spacing) from UX_PROMPT_MOBILE.md
5. Set up Expo Router with tab navigation structure
6. Initialize SQLite database with all migrations from DATABASE_SCHEMA.md
   - **Include the new macro template fields (eating_style, protein_priority)**
7. Create base UI components (Button, Card, Input, etc.)

**Tests:**
- Unit tests for design token utilities
- Unit tests for database initialization and migrations
- Unit tests for base UI components

---

### Phase 2: Core Data Layer
1. Implement all TypeScript types/interfaces from TECHNICAL_REQUIREMENTS.md
   - **Include MacroTemplate types (EatingStyle, ProteinPriority)**
   - **Include ServingUnit type ('serving' | 'g' | 'oz' | 'cup' | 'tbsp' | 'tsp' | 'ml' | 'fl_oz')**
2. Create all repositories (foodRepository, logRepository, weightRepository, goalRepository, etc.)
   - **Include macroTemplateRepository**
3. Implement all database queries from DATABASE_SCHEMA.md
   - **Add serving_unit and serving_amount columns to food_logs table**
   - **Add last_used_unit column to foods table (for user preference tracking)**
4. Create Zustand stores (foodStore, logStore, weightStore, goalStore, settingsStore)
5. Implement row-to-domain mappers
6. **Implement MacroCalculationService with all eating style and protein priority logic**
7. **Implement ServingUnitConverter with all unit conversion logic (g ↔ oz, cup ↔ ml, etc.)**

**Tests:**
- Unit tests for all repositories (CRUD operations)
- Unit tests for Zustand stores
- Unit tests for data mappers
- **Comprehensive unit tests for MacroCalculationService (all 16 combinations)**
- **Unit tests for carb cap enforcement**
- **Unit tests for calorie redistribution logic**
- **Unit tests for ServingUnitConverter (all unit conversions)**

---

### Phase 3: Food Management
1. Implement food search (local database)
2. Create FoodDetailScreen with nutrition display
3. **Implement custom food creation flow with serving unit pills (g, oz, cup, tbsp, tsp, etc.)**
   - This uses the same ServingUnitPicker component as Add Food screen
4. Build recent foods functionality
5. Create food list components with proper empty states

**Tests:**
- Unit tests for search algorithms
- Unit tests for food validation
- **Unit tests for custom food creation with various units**
- E2E test: Search for food → View details
- E2E test: Create custom food → Find in search
- **E2E test: Create custom food with gram-based serving → Log with oz → Correct conversion**

---

### Phase 4: Barcode Scanning & API Integration
1. Implement Open Food Facts API service per API_INTEGRATION.md
2. Create barcode scanner screen with camera permissions flow
3. Implement product lookup with caching strategy
4. Handle all scanner states (ready, detected, loading, found, not_found, offline)
5. Implement "Create custom food" flow for not-found products
6. Add USDA seed data for common foods

**Tests:**
- Unit tests for API service (mock responses)
- Unit tests for caching logic
- Unit tests for API-to-domain mapping
- E2E test: Scan barcode → Product found → Add to log
- E2E test: Scan unknown barcode → Create custom food

---

### Phase 5: Food Logging (Core Feature)
1. Build Today screen with calorie ring and macro bars
2. Implement meal sections (Breakfast, Lunch, Dinner, Snack)
3. **Create "Add Food" screen with flexible serving size picker per ADD_FOOD_SERVING_SPEC.md:**
   - Amount input field (supports decimals: 0.5, 1.5, etc.)
   - Unit selector pills: serving, g, oz, cup, tbsp, tsp, ml, fl oz
   - Real-time nutrition preview that updates on amount/unit change
   - Unit conversion logic (g ↔ oz, cup ↔ ml, etc.)
   - Remember last-used unit per food
   - Only show units applicable to the food type
4. Implement Quick Add functionality
5. Build edit/delete log entry functionality
6. Implement "Copy meal" and "Copy day" features
7. Handle all empty states per USER_EXPERIENCE_FLOWS.md

**Tests:**
- Unit tests for calorie/macro calculations
- Unit tests for daily totals aggregation
- **Unit tests for serving unit conversion (g ↔ oz, cup ↔ ml, etc.)**
- **Unit tests for nutrition calculation with all unit types**
- E2E test: Full logging flow (search → add → see in today)
- E2E test: Quick add calories
- E2E test: Edit serving size
- E2E test: Delete entry
- **E2E test: Log food with 0.5 serving**
- **E2E test: Log food by gram weight**
- **E2E test: Log liquid food by cups**
- **E2E test: Verify last-used unit is remembered**

---

### Phase 6: Weight Tracking & Goals Onboarding (WITH MACRO TEMPLATES)
1. Build weight entry screen with unit conversion
2. Implement weight history with trend calculation (7-day EMA)
3. Create Goals onboarding flow per USER_EXPERIENCE_FLOWS.md:
   - Welcome screen
   - Choice screen (goals vs. just track)
   - Demographics collection (optional)
   - Goal type selection (lose/maintain/gain)
   - **NEW: Eating Style selection screen**
   - **NEW: Protein Priority selection screen**
   - Target weight input
   - Rate selection
   - Summary with calculated targets (using macro template)
4. Implement TDEE calculation (Mifflin-St Jeor) per GOALS_FEATURE_SPECIFICATION.md
5. **Implement macro calculation using MacroCalculationService with selected template**
6. Store goal with eating_style and protein_priority

**Tests:**
- Unit tests for weight trend calculation (EMA)
- Unit tests for BMR/TDEE calculations
- **Unit tests for macro calculation with all template combinations**
- **E2E test: Complete onboarding with Flexible + Active → verify macros**
- **E2E test: Complete onboarding with Very Low Carb + Maximum → verify 50g carb cap**
- **E2E test: Complete onboarding with Fat-Focused + Athletic → verify 150g carb cap**
- E2E test: Skip onboarding → Default targets
- E2E test: Log weight → See in history

---

### Phase 7: Adaptive Algorithm & Charts
1. Implement weekly reflection service per GOALS_FEATURE_SPECIFICATION.md
2. Build metabolism calculation (back-calculate from intake + weight change)
3. Create weekly reflection modal with data quality indicators
4. Implement adaptive target adjustment with safety guardrails
   - **Preserve user's eating style and protein priority when adjusting**
   - **Only adjust calories; recalculate macros using their template**
5. Build all native charts:
   - Weight trend chart (raw + smoothed + goal line)
   - Metabolism chart (daily burn over time)
   - Calorie intake chart (daily vs target)
   - Goal progress chart (waterfall)
6. Create Progress tab with all charts

**Tests:**
- Unit tests for metabolism calculation algorithm
- Unit tests for weight change calculations
- Unit tests for target adjustment logic
- **Unit tests verifying macro template is preserved during weekly adjustment**
- Unit tests for safety guardrails (calorie floors, max rates)
- E2E test: Log 7 days of data → Weekly reflection appears
- E2E test: Accept new targets → See updated daily goals with correct macro ratios

---

### Phase 8: Settings, Polish & Final Integration
1. Build Settings screen:
   - Weight unit preference
   - Theme selection (dark/light/auto)
   - **Eating Style selector (with recalculation)**
   - **Protein Priority selector (with recalculation)**
   - Manual goal override
   - Data export (JSON/CSV)
   - Delete all data
2. **Implement macro preference change flow:**
   - Show current selection
   - Allow changing
   - Recalculate macros immediately
   - Show preview of new macros before confirming
   - Update goal record
3. Implement data export per BACKUP_AND_EXPORT.md
4. Add all microinteractions and animations
5. Implement notification prompts (weekly reflection, logging reminder)
6. Polish all empty states and error states
7. Performance optimization (lazy loading, memoization)
8. Accessibility audit (screen reader, contrast)

**Tests:**
- Unit tests for export service
- Unit tests for settings persistence
- **Unit tests for macro recalculation on preference change**
- **E2E test: Change eating style in settings → macros update correctly**
- **E2E test: Change protein priority in settings → macros update correctly**
- **E2E test: Change both preferences → macros reflect both changes**
- E2E test: Change weight unit → All weights display correctly
- E2E test: Export data → Valid JSON file
- E2E test: Delete all data → Fresh state
- Full regression E2E suite covering all major flows

---

## Phase 9: Mock Data Seeding & Final Testing (FINAL PHASE)

After all features are complete, seed the app with realistic mock data for manual testing and verification.

### Mock Data Requirements

Create a `seedMockData()` function that generates:

**1. User Profile:**
```typescript
const mockUser = {
  sex: 'male',
  dateOfBirth: '1992-03-15',  // 32 years old
  heightCm: 178,              // 5'10"
  activityLevel: 'moderately_active',
  eatingStyle: 'fat_focused',
  proteinPriority: 'athletic',
};
```

**2. Goal:**
```typescript
const mockGoal = {
  type: 'lose',
  startWeightKg: 88.5,        // 195 lbs
  targetWeightKg: 79.4,       // 175 lbs
  targetRatePercent: 0.5,     // 0.5% per week
  startDate: '8 weeks ago',
};
```

**3. 8 Weeks of Historical Data:**
- **Food Logs:** ~85% of days have food logged
  - Realistic variance (±200 cals from target)
  - Weekends have slightly higher intake (+200-400 cals)
  - Mix of: barcode scans (60%), search (30%), quick adds (10%)
  - Consistent breakfast patterns, varied dinners

- **Weight Entries:** ~70% of days have weight
  - Show gradual downward trend (~6 lbs over 8 weeks)
  - Add realistic daily variance (±0.5-1.5 lbs)
  - Some "whooshes" and plateaus for realism

- **Weekly Reflections:** 7 completed reflections
  - Show metabolism estimates converging over time
  - Mix of "good", "partial" data quality
  - Show realistic target adjustments

**4. Food Data:**
- 30+ frequently used foods in recent foods
- 5-10 user-created custom foods ("Mom's Lasagna", "Protein Shake", etc.)
- Usage counts reflecting realistic patterns

### Mock Data Service Implementation

```typescript
// services/mockDataService.ts

export async function seedMockData(): Promise<void> {
  console.log('🌱 Starting mock data seed...');

  // 1. Clear existing data (optional flag)
  await clearAllData();

  // 2. Seed user profile
  await seedUserProfile();
  console.log('✓ User profile created');

  // 3. Seed goal
  const goal = await seedGoal();
  console.log('✓ Goal created');

  // 4. Seed common foods (from seed data)
  await seedCommonFoods();
  console.log('✓ Common foods seeded');

  // 5. Seed custom foods
  await seedCustomFoods();
  console.log('✓ Custom foods created');

  // 6. Generate 8 weeks of daily data
  const startDate = subWeeks(new Date(), 8);
  for (let day = startDate; day <= new Date(); day = addDays(day, 1)) {
    await generateDayOfData(day, goal);
  }
  console.log('✓ 8 weeks of food and weight logs created');

  // 7. Generate weekly reflections
  for (let week = 1; week <= 7; week++) {
    await generateWeeklyReflection(goal.id, week);
  }
  console.log('✓ Weekly reflections created');

  // 8. Update usage counts for recent foods
  await updateFoodUsageCounts();
  console.log('✓ Recent foods populated');

  console.log('🎉 Mock data seeding complete!');
}

async function generateDayOfData(date: Date, goal: Goal): Promise<void> {
  const isWeekend = [0, 6].includes(date.getDay());
  const shouldLogFood = Math.random() < 0.85;
  const shouldLogWeight = Math.random() < 0.70;

  if (shouldLogFood) {
    // Generate 3-5 meals with realistic variance
    const baseCalories = goal.currentTargetCalories;
    const variance = isWeekend ? 300 : 150;
    const dayTarget = baseCalories + (Math.random() - 0.3) * variance;

    await generateBreakfast(date, dayTarget * 0.25);
    await generateLunch(date, dayTarget * 0.30);
    await generateDinner(date, dayTarget * 0.35);
    if (Math.random() > 0.4) {
      await generateSnack(date, dayTarget * 0.10);
    }
  }

  if (shouldLogWeight) {
    // Calculate expected weight with variance
    const weeksSinceStart = differenceInWeeks(date, goal.startDate);
    const expectedLoss = weeksSinceStart * 0.4; // ~0.4 kg/week
    const expectedWeight = goal.startWeightKg - expectedLoss;
    const variance = (Math.random() - 0.5) * 1.5; // ±0.75 kg

    await weightRepository.create({
      date: formatDate(date),
      weightKg: Math.round((expectedWeight + variance) * 10) / 10,
    });
  }
}
```

### Developer Menu for Seeding

Add a hidden developer menu accessible by tapping the version number 7 times in Settings:

```
┌─────────────────────────────────────────────────────────────┐
│  🛠️ Developer Tools                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [🌱 Seed Mock Data]                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [🗑️ Clear All Data]                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [📊 View Database Stats]                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Database:                                                 │
│  • Food items: 342                                        │
│  • Log entries: 156                                       │
│  • Weight entries: 45                                     │
│  • Weekly reflections: 7                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Verification Checklist After Seeding

After mock data is seeded, verify:

- [ ] Today screen shows most recent day's meals
- [ ] Calorie ring displays correct progress
- [ ] Macro bars show correct values
- [ ] Progress tab renders all charts with data
- [ ] Weight trend chart shows 8 weeks of history
- [ ] Metabolism chart shows burn estimates converging
- [ ] Weekly reflection modal can be opened
- [ ] Recent foods list is populated (~30 items)
- [ ] Custom foods appear in search
- [ ] Settings show Fat-Focused + Athletic selections
- [ ] Changing macro template recalculates correctly

**Tests for Mock Data:**
- Unit test: `seedMockData()` creates correct number of records
- Unit test: Generated food logs have realistic calorie variance
- Unit test: Generated weights follow expected trend
- E2E test: After seeding, all screens render without errors
- E2E test: Charts display seeded data correctly

---

## Testing Requirements Summary

After each phase, create:

1. **Unit Tests** (Jest + React Native Testing Library)
   - Test all business logic functions
   - Test all repository methods
   - Test all Zustand store actions
   - Test all utility functions
   - **Extensive tests for macro calculation (all 16 combinations)**
   - Aim for >80% coverage on business logic

2. **E2E Tests** (Detox or Maestro)
   - Test complete user flows
   - Test happy paths and error states
   - Test offline scenarios where applicable
   - **Test macro template selection and changes**

---

## Important Constraints

1. **Offline-first:** All core features must work without internet
2. **No accounts:** No auth, no cloud sync
3. **Privacy:** All data stored locally in SQLite
4. **Free APIs only:** Open Food Facts for barcodes
5. **Performance:** App should feel instant (<100ms interactions)
6. **Accessibility:** Support screen readers, minimum contrast ratios
7. **Unique UI/UX:** Design must be uniquely NutritionRx — do not copy competitor UI

## Code Quality Standards

- Strict TypeScript (no `any` types)
- Functional components with hooks
- Custom hooks for shared logic
- Proper error boundaries
- Consistent naming conventions per PROJECT_ARCHITECTURE.md
- Comments for complex business logic (especially macro calculations)

## Autonomous Execution

- Do NOT ask for confirmation between phases
- Do NOT ask which feature to build next
- If you encounter an ambiguity, make a reasonable decision based on the documentation and note it
- If you hit a blocker, document it and continue with the next task
- Complete all 9 phases and all tests
- Seed mock data at the end so the app can be tested
- The app should be fully functional and production-ready when complete

## Begin

Start by reading all documentation files in `/docs`, then begin Phase 1. Build the complete app with full test coverage, including the macro template system and mock data seeding.

---

## PROMPT END
