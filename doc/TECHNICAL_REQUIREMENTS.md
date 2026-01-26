# NutritionRx Technical Requirements

## Document Purpose
This document defines the technical requirements, domain models, business rules, and feature specifications for NutritionRx — a nutrition and calorie tracking mobile app. Read this document first when implementing any feature.

---

## Project Overview

NutritionRx is a **nutrition and calorie tracking app** built with React Native (Expo). The app prioritizes:

1. **Speed of logging** — Minimal taps to log a food item
2. **Offline-first** — Full functionality without network connection
3. **Clean, judgment-free UX** — No shame, no red warnings
4. **Privacy by default** — No accounts required for MVP
5. **Barcode scanning** — Free, using Open Food Facts API
6. **Native chart performance** — SwiftUI Charts (iOS) and Jetpack Compose Charts (Android)

The target user is someone who wants to track their nutrition without being overwhelmed, judged, or paywalled.

---

## Document Index

| Document | Purpose | When to Reference |
|----------|---------|-------------------|
| **TECHNICAL_REQUIREMENTS.md** | Feature specs, domain models, business rules | Implementing any feature |
| **GOALS_SPECIFICATION.md** | Adaptive logic, TDEE calculation, weekly reflections | Goals feature, analytics |
| **PROJECT_ARCHITECTURE.md** | Folder structure, patterns, conventions | Setting up files, creating new features |
| **DATABASE_SCHEMA.sql** | Table definitions, indexes, example queries | Database layer, repositories |
| **FOOD_SEED_DATA.json** | Common foods with nutritional data | Initial database seeding |
| **UX_SPECIFICATION.md** | Design direction, competitor analysis, UX principles | UI decisions, user flows |
| **UX_PROMPT_MOBILE.md** | Design tokens, colors, spacing, component patterns | Styling components |

---

## 1. Domain Model

### 1.1 Food Items (Reference Data)

#### FoodItem Entity

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | Primary key |
| name | string | Required, indexed |
| brand | string | Nullable (for generic foods) |
| barcode | string | Nullable, indexed, unique if present |
| calories | number | Per base serving |
| protein | number | Grams per base serving |
| carbs | number | Grams per base serving |
| fat | number | Grams per base serving |
| fiber | number | Nullable, grams per base serving |
| sugar | number | Nullable, grams per base serving |
| sodium | number | Nullable, mg per base serving |
| servingSize | number | Base serving quantity |
| servingUnit | string | Unit label (g, ml, oz, cup, etc.) |
| servingSizeGrams | number | Nullable, normalized to grams for comparison |
| source | enum | DataSource (see below) |
| sourceId | string | Nullable, original ID from source |
| isVerified | boolean | Default false |
| isUserCreated | boolean | Default false |
| isFavorite | boolean | Default false |
| lastUsedAt | timestamp | Nullable, for "Recent" sorting |
| usageCount | number | Default 0, for "Frequent" sorting |
| createdAt | timestamp | Auto-set |
| updatedAt | timestamp | Auto-updated |

#### DataSource Enum

```
OpenFoodFacts    // Primary API source
USDA             // USDA FoodData Central
UserCreated      // User-created custom food
Imported         // Imported from another app
```

#### ServingUnit Enum (Common Units)

```
// Weight
g               // grams (base unit)
oz              // ounces
lb              // pounds
kg              // kilograms

// Volume
ml              // milliliters
l               // liters
cup             // cup (240ml default)
tbsp            // tablespoon (15ml)
tsp             // teaspoon (5ml)
fl_oz           // fluid ounces

// Count
piece           // individual pieces
slice           // slices
serving         // generic serving
container       // whole container
package         // whole package
```

#### FoodItem Business Rules

- **Barcode uniqueness:** A barcode can only map to one food item
- **Cached lookups:** API results are cached locally for offline use
- **User-created foods:** Never synced to external services (privacy)
- **Favorites:** User can mark any food as favorite
- **Recents:** Foods are sorted by `lastUsedAt` descending
- **Frequent:** Foods are sorted by `usageCount` descending
- **Verification:** Only `OpenFoodFacts` and `USDA` sources are considered verified

