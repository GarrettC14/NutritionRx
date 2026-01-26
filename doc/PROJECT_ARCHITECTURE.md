# NutritionRx Project Architecture

## Overview

This document defines the folder structure, coding conventions, and architectural patterns for the NutritionRx mobile app.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native (Expo) |
| Language | TypeScript |
| Navigation | Expo Router |
| State Management | Zustand |
| Database | SQLite (expo-sqlite) |
| Charts (iOS) | SwiftUI Charts (native module) |
| Charts (Android) | Jetpack Compose Charts (native module) |
| Styling | StyleSheet + Design Tokens |
| Barcode Scanning | expo-barcode-scanner |
| HTTP | fetch (native) |

---

## Folder Structure

```
src/
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Tab navigator
│   │   ├── index.tsx             # Today screen
│   │   ├── progress.tsx          # Progress screen (charts, analytics)
│   │   └── settings.tsx          # Settings screen
│   ├── onboarding/               # Goals onboarding flow
│   │   ├── index.tsx             # Welcome screen
│   │   ├── basic-info.tsx        # Sex, date of birth
│   │   ├── body-stats.tsx        # Height, weight
│   │   ├── activity.tsx          # Activity level
│   │   ├── goal.tsx              # Goal selection
│   │   ├── rate.tsx              # Rate of change
│   │   ├── target-weight.tsx     # Target weight (optional)
│   │   └── summary.tsx           # Plan summary
│   ├── add-food/                 # Add food flow
│   │   ├── index.tsx             # Search/tabs
│   │   ├── scan.tsx              # Barcode scanner
│   │   ├── recent.tsx            # Recent foods
│   │   └── create.tsx            # Create custom food
│   ├── food/
│   │   └── [id].tsx              # Food detail/confirm
│   ├── log-entry/
│   │   └── [id].tsx              # Edit log entry
│   ├── log-weight.tsx            # Log weight modal
│   ├── weekly-reflection.tsx     # Weekly reflection modal
│   ├── settings/
│   │   ├── goals.tsx             # Edit goals
│   │   ├── profile.tsx           # Edit profile stats
│   │   ├── units.tsx             # Change units
│   │   ├── data.tsx              # Export/delete
│   │   └── about.tsx             # App info
│   ├── _layout.tsx               # Root layout
│   └── +not-found.tsx            # 404 screen
│
├── components/                    # Reusable UI components
│   ├── ui/                       # Primitive components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Text.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── SegmentedControl.tsx
│   │   └── ...
│   ├── food/                     # Food-specific components
│   │   ├── FoodItem.tsx
│   │   ├── FoodSearch.tsx
│   │   ├── BarcodeScanner.tsx
│   │   ├── MacroBar.tsx
│   │   └── ServingPicker.tsx
│   ├── log/                      # Logging components
│   │   ├── MealSection.tsx
│   │   ├── LogEntryRow.tsx
│   │   ├── QuickAddSheet.tsx
│   │   └── DailySummary.tsx
│   ├── progress/                 # Progress/chart components
│   │   ├── CalorieRing.tsx
│   │   ├── MacroBreakdown.tsx
│   │   ├── GoalProgressCard.tsx
│   │   └── WeeklyInsights.tsx
│   ├── charts/                   # Native chart wrappers
│   │   ├── WeightTrendChart.tsx  # Weight + trend line + goal
│   │   ├── MetabolismChart.tsx   # Daily burn over time
│   │   ├── CalorieIntakeChart.tsx # Daily intake vs target
│   │   ├── GoalProgressChart.tsx # Waterfall progress
│   │   └── MacroChart.tsx        # Macro distribution
│   ├── onboarding/               # Onboarding components
│   │   ├── OnboardingStep.tsx
│   │   ├── ActivityLevelPicker.tsx
│   │   ├── GoalTypePicker.tsx
│   │   ├── RatePicker.tsx
│   │   └── PlanSummary.tsx
│   └── layout/                   # Layout components
│       ├── Screen.tsx
│       ├── Header.tsx
│       └── TabBar.tsx
│
├── stores/                       # Zustand stores
│   ├── foodLogStore.ts           # Daily food log state
│   ├── foodSearchStore.ts        # Search state
│   ├── weightStore.ts            # Weight entries
│   ├── settingsStore.ts          # User preferences
│   ├── profileStore.ts           # User profile (sex, height, DOB)
│   ├── goalStore.ts              # Active goal + targets
│   └── analyticsStore.ts         # Computed analytics (TDEE, trends)
│
├── services/                     # Business logic
│   ├── foodService.ts            # Food operations
│   ├── logService.ts             # Log entry operations
│   ├── weightService.ts          # Weight operations
│   ├── searchService.ts          # Search logic
│   ├── barcodeService.ts         # Barcode lookup
│   ├── goalService.ts            # Goal management
│   ├── tdeeService.ts            # TDEE calculation + adaptive logic
│   ├── weeklyReflectionService.ts # Weekly reflection logic
│   ├── trendService.ts           # Weight trend calculation
│   └── exportService.ts          # Data export
│
├── repositories/                 # Data access layer
│   ├── foodRepository.ts
│   ├── logEntryRepository.ts
│   ├── quickAddRepository.ts
│   ├── weightRepository.ts
│   ├── profileRepository.ts      # User profile persistence
│   ├── goalRepository.ts         # Goals + reflections
│   └── metabolismRepository.ts   # Daily metabolism data
│
├── api/                          # External API clients
│   └── openFoodFactsApi.ts
│
├── db/                           # Database setup
│   ├── database.ts               # SQLite connection
│   ├── migrations/               # Schema migrations
│   │   ├── 001_initial.ts
│   │   └── ...
│   └── seed/                     # Seed data
│       └── commonFoods.ts
│
├── hooks/                        # Custom React hooks
│   ├── useDatabase.ts
│   ├── useDailySummary.ts
│   ├── useWeightTrend.ts
│   └── useBarcodeScanner.ts
│
├── types/                        # TypeScript types
│   ├── domain.ts                 # Domain models
│   ├── api.ts                    # API response types
│   └── navigation.ts             # Navigation params
│
├── utils/                        # Utility functions
│   ├── calculations.ts           # Calorie/macro math
│   ├── conversions.ts            # Unit conversions
│   ├── formatters.ts             # Display formatting
│   ├── dateUtils.ts              # Date helpers
│   └── validation.ts             # Input validation
│
├── constants/                    # App constants
│   ├── colors.ts                 # Color tokens
│   ├── typography.ts             # Typography tokens
│   ├── spacing.ts                # Spacing tokens
│   ├── mealTypes.ts              # Meal type enum
│   └── defaults.ts               # Default values
│
└── native/                       # Native modules
    ├── charts/                   # Chart implementations
    │   ├── ios/                  # SwiftUI Charts
    │   └── android/              # Compose Charts
    └── ...
```