#### FoodItem Indexing

- `FoodItem(barcode)` — Fast barcode lookup
- `FoodItem(name)` — Full-text search
- `FoodItem(isFavorite, name)` — Favorites-first sorting
- `FoodItem(lastUsedAt)` — Recent foods
- `FoodItem(usageCount)` — Frequent foods
- `FoodItem(source, sourceId)` — Deduplication

---

### 1.2 Food Log Entries (User Data)

#### LogEntry Entity

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | Primary key |
| foodItemId | UUID | FK → FoodItem |
| date | date | Required, indexed (YYYY-MM-DD) |
| mealType | enum | MealType (see below) |
| servings | number | Multiplier (e.g., 1.5 servings) |
| calories | number | Computed: food.calories * servings |
| protein | number | Computed: food.protein * servings |
| carbs | number | Computed: food.carbs * servings |
| fat | number | Computed: food.fat * servings |
| notes | string | Nullable, user notes |
| createdAt | timestamp | Auto-set |
| updatedAt | timestamp | Auto-updated |

#### MealType Enum

```
Breakfast
Lunch  
Dinner
Snack
```

**Note:** Some apps use 5+ meal slots. For MVP, 4 is sufficient and matches user mental model.

#### LogEntry Business Rules

- **Computed macros:** Calories and macros are computed and stored (not computed on read)
- **Reason:** Allows the user to edit a food item without retroactively changing logged history
- **Servings precision:** Allow decimal servings (0.5, 1.25, etc.)
- **Date format:** Store as `YYYY-MM-DD` string for easy grouping
- **Meal ordering:** Breakfast → Lunch → Dinner → Snack (fixed order in UI)

#### LogEntry Indexing

- `LogEntry(date)` — Daily summary queries
- `LogEntry(date, mealType)` — Meal-specific queries
- `LogEntry(foodItemId)` — "Foods I've logged" history
- `LogEntry(createdAt)` — Recent activity

---

### 1.3 Quick Add Entries (Simplified Logging)

#### QuickAddEntry Entity

For users who want to log calories without finding a specific food.

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | Primary key |
| date | date | Required, indexed |
| mealType | enum | MealType |
| description | string | Nullable, user description |
| calories | number | Required |
| protein | number | Nullable |
| carbs | number | Nullable |
| fat | number | Nullable |
| createdAt | timestamp | Auto-set |
| updatedAt | timestamp | Auto-updated |

**Use case:** User ate at a restaurant, doesn't want to search — just logs "~600 calories lunch."

---

### 1.4 Weight Entries (Progress Tracking)

#### WeightEntry Entity

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | Primary key |
| date | date | Required, indexed, unique |
| weight | number | Required |
| unit | enum | WeightUnit |
| notes | string | Nullable |
| createdAt | timestamp | Auto-set |
| updatedAt | timestamp | Auto-updated |

#### WeightUnit Enum

```
kg
lbs
```

#### WeightEntry Business Rules

- **One per day:** Only one weight entry per date (latest wins)
- **Canonical storage:** Store in user's preferred unit
- **Conversion:** Display conversion available but not stored separately
- **Trend calculation:** Moving average over 7 days for smoothing

#### WeightEntry Indexing

- `WeightEntry(date)` — Unique constraint + fast lookup
- `WeightEntry(date DESC)` — Chronological queries

---

### 1.5 User Goals (Settings)

#### UserGoals Entity (Singleton)

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | Primary key (always same ID) |
| dailyCalories | number | Target calories |
| proteinGrams | number | Target protein in grams |
| carbsGrams | number | Target carbs in grams |
| fatGrams | number | Target fat in grams |
| weightUnit | enum | WeightUnit |
| energyUnit | enum | EnergyUnit |
| createdAt | timestamp | Auto-set |
| updatedAt | timestamp | Auto-updated |

#### EnergyUnit Enum

```
kcal        // Kilocalories (default for US)
kJ          // Kilojoules (common in AU/EU)
```

#### UserGoals Business Rules

- **Singleton:** Only one goals record exists
- **Defaults:**
  - dailyCalories: 2000
  - proteinGrams: 50
  - carbsGrams: 250
  - fatGrams: 65
  - weightUnit: lbs (US default)
  - energyUnit: kcal
- **Macro ratio:** App does NOT enforce that P+C+F = total calories
- **Reason:** Users may have custom goals that don't follow standard 4-4-9 ratio

---

### 1.6 Custom Recipes (V2 Feature - Deferred)

**Explicitly deferred for MVP.** Architecture should allow future addition.

A recipe would be:
- Collection of FoodItems with quantities
- Computed total nutrition
- Number of servings the recipe makes
- Per-serving nutrition = total / servings

---

## 2. Feature Requirements

### Feature Overview

#### P0: Core Features (MVP Required)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Food Logging** | |
| Log by search | Full-text search of local database | P0 |
| Log by barcode | Scan → lookup → confirm → log | P0 |
| Log by recent | Show last 20 foods logged | P0 |
| Quick add | Log calories only, optionally macros | P0 |
| Edit/delete entry | Modify or remove logged foods | P0 |
| 4 meal types | Breakfast, Lunch, Dinner, Snack | P0 |
| Create custom food | User-created foods for barcode misses | P0 |
| **Daily View** | |
| Calorie ring | Progress toward daily goal | P0 |
| Macro display | P / C / F grams and progress | P0 |
| Meal sections | Collapsible sections per meal | P0 |
| Date navigation | Swipe or tap to change day | P0 |
| **Goals & Adaptive Algorithm** | See GOALS_SPECIFICATION.md |
| Onboarding flow | Collect stats, set goal | P0 |
| TDEE calculation | Mifflin-St Jeor + activity multiplier | P0 |
| Target generation | Daily calories + macros | P0 |
| Weekly reflection | Recalculate based on actual data | P0 |
| Adaptive adjustment | Auto-adjust targets to meet goal | P0 |
| **Weight Tracking** | |
| Log weight | One entry per day, numeric picker | P0 |
| Weight trend | Smoothed trend line (7-day EMA) | P0 |
| **Analytics (Native Charts)** | |
| Metabolism chart | Daily burn over time as we learn your body | P0 |
| Weight trend chart | Raw weights + smoothed trend + goal | P0 |
| Goal progress chart | Waterfall or dial showing progress | P0 |
| Calorie intake chart | Daily/weekly intake vs target | P0 |
| **Settings** | |
| Daily calorie goal | Customizable (or auto from algorithm) | P0 |
| Weight unit | kg / lbs | P0 |
| Theme | dark / light / auto | P0 |

#### Explicitly NOT in MVP

| Feature | Reason |
|---------|--------|
| Frequent foods | Recent foods covers 80% of use cases |
| Favorites | Can add post-MVP |
| Copy entry to other day | Log from Recent instead |
| Macro goals (separate from algorithm) | Algorithm handles this |
| Export data | Nice-to-have, not essential |
| Energy unit (kJ) | Niche, US-focused MVP |
| Water tracking | Separate feature, can add later |
| Micronutrients | Adds complexity |
| Cloud sync / accounts | Privacy-first MVP |
| Social features | Against design philosophy |

---

### 2.1 Food Logging Details

#### Logging Speed Targets

| Action | Target Taps |
|--------|-------------|
| Log from recent | 2 taps (select → confirm) |
| Log via barcode | 2 taps (scan → confirm) |
| Log via search | 3-4 taps (search → select → confirm) |
| Quick add | 3 taps (quick add → enter → save) |

#### Barcode Scanning Flow