---

## Naming Conventions

### Files and Folders

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `FoodItem.tsx`, `CalorieRing.tsx` |
| Hooks | camelCase with `use` prefix | `useDailySummary.ts` |
| Services | camelCase with `Service` suffix | `foodService.ts` |
| Repositories | camelCase with `Repository` suffix | `foodRepository.ts` |
| Stores | camelCase with `Store` suffix | `foodLogStore.ts` |
| Utils | camelCase | `calculations.ts` |
| Types | camelCase | `domain.ts` |
| Constants | camelCase | `colors.ts` |

### Code

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `FoodItem` |
| Hooks | camelCase | `useDailySummary` |
| Functions | camelCase | `calculateMacros` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_CALORIES` |
| Types/Interfaces | PascalCase | `FoodItem` |
| Enums | PascalCase | `MealType` |
| Enum values | PascalCase | `MealType.Breakfast` |
| Database columns | snake_case | `created_at` |
| TypeScript properties | camelCase | `createdAt` |

### Database to TypeScript Mapping

```typescript
// Database row (snake_case)
interface FoodItemRow {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: number;
  serving_unit: string;
  source: string;
  is_verified: number;       // SQLite uses 0/1 for boolean
  is_user_created: number;
  is_favorite: number;
  last_used_at: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// Domain model (camelCase)
interface FoodItem {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  source: DataSource;
  isVerified: boolean;
  isUserCreated: boolean;
  isFavorite: boolean;
  lastUsedAt: Date | null;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Layer Responsibilities

### 1. Screens (app/)

- Compose components into full screens
- Connect to stores
- Handle navigation
- Minimal business logic

### 2. Components (components/)

- Reusable UI elements
- Receive data via props
- Emit events via callbacks
- No direct store access (passed as props)

### 3. Stores (stores/)

- Global state management
- Orchestrate service calls
- Cache computed values
- Expose loading/error states

### 4. Services (services/)

- Business logic
- Coordinate repository calls
- Handle API interactions
- Data transformation

### 5. Repositories (repositories/)

- Direct database access
- CRUD operations
- SQL queries
- Row ↔ Model mapping

### 6. API (api/)

- External API clients
- Request/response handling
- Error normalization

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         Screen                               │
│    (reads from store, dispatches actions)                   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                         Store                                │
│    (manages state, calls services)                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                        Service                               │
│    (business logic, orchestration)                          │
└─────────────┬───────────────────────────────┬───────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│      Repository         │     │           API               │
│   (database access)     │     │    (external services)      │
└─────────────────────────┘     └─────────────────────────────┘
```

---

## Service Interface Example

```typescript
// services/logService.ts

import { logEntryRepository } from '@/repositories/logEntryRepository';
import { foodRepository } from '@/repositories/foodRepository';
import { calculateEntryMacros } from '@/utils/calculations';

export interface LogFoodInput {
  foodItemId: string;
  date: string;
  mealType: MealType;
  servings: number;
  notes?: string;
}

export const logService = {
  async logFood(input: LogFoodInput): Promise<LogEntry> {
    // Get food item
    const food = await foodRepository.findById(input.foodItemId);
    if (!food) throw new Error('Food not found');
    
    // Calculate macros
    const macros = calculateEntryMacros(food, input.servings);
    
    // Create log entry
    const entry = await logEntryRepository.create({
      ...input,
      ...macros,
    });
    
    // Update food usage stats
    await foodRepository.recordUsage(input.foodItemId);
    
    return entry;
  },
  
  async getDailySummary(date: string): Promise<DailySummary> {
    const entries = await logEntryRepository.findByDate(date);
    const quickAdds = await quickAddRepository.findByDate(date);
    
    // ... calculate totals
    
    return summary;
  },
  
  // ... other methods
};
```

---

## Store Example

```typescript
// stores/foodLogStore.ts

import { create } from 'zustand';
import { logService } from '@/services/logService';

interface FoodLogState {
  currentDate: string;
  dailySummary: DailySummary | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentDate: (date: string) => void;
  loadDailySummary: () => Promise<void>;
  logFood: (input: LogFoodInput) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}

export const useFoodLogStore = create<FoodLogState>((set, get) => ({
  currentDate: getTodayString(),
  dailySummary: null,
  isLoading: false,
  error: null,
  
  setCurrentDate: (date) => {
    set({ currentDate: date });
    get().loadDailySummary();
  },
  
  loadDailySummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const summary = await logService.getDailySummary(get().currentDate);
      set({ dailySummary: summary, isLoading: false });
    } catch (e) {
      set({ error: e.message, isLoading: false });
    }
  },
  
  logFood: async (input) => {
    await logService.logFood({ ...input, date: get().currentDate });
    await get().loadDailySummary();
  },
  
  deleteEntry: async (id) => {
    await logService.deleteEntry(id);
    await get().loadDailySummary();
  },
}));
```

---

## Database Migration System

```typescript
// db/migrations/001_initial.ts