```
1. User taps [Scan] button
2. Camera opens with scanner overlay
3. Barcode detected
4. Check local cache for barcode
   → If found: Show food detail for confirmation
   → If not found: Call Open Food Facts API
      → If API returns result: Cache locally, show food detail
      → If API returns no result: Show "Not found" with options:
         - Search by name
         - Create custom food
5. User confirms servings
6. Food logged to selected meal
```

#### Search Algorithm

```
1. User types query
2. Search triggers after 300ms debounce
3. Search order:
   a. Exact match on name (case-insensitive)
   b. Prefix match on name
   c. Contains match on name
   d. Match on brand
4. Results ordered by:
   a. Favorites first
   b. Then by usageCount DESC
   c. Then alphabetically
5. Limit to 50 results
```

---

### 2.2 Daily Summary View

#### P0: Today Screen

| Element | Details |
|---------|---------|
| Calorie ring | Progress toward daily goal |
| Macro bars | P / C / F progress |
| Meal sections | Collapsible: Breakfast, Lunch, Dinner, Snack |
| Add buttons | Per-meal quick add |
| Date navigation | Swipe or tap to change day |

#### Calculations

```typescript
interface DailySummary {
  date: string;                    // YYYY-MM-DD
  totalCalories: number;           // Sum of all log entries
  targetCalories: number;          // From UserGoals
  totalProtein: number;
  targetProtein: number;
  totalCarbs: number;
  targetCarbs: number;
  totalFat: number;
  targetFat: number;
  meals: {
    breakfast: LogEntry[];
    lunch: LogEntry[];
    dinner: LogEntry[];
    snack: LogEntry[];
  };
}
```

#### Over-Budget Display

**Important:** When user exceeds target:
- Ring continues to fill (can exceed 100%)
- No red color, no warning
- Show neutral text: "2,150 kcal (150 over target)"
- **Never:** Red numbers, warning icons, shame language

---

### 2.3 Custom Foods

#### P0: Create Custom Food

| Field | Required | Notes |
|-------|----------|-------|
| Name | Yes | User-provided name |
| Calories | Yes | Per serving |
| Serving size | Yes | Number + unit |
| Protein | No | Defaults to 0 |
| Carbs | No | Defaults to 0 |
| Fat | No | Defaults to 0 |

#### Custom Food Flow

```
1. User taps "Create Custom Food"
2. Enter name (required)
3. Enter serving size (e.g., "1 cup" or "100 g")
4. Enter calories (required)
5. Optionally enter macros
6. Save
7. Food available for logging immediately
```

---

### 2.4 Weight Tracking

#### P0: Weight Logging

| Requirement | Details |
|-------------|---------|
| Log weight | Numeric input with unit |
| One per day | Latest entry wins |
| Quick input | Use picker/roller, not keyboard |
| Default value | Last logged weight |

#### P1: Weight Progress

| Requirement | Details |
|-------------|---------|
| Weight chart | Line chart with time periods |
| Time periods | 7d, 30d, 90d, All |
| Trend line | 7-day moving average |
| Change display | "+/- X lbs this week" |

---

### 2.5 Progress & Analytics

#### P1: Calorie History

| Requirement | Details |
|-------------|---------|
| Calorie chart | Bar chart by day |
| Average display | "Avg: 1,850 kcal/day" |
| Goal line | Horizontal line at target |

#### P1: Macro Breakdown

| Requirement | Details |
|-------------|---------|
| Macro pie/bar | Visual breakdown |
| Percentage display | % of calories from P/C/F |
| Period selection | Day, Week, Month |

---

### 2.6 Settings

#### P0: User Preferences

| Setting | Type | Default |
|---------|------|---------|
| Daily calorie goal | number | 2000 |
| Protein goal | number | 50g |
| Carbs goal | number | 250g |
| Fat goal | number | 65g |
| Weight unit | kg / lbs | lbs |
| Energy unit | kcal / kJ | kcal |
| Theme | dark / light / auto | auto |

#### P0: Data Management

| Action | Details |
|--------|---------|
| Export data | JSON export of all user data |
| Delete all data | Confirmation required, irreversible |

---

## 3. Data Sources & APIs

### 3.1 Primary: Open Food Facts API

**Base URL:** `https://world.openfoodfacts.org/api/v2`

#### Get Product by Barcode

```
GET /product/{barcode}
```

**Response (relevant fields):**
```json
{
  "code": "3017624010701",
  "status": 1,
  "product": {
    "product_name": "Nutella",
    "brands": "Ferrero",
    "serving_size": "15 g",
    "nutriments": {
      "energy-kcal_100g": 539,
      "energy-kcal_serving": 81,
      "proteins_100g": 6.3,
      "proteins_serving": 0.95,
      "carbohydrates_100g": 57.5,
      "carbohydrates_serving": 8.6,
      "fat_100g": 30.9,
      "fat_serving": 4.6,
      "fiber_100g": 3.5,
      "sugars_100g": 56.3,
      "sodium_100g": 0.041
    }
  }
}
```

#### Search Products

```
GET /cgi/search.pl?search_terms={query}&json=1&page_size=20
```

#### Rate Limits & Best Practices

- No hard rate limits, but be respectful
- Include User-Agent: `NutritionRx/1.0 (contact@example.com)`
- Cache all successful responses locally
- Prefer per-100g values and calculate serving from there

#### Data Mapping

```typescript
function mapOpenFoodFactsToFoodItem(data: OFFProduct): FoodItem {
  const nutriments = data.nutriments;
  const servingSize = parseServingSize(data.serving_size); // e.g., "15 g" → { size: 15, unit: 'g' }
  
  return {
    id: generateUUID(),
    name: data.product_name,
    brand: data.brands,
    barcode: data.code,
    // Prefer per-serving if available, else calculate from per-100g
    calories: nutriments['energy-kcal_serving'] ?? (nutriments['energy-kcal_100g'] * servingSize.size / 100),
    protein: nutriments['proteins_serving'] ?? (nutriments['proteins_100g'] * servingSize.size / 100),
    carbs: nutriments['carbohydrates_serving'] ?? (nutriments['carbohydrates_100g'] * servingSize.size / 100),
    fat: nutriments['fat_serving'] ?? (nutriments['fat_100g'] * servingSize.size / 100),
    fiber: nutriments['fiber_100g'] ? nutriments['fiber_100g'] * servingSize.size / 100 : null,
    sugar: nutriments['sugars_100g'] ? nutriments['sugars_100g'] * servingSize.size / 100 : null,
    sodium: nutriments['sodium_100g'] ? nutriments['sodium_100g'] * servingSize.size * 1000 / 100 : null, // Convert to mg
    servingSize: servingSize.size,
    servingUnit: servingSize.unit,
    servingSizeGrams: servingSize.unit === 'g' ? servingSize.size : null,
    source: 'OpenFoodFacts',
    sourceId: data.code,
    isVerified: true,
    isUserCreated: false,
    isFavorite: false,
    lastUsedAt: null,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

---

### 3.2 Secondary: USDA FoodData Central (Future)

**For MVP:** Not implemented, but architecture supports it.

**Considerations:**
- Requires API key (free, 1000 requests/hour)
- Better for generic foods (apple, chicken breast)
- No barcode data
- Can download CSV for offline seeding

---

### 3.3 Offline Strategy

#### Initial Seed Data

Ship with pre-seeded database containing:
- 200-500 common generic foods (from USDA)
- Covers: fruits, vegetables, meats, dairy, grains, common snacks
- All marked as `source: 'USDA'`, `isVerified: true`

#### Runtime Caching

```
Barcode Scan:
1. Check local cache
2. If miss → API call → Cache result → Return
3. If API fails → Return null (show "not found")