import { SQLiteDatabase } from 'expo-sqlite';

export const migration001 = {
  version: 1,
  up: async (db: SQLiteDatabase) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS food_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT,
        barcode TEXT UNIQUE,
        calories REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        fiber REAL,
        sugar REAL,
        sodium REAL,
        serving_size REAL NOT NULL,
        serving_unit TEXT NOT NULL,
        serving_size_grams REAL,
        source TEXT NOT NULL,
        source_id TEXT,
        is_verified INTEGER DEFAULT 0,
        is_user_created INTEGER DEFAULT 0,
        is_favorite INTEGER DEFAULT 0,
        last_used_at TEXT,
        usage_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      CREATE INDEX idx_food_items_barcode ON food_items(barcode);
      CREATE INDEX idx_food_items_name ON food_items(name);
      CREATE INDEX idx_food_items_favorite ON food_items(is_favorite, name);
      CREATE INDEX idx_food_items_recent ON food_items(last_used_at);
      CREATE INDEX idx_food_items_frequent ON food_items(usage_count);
      
      CREATE TABLE IF NOT EXISTS log_entries (
        id TEXT PRIMARY KEY,
        food_item_id TEXT NOT NULL,
        date TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        servings REAL NOT NULL,
        calories REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (food_item_id) REFERENCES food_items(id)
      );
      
      CREATE INDEX idx_log_entries_date ON log_entries(date);
      CREATE INDEX idx_log_entries_date_meal ON log_entries(date, meal_type);
      
      CREATE TABLE IF NOT EXISTS quick_add_entries (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        description TEXT,
        calories REAL NOT NULL,
        protein REAL,
        carbs REAL,
        fat REAL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      CREATE INDEX idx_quick_add_date ON quick_add_entries(date);
      
      CREATE TABLE IF NOT EXISTS weight_entries (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        weight REAL NOT NULL,
        unit TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      CREATE INDEX idx_weight_entries_date ON weight_entries(date);
      
      CREATE TABLE IF NOT EXISTS user_goals (
        id TEXT PRIMARY KEY,
        daily_calories REAL NOT NULL,
        protein_grams REAL NOT NULL,
        carbs_grams REAL NOT NULL,
        fat_grams REAL NOT NULL,
        weight_unit TEXT NOT NULL,
        energy_unit TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  },
};
```

---

## Build Phases

### Phase 1: Project Setup (Week 1)
1. Initialize Expo project with TypeScript
2. Set up folder structure
3. Configure Expo Router navigation
4. Set up SQLite database with migrations
5. Create design token constants
6. Implement database migration system
7. Seed common foods data

### Phase 2: Core Data Layer (Week 2)
1. Implement all repositories (including profile, goal, metabolism)
2. Create TypeScript types for all entities
3. Implement services with business logic
4. Create Zustand stores
5. Test database operations

### Phase 3: Food Management (Week 3)
1. Food search screen
2. Food detail screen
3. Create custom food flow
4. Recent food lists

### Phase 4: Barcode Scanning (Week 4)
1. Barcode scanner component
2. Open Food Facts API integration
3. Local caching of scanned foods
4. Not-found handling flow
5. Offline fallback

### Phase 5: Food Logging (Week 5)
1. Today screen with meal sections
2. Add food flow (search, scan, recent)
3. Serving size picker
4. Quick add feature
5. Edit/delete log entries
6. Daily summary calculation

### Phase 6: Goals & Onboarding (Week 6)
1. Goals onboarding flow (8 screens)
2. TDEE calculation service (Mifflin-St Jeor)
3. Profile + Goal stores
4. Weight entry screen
5. Weight trend calculation
6. Skip onboarding flow for "just track" users

### Phase 7: Adaptive Logic & Native Charts (Week 7)
1. Weekly reflection service
2. Adaptive TDEE recalculation
3. Weight trend chart (native)
4. Metabolism chart (native)
5. Goal progress chart (native)
6. Calorie intake chart (native)
7. Weekly reflection modal

### Phase 8: Settings & Polish (Week 8)
1. Goals settings screen
2. Profile editing
3. Units preferences
4. Data export (JSON)
5. Delete all data
6. About screen
7. Final polish and testing

---

## Native Charts (SwiftUI / Jetpack Compose)

Charts are implemented natively for best performance and to match the GymRx ecosystem.

### Chart Types

| Chart | Purpose | Data |
|-------|---------|------|
| **WeightTrendChart** | Raw weights + smoothed trend + goal line | WeightEntry[], trendWeights[], goalWeight |
| **MetabolismChart** | Daily burn over time as we learn your body | DailyMetabolism[], initialEstimate |
| **CalorieIntakeChart** | Daily intake vs target | DailyIntake[], targetCalories |
| **GoalProgressChart** | Waterfall showing weekly progress | WeeklyProgress[], totalGoal |
| **MacroChart** | Macro distribution (pie/bar) | protein, carbs, fat (current & target) |

### Native Module Interface

```typescript
// types/charts.ts

interface ChartDataPoint {
  date: string;      // ISO date string
  value: number;
  label?: string;
}

interface WeightTrendChartProps {
  rawWeights: ChartDataPoint[];
  trendWeights: ChartDataPoint[];
  goalWeight?: number;
  startWeight?: number;
  timeRange: '7d' | '30d' | '90d' | 'all';
  onPointTap?: (point: ChartDataPoint) => void;
}

interface MetabolismChartProps {
  dailyBurn: ChartDataPoint[];
  initialEstimate: number;
  timeRange: '7d' | '30d' | '90d' | 'all';
}

interface CalorieIntakeChartProps {
  intake: ChartDataPoint[];
  target: number;
  timeRange: '7d' | '30d' | '90d';
}

interface GoalProgressChartProps {
  weeklyProgress: Array<{
    week: number;
    change: number;
    isPositive: boolean;
  }>;
  totalGoal: number;
  currentProgress: number;
}
```

### Chart Colors (Design Tokens)

```typescript
const CHART_COLORS = {
  // Primary data
  primary: '#64B5F6',        // Ice Blue
  primaryGradient: ['#64B5F6', 'rgba(100, 181, 246, 0.1)'],
  
  // Weight chart
  rawWeight: 'rgba(255, 255, 255, 0.4)',
  trendLine: '#64B5F6',
  goalLine: 'rgba(129, 199, 132, 0.6)',
  
  // Metabolism chart
  dailyBurn: '#64B5F6',
  initialEstimate: 'rgba(255, 255, 255, 0.3)',
  
  // Calorie intake chart
  underTarget: '#64B5F6',
  atTarget: '#81C784',
  overTarget: 'rgba(255, 255, 255, 0.5)', // NOT red
  targetLine: 'rgba(255, 255, 255, 0.6)',
  
  // Goal progress
  progress: '#81C784',
  remaining: 'rgba(255, 255, 255, 0.2)',
  setback: '#FFB74D',
  
  // Macros
  protein: '#64B5F6',
  carbs: '#81C784',
  fat: '#FFB74D',
  
  // Grid/axes
  grid: 'rgba(255, 255, 255, 0.1)',
  axis: 'rgba(255, 255, 255, 0.3)',
  label: 'rgba(255, 255, 255, 0.6)',
};
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-25 | Initial specification |
| 1.1 | 2026-01-25 | Added Goals feature, native charts |