Search:
1. Search local database only
2. Future: Optional "search online" button
```

#### Cache Invalidation

- No automatic invalidation (data rarely changes)
- User can manually refresh a cached food (V2)
- On data export/import, cache is preserved

---

## 4. Calculations & Formulas

### 4.1 Calorie Calculations

```typescript
// Daily totals
function calculateDailyTotals(entries: LogEntry[]): DailyTotals {
  return entries.reduce((acc, entry) => ({
    calories: acc.calories + entry.calories,
    protein: acc.protein + entry.protein,
    carbs: acc.carbs + entry.carbs,
    fat: acc.fat + entry.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

// Entry calculation (at log time)
function calculateEntryMacros(food: FoodItem, servings: number): MacroValues {
  return {
    calories: Math.round(food.calories * servings),
    protein: Math.round(food.protein * servings * 10) / 10,  // 1 decimal
    carbs: Math.round(food.carbs * servings * 10) / 10,
    fat: Math.round(food.fat * servings * 10) / 10,
  };
}
```

### 4.2 Macro Percentages

```typescript
// Macro percentage of total calories
function calculateMacroPercentages(totals: DailyTotals): MacroPercentages {
  const proteinCals = totals.protein * 4;
  const carbsCals = totals.carbs * 4;
  const fatCals = totals.fat * 9;
  const totalCals = proteinCals + carbsCals + fatCals;
  
  if (totalCals === 0) return { protein: 0, carbs: 0, fat: 0 };
  
  return {
    protein: Math.round((proteinCals / totalCals) * 100),
    carbs: Math.round((carbsCals / totalCals) * 100),
    fat: Math.round((fatCals / totalCals) * 100),
  };
}
```

### 4.3 Weight Trend (Moving Average)

```typescript
function calculateWeightTrend(entries: WeightEntry[], windowDays: number = 7): number[] {
  // Sort by date ascending
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  
  return sorted.map((_, index, arr) => {
    const start = Math.max(0, index - windowDays + 1);
    const window = arr.slice(start, index + 1);
    const sum = window.reduce((acc, e) => acc + e.weight, 0);
    return sum / window.length;
  });
}
```

### 4.4 Unit Conversions

```typescript
const CONVERSIONS = {
  weight: {
    kg_to_lbs: 2.20462,
    lbs_to_kg: 0.453592,
  },
  energy: {
    kcal_to_kj: 4.184,
    kj_to_kcal: 0.239006,
  },
  volume: {
    cup_to_ml: 240,
    tbsp_to_ml: 15,
    tsp_to_ml: 5,
    fl_oz_to_ml: 29.5735,
  },
  mass: {
    oz_to_g: 28.3495,
    lb_to_g: 453.592,
  },
};

function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  if (from === 'kg' && to === 'lbs') return value * CONVERSIONS.weight.kg_to_lbs;
  if (from === 'lbs' && to === 'kg') return value * CONVERSIONS.weight.lbs_to_kg;
  throw new Error(`Unknown conversion: ${from} to ${to}`);
}
```

---

## 5. State Management

### 5.1 Zustand Stores

#### FoodLogStore

```typescript
interface FoodLogState {
  // Current day being viewed
  currentDate: string; // YYYY-MM-DD
  
  // Cached daily data
  dailySummary: DailySummary | null;
  
  // Loading states
  isLoading: boolean;
  
  // Actions
  setCurrentDate: (date: string) => void;
  loadDailySummary: (date: string) => Promise<void>;
  addLogEntry: (entry: Omit<LogEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLogEntry: (id: string, updates: Partial<LogEntry>) => Promise<void>;
  deleteLogEntry: (id: string) => Promise<void>;
  quickAdd: (entry: Omit<QuickAddEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}
```

#### UserSettingsStore

```typescript
interface UserSettingsState {
  goals: UserGoals;
  isLoading: boolean;
  
  // Actions
  loadGoals: () => Promise<void>;
  updateGoals: (updates: Partial<UserGoals>) => Promise<void>;
}
```

#### FoodSearchStore

```typescript
interface FoodSearchState {
  query: string;
  results: FoodItem[];
  recentFoods: FoodItem[];
  frequentFoods: FoodItem[];
  isSearching: boolean;
  
  // Actions
  setQuery: (query: string) => void;
  search: () => Promise<void>;
  loadRecent: () => Promise<void>;
  loadFrequent: () => Promise<void>;
  scanBarcode: (barcode: string) => Promise<FoodItem | null>;
}
```

---

## 6. Navigation Structure

### 6.1 Tab Navigator

```
(tabs)
├── Today (index)       → Daily log, calorie ring, meal sections
├── Progress (progress) → Weight chart, calorie history
└── Settings (settings) → Goals, preferences, data
```

**Note:** 3 tabs for MVP simplicity. No "Discover" or "Community" tabs.

### 6.2 Stack Navigation

```
Root Stack
├── (tabs)                    # Tab navigator
├── add-food                  # Add food modal
│   ├── search                # Search tab
│   ├── scan                  # Barcode scanner
│   ├── recent                # Recent foods
│   └── create                # Create custom food
├── food/[id]                 # Food detail (before logging)
├── log-entry/[id]            # Edit log entry
├── log-weight                # Log weight modal
├── settings/goals            # Edit goals
├── settings/units            # Change units
├── settings/data             # Export/delete data
└── settings/about            # App info
```

---

## 7. Explicitly Deferred (V2+)

The following features are **not** in MVP scope:

| Feature | Reason |
|---------|--------|
| User accounts | Privacy-first, offline-first MVP |
| Cloud sync | Requires accounts |
| Recipe builder | Complex, not essential for logging |
| Meal planning | Out of scope for tracker |
| Water tracking | Can add later |
| Micronutrients (vitamins/minerals) | Adds complexity |
| AI photo recognition | Requires cloud service |
| Social features | Against design philosophy |
| Gamification (streaks, badges) | Against design philosophy |
| Apple Health / Google Fit sync | Adds complexity |
| Export to other apps | Nice-to-have |
| Intermittent fasting timer | Separate feature |
| Shopping lists | Out of scope |
| Exercise tracking | Separate app (GymRx) |
| Calorie burn adjustment | Requires fitness integration |

---

## 8. Testing Requirements

### 8.1 Unit Tests

| Area | Coverage Target |
|------|-----------------|
| Calorie calculations | 100% |
| Macro calculations | 100% |
| Unit conversions | 100% |
| Data mapping (API → Model) | 100% |
| Search algorithm | 90% |

### 8.2 Integration Tests

| Flow | Coverage |
|------|----------|
| Log food via search | Happy path + edge cases |
| Log food via barcode | Found, not found, API error |
| Quick add | Happy path |
| Edit/delete log entry | Happy path |
| Weight logging | Happy path |
| Daily summary calculation | Multiple meals, empty day |

### 8.3 E2E Tests

| Scenario | Priority |
|----------|----------|
| First launch → log first food | P0 |
| Barcode scan → log food | P0 |
| View daily summary | P0 |
| Change date → see different day | P1 |
| Log weight → see on chart | P1 |

---

## 9. Performance Requirements

### 9.1 Targets

| Metric | Target |
|--------|--------|
| App launch to usable | < 2 seconds |
| Food search response | < 200ms (local) |
| Barcode scan to result | < 3 seconds (with API) |
| Daily summary load | < 100ms |
| Chart render | < 300ms |

### 9.2 Database

| Consideration | Approach |
|---------------|----------|
| Food cache size | Keep all (no eviction for MVP) |
| Log entry limit | None (SQLite handles millions) |
| Index strategy | See entity sections |
| Query optimization | Precompute daily totals on write |

---

## 10. Security & Privacy

### 10.1 Data Storage

| Data Type | Storage | Encryption |
|-----------|---------|------------|
| Food log | SQLite (local) | Device encryption only |
| Weight entries | SQLite (local) | Device encryption only |
| User goals | SQLite (local) | Device encryption only |
| Food cache | SQLite (local) | Device encryption only |

### 10.2 Network

| Endpoint | Data Sent | Privacy Impact |
|----------|-----------|----------------|
| Open Food Facts | Barcode only | Low (no user data) |

### 10.3 Privacy Principles

- No user accounts required
- No data leaves device except barcode lookups
- No analytics/tracking in MVP
- User can delete all data with one action
- Export gives user full data ownership

---

## 11. Accessibility Requirements

### 11.1 Targets

| Standard | Level |
|----------|-------|
| WCAG | 2.1 AA |
| iOS | VoiceOver compatible |
| Android | TalkBack compatible |

### 11.2 Specific Requirements

| Requirement | Details |
|-------------|---------|
| Color contrast | 4.5:1 minimum |
| Touch targets | 44x44pt minimum |
| Screen reader labels | All interactive elements |
| Motion | Respect reduced-motion preference |
| Font scaling | Support dynamic type |

---

## Appendix A: Entity Relationship Diagram

```
┌──────────────────────┐
│      FoodItem        │
├──────────────────────┤
│ id (PK)              │
│ name                 │
│ brand                │
│ barcode (unique)     │
│ calories             │
│ protein              │
│ carbs                │
│ fat                  │
│ fiber                │
│ sugar                │
│ sodium               │
│ servingSize          │
│ servingUnit          │
│ servingSizeGrams     │
│ source               │
│ sourceId             │
│ isVerified           │
│ isUserCreated        │
│ isFavorite           │
│ lastUsedAt           │
│ usageCount           │
│ timestamps...        │
└──────────┬───────────┘
           │ 1:N
           ▼
┌──────────────────────┐
│      LogEntry        │
├──────────────────────┤
│ id (PK)              │
│ foodItemId (FK)      │
│ date                 │
│ mealType             │
│ servings             │
│ calories             │
│ protein              │
│ carbs                │
│ fat                  │
│ notes                │
│ timestamps...        │
└──────────────────────┘

┌──────────────────────┐
│    QuickAddEntry     │
├──────────────────────┤
│ id (PK)              │
│ date                 │
│ mealType             │
│ description          │
│ calories             │
│ protein              │
│ carbs                │
│ fat                  │
│ timestamps...        │
└──────────────────────┘

┌──────────────────────┐
│     WeightEntry      │
├──────────────────────┤
│ id (PK)              │
│ date (unique)        │
│ weight               │
│ unit                 │
│ notes                │
│ timestamps...        │
└──────────────────────┘

┌──────────────────────┐
│      UserGoals       │
├──────────────────────┤
│ id (PK, singleton)   │
│ dailyCalories        │
│ proteinGrams         │
│ carbsGrams           │
│ fatGrams             │
│ weightUnit           │
│ energyUnit           │
│ timestamps...        │
└──────────────────────┘
```

---

## Appendix B: Sample API Responses

### Open Food Facts - Success

```json
{
  "code": "0070470496528",
  "status": 1,
  "status_verbose": "product found",
  "product": {
    "product_name": "Chunky Peanut Butter",
    "brands": "Jif",
    "serving_size": "2 tbsp (32g)",
    "nutriments": {
      "energy-kcal_100g": 594,
      "energy-kcal_serving": 190,
      "proteins_100g": 25,
      "proteins_serving": 8,
      "carbohydrates_100g": 18.75,
      "carbohydrates_serving": 6,
      "sugars_100g": 9.38,
      "sugars_serving": 3,
      "fat_100g": 50,
      "fat_serving": 16,
      "saturated-fat_100g": 9.38,
      "saturated-fat_serving": 3,
      "fiber_100g": 6.25,
      "fiber_serving": 2,
      "sodium_100g": 0.406,
      "sodium_serving": 0.13
    }
  }
}
```

### Open Food Facts - Not Found

```json
{
  "code": "1234567890123",
  "status": 0,
  "status_verbose": "product not found"
}
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-25 | Initial specification |
