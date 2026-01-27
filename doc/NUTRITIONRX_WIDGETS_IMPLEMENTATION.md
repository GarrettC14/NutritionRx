# NutritionRx: Home Screen Widgets Implementation

> **How to Use This Document**
> 1. Copy the relevant "Claude Code Prompt" sections below and paste into your IDE
> 2. Work through phases in order - each builds on the previous
> 3. Reference the component specs when Claude needs design details
> 4. Use the checklist to track progress

---

## Prerequisites

Before starting widget implementation, ensure:
- [ ] React Native project with Expo (SDK 50+)
- [ ] TypeScript configured
- [ ] Zustand stores for nutrition and water data
- [ ] Deep linking configured in app
- [ ] EAS Build configured (widgets require native code)

---

## Claude Code Prompts

### Prompt 1: Infrastructure Setup

```
I need to add home screen widget support to my NutritionRx React Native/Expo app.

First, let's set up the infrastructure:

1. Create a native module bridge for widget data sync at:
   - src/native/NutritionWidgetBridge.ts

2. The bridge should export:
   - updateNutritionWidgetData(data: NutritionWidgetData): Promise<void>
   - refreshNutritionWidgets(): Promise<void>

3. Create the NutritionWidgetData interface with:
   - today: {
       calories: { consumed: number, target: number },
       protein: { consumed: number, target: number },
       carbs: { consumed: number, target: number },
       fat: { consumed: number, target: number }
     }
   - water: { consumed: number, goal: number, glassSize: number }
   - frequentFoods: Array<{ foodId, name, emoji, calories, defaultServingId }>

4. Create a useNutritionWidgetSync hook at src/hooks/useNutritionWidgetSync.ts that:
   - Syncs widget data on app launch
   - Syncs when app returns to foreground
   - Syncs when food is logged or deleted
   - Syncs when water is logged
   - Exports a syncWidgetData function for manual sync

Use these colors (Nourished Calm palette):
- Background: #FDF6E3 (warm cream)
- Primary: #4ECDC4 (soft teal)
- Protein: #FF6B6B (coral)
- Carbs: #4ECDC4 (teal)
- Fat: #FFE66D (soft yellow)
- Water: #7EC8E3 (water blue)
- Text: #2D3436 (charcoal)

Don't create the native iOS/Android code yet - just the React Native TypeScript side.
```

### Prompt 2: iOS Calorie Ring Widget

```
Create the iOS Calorie Ring widget for NutritionRx.

Create the following structure in the ios/ folder:
- ios/NutritionRxWidgets/
  - NutritionRxWidgets.swift (widget bundle entry point)
  - CalorieRingWidget.swift (small widget - 158x158pt)
  - WidgetDataProvider.swift (shared data fetching from App Groups)
  - WidgetColors.swift (design tokens)

The CalorieRingWidget should:
1. Show a progress ring with calories consumed / target
2. Display remaining calories (or "X over" if exceeded) in center
3. Use App Groups to read data from the main app
4. Deep link to nutritionrx://diary on tap

App Group ID: group.com.yourcompany.nutritionrx

Design specs for the ring:
- Outer radius: 48pt
- Stroke width: 10pt
- Track color: rgba(78, 205, 196, 0.2)
- Fill color: #4ECDC4 (teal)
- Over target: continue filling with #F4A261 (amber)

Display logic:
- If remaining > 0: show "{remaining}" with "remaining" label
- If remaining <= 0: show "{Math.abs(remaining)}" with "over" label
```

### Prompt 3: iOS Water Tracker Widget

```
Create the iOS Water Tracker widget for NutritionRx.

Add to ios/NutritionRxWidgets/:
- WaterTrackerWidget.swift (small widget - 158x158pt)

The WaterTrackerWidget should:
1. Show water drop emojis in a 2x4 grid (💧 for filled, ○ for empty)
2. Display "X / Y glasses" below the grid
3. Include an "Add" button (iOS 17+ interactive widget with AppIntent)
4. Deep link to nutritionrx://water on tap

For iOS 17+ interactivity, create:
- AddWaterIntent.swift - AppIntent that adds one glass of water

The intent should:
1. Read current water data from App Groups
2. Increment the glass count
3. Save back to App Groups
4. Return success

Colors:
- Filled drop: #7EC8E3
- Empty circle: #E0E0E0
- Background: Match system (light/dark mode aware)
- Add button: #4ECDC4 teal
```

### Prompt 4: iOS Macros Overview Widget

```
Create the iOS Macros Overview widget for NutritionRx.

Add to ios/NutritionRxWidgets/:
- MacrosOverviewWidget.swift (medium widget - 338x158pt)

The MacrosOverviewWidget should display:
1. Header: "NutritionRx" left, "{consumed} / {target}" calories right
2. Three horizontal progress bars:
   - Protein: coral (#FF6B6B) - "{consumed}g / {target}g"
   - Carbs: teal (#4ECDC4) - "{consumed}g / {target}g"
   - Fat: yellow (#FFE66D) - "{consumed}g / {target}g"
3. "Log Food" button at bottom

Progress bar specs:
- Height: 8pt
- Corner radius: 4pt
- Track: 15% opacity of each color
- Fill: solid color

Button deep links to: nutritionrx://add-food

Layout:
- 16pt padding all around
- 8pt spacing between rows
- Labels left-aligned, values right-aligned
```

### Prompt 5: Connect Widget Bridge to Native

```
Connect the React Native NutritionWidgetBridge to the native iOS module.

1. Create ios/NutritionRx/NutritionWidgetModule.swift:
   - @objc(NutritionWidgetModule) class
   - Export "updateWidgetData" method that takes JSON string
   - Parse JSON and save to App Groups UserDefaults with key "nutritionWidgetData"
   - Call WidgetCenter.shared.reloadAllTimelines()

2. Create ios/NutritionRx/NutritionWidgetModule.m:
   - RCT_EXTERN_MODULE declarations
   - Bridge the Swift methods to React Native

3. Update src/native/NutritionWidgetBridge.ts to:
   - Import NativeModules
   - Call the native methods with proper error handling
   - Add Platform.OS === 'ios' checks

4. Update useNutritionWidgetSync to trigger sync when:
   - Food is logged (subscribe to nutrition store)
   - Food is deleted
   - Water is added
   - Daily goals change
   - Day changes (midnight)
```

### Prompt 6: Deep Linking

```
Set up deep linking for NutritionRx widgets.

1. Add URL scheme to ios/NutritionRx/Info.plist:
   - Scheme: nutritionrx

2. Create src/navigation/linking.ts with:
   - prefixes: ['nutritionrx://']
   - config mapping:
     - 'diary' -> Diary screen
     - 'add-food' -> Add Food screen
     - 'scan' -> Barcode Scanner screen
     - 'water' -> Water tracking section
     - 'water/add' -> Log water and go to diary
     - 'quick-log' -> Quick log handler (with foodId, servingId params)

3. Create src/screens/QuickLogHandler.tsx:
   - Read foodId and servingId from route params
   - Call nutritionStore.logFood(foodId, servingId)
   - Show toast: "Food logged!"
   - Navigate to Diary

4. Update App.tsx to use the linking config with React Navigation
```

---

## Overview

Implement iOS and Android home screen widgets for NutritionRx following the "Nourished Calm" design philosophy. Widgets provide quick access to calorie/macro tracking and water logging without opening the app.

---

## Design System Reference

### Colors (Nourished Calm Palette)
```typescript
const widgetColors = {
  // Backgrounds
  background: '#FDF6E3',          // Warm cream
  backgroundSecondary: '#F5EDD6', // Slightly darker cream
  backgroundDark: '#1A1A2E',      // Dark mode background
  
  // Accent
  primary: '#4ECDC4',             // Soft teal
  primaryMuted: 'rgba(78, 205, 196, 0.2)',
  
  // Macros
  protein: '#FF6B6B',             // Coral red
  carbs: '#4ECDC4',               // Teal
  fat: '#FFE66D',                 // Soft yellow
  
  // Text
  textPrimary: '#2D3436',         // Charcoal
  textSecondary: '#636E72',       // Gray
  textPrimaryDark: '#E0E1DD',     // Off-white (dark mode)
  
  // States
  success: '#4ECDC4',             // Goal met
  water: '#7EC8E3',               // Water blue
};
```

### Typography
```typescript
const widgetTypography = {
  largeNumber: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'SF Pro Display',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'SF Pro Text',
  },
  caption: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'SF Pro Text',
  },
};
```

---

## Widget Specifications

### Widget 1: Calorie Ring (Small - 158×158pt)

**Purpose:** Show daily calorie progress at a glance

**Visual Layout:**
```
┌─────────────────────────┐
│                         │
│      ┌─────────┐        │
│      │  1,450  │        │
│      │remaining│        │
│      └─────────┘        │
│     [Progress Ring]     │
│                         │
│      NutritionRx        │
└─────────────────────────┘
```

**Data Requirements:**
```typescript
interface CalorieRingData {
  consumed: number;       // Calories eaten today
  target: number;         // Daily calorie goal
  remaining: number;      // target - consumed (can be negative)
}
```

**Ring Specifications:**
- Outer radius: 48pt
- Stroke width: 10pt
- Background track: `primaryMuted`
- Progress fill: `primary` (teal)
- Over target: Fill continues with `warning` color segment
- Goal met: Subtle glow animation (iOS 17+)

**Display Logic:**
```typescript
const getDisplayText = (data: CalorieRingData) => {
  if (data.remaining > 0) {
    return { value: data.remaining, label: 'remaining' };
  } else {
    return { value: Math.abs(data.remaining), label: 'over' };
  }
};
```

**Tap Action:** Deep link to `nutritionrx://diary`

---

### Widget 2: Macros Overview (Medium - 338×158pt)

**Purpose:** Show P/C/F breakdown with progress bars

**Visual Layout:**
```
┌─────────────────────────────────────────────┐
│  NutritionRx                   1,850 / 2,100│
│                                             │
│  Protein   ━━━━━━━━━━━━━━━░░░░  125g / 150g │
│  Carbs     ━━━━━━━━━━━━━━━━━░░  210g / 240g │
│  Fat       ━━━━━━━━━━━░░░░░░░░   58g / 80g  │
│                                             │
│           [ + Log Food ]                    │
└─────────────────────────────────────────────┘
```

**Data Requirements:**
```typescript
interface MacrosOverviewData {
  calories: { consumed: number; target: number };
  protein: { consumed: number; target: number };
  carbs: { consumed: number; target: number };
  fat: { consumed: number; target: number };
}
```

**Progress Bar Colors:**
- Protein: `#FF6B6B` (coral)
- Carbs: `#4ECDC4` (teal)
- Fat: `#FFE66D` (yellow)
- Background track: 15% opacity of each color

**Tap Actions:**
- Card tap: `nutritionrx://diary`
- Log Food button: `nutritionrx://add-food`

---

### Widget 3: Quick Log (Medium - 338×158pt)

**Purpose:** One-tap logging for frequent foods + barcode scan

**Visual Layout:**
```
┌─────────────────────────────────────────────┐
│  NutritionRx                    QUICK LOG   │
│                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐ │
│  │ ☕     │ │ 🥗     │ │ 🍌     │ │ 📷   │ │
│  │Coffee  │ │Salad   │ │Banana  │ │ Scan │ │
│  │ 5 cal  │ │280 cal │ │105 cal │ │      │ │
│  └────────┘ └────────┘ └────────┘ └──────┘ │
│                                             │
│  1,450 remaining today                      │
└─────────────────────────────────────────────┘
```

**Data Requirements:**
```typescript
interface QuickLogData {
  frequentFoods: Array<{
    foodId: string;
    name: string;
    emoji: string;
    calories: number;
    defaultServingId: string;
  }>;
  caloriesRemaining: number;
}
```

**Frequent Foods Logic:**
1. User's pinned quick-log items (if configured)
2. Fall back to most frequently logged items (last 30 days)
3. Maximum 3 food items + 1 barcode scan button

**Tap Actions:**
- Food item: `nutritionrx://quick-log?foodId={id}&servingId={servingId}`
- Barcode scan: `nutritionrx://scan`
- Card tap: `nutritionrx://diary`

**iOS 17+ Interactive Widget:**
On iOS 17+, tapping a food item logs it directly without opening app (using AppIntent).

---

### Widget 4: Water Tracker (Small - 158×158pt)

**Purpose:** Track daily water intake with one-tap add

**Visual Layout:**
```
┌─────────────────────────┐
│                         │
│       💧💧💧💧          │
│       💧💧 ○ ○          │
│                         │
│      6 / 8 glasses      │
│                         │
│       [ + Add ]         │
└─────────────────────────┘
```

**Data Requirements:**
```typescript
interface WaterTrackerData {
  consumed: number;       // glasses consumed
  goal: number;           // daily goal in glasses
  glassSize: number;      // ml per glass (for display)
}
```

**Visual States:**
- Filled drops: `#7EC8E3` (water blue)
- Empty circles: `#E0E1DD` (light gray)
- Goal complete: All drops filled + subtle celebration

**Tap Actions:**
- Add button: `nutritionrx://water/add` (logs 1 glass, iOS 17+ without opening app)
- Widget tap: `nutritionrx://water`

**iOS 17+ Interactive:**
```swift
// AppIntent for adding water
struct AddWaterIntent: AppIntent {
    static var title: LocalizedStringResource = "Add Water"
    
    func perform() async throws -> some IntentResult {
        // Add one glass of water via shared data store
        WaterDataStore.shared.addGlass()
        return .result()
    }
}
```

---

### Widget 5: Weekly Summary (Large - 338×354pt)

**Purpose:** 7-day calorie adherence chart with weight trend

**Visual Layout:**
```
┌─────────────────────────────────────────────┐
│  NutritionRx                  THIS WEEK     │
│  ─────────────────────────────────────────  │
│                                             │
│  Calorie Adherence                          │
│  ┌───────────────────────────────────────┐  │
│  │  ██   ██   ██   ░░   ██   ░░   --    │  │
│  │  Mon  Tue  Wed  Thu  Fri  Sat  Sun   │  │
│  └───────────────────────────────────────┘  │
│  5 of 7 days on target                      │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Weight Trend                               │
│  ┌───────────────────────────────────────┐  │
│  │  185.2 → 184.8 lbs                    │  │
│  │  ↓ 0.4 lbs this week                  │  │
│  └───────────────────────────────────────┘  │
│                                             │
│           [ View Details ]                  │
└─────────────────────────────────────────────┘
```

**Data Requirements:**
```typescript
interface WeeklySummaryData {
  dailyAdherence: Array<{
    date: string;         // ISO date
    consumed: number;
    target: number;
    withinTarget: boolean; // within 10% of goal
  }>;
  weightTrend: {
    startWeight: number | null;
    endWeight: number | null;
    change: number | null;
    unit: 'lbs' | 'kg';
  };
}
```

**Bar Chart Colors:**
- On target (within 10%): `#4ECDC4` (teal)
- Over target: `#F4A261` (amber) - NOT red, non-judgmental
- Under target by >20%: `#778DA9` (muted gray)
- Future/no data: Empty with dashed outline

---

## Lock Screen Widgets (iOS 16+)

### Circular: Calorie Ring
```
  ┌─────┐
  │1450 │  (remaining calories inside ring)
  └─────┘
```

### Circular: Water Progress
```
  ┌─────┐
  │ 6/8 │  (glasses with water drop icon)
  └─────┘
```

### Rectangular: Macro Summary
```
┌──────────────────────┐
│ P: 125g  C: 210g     │
│ F: 58g   1850 cal    │
└──────────────────────┘
```

---

## iOS Implementation (WidgetKit + SwiftUI)

### Project Structure
```
ios/
├── NutritionRxWidgets/
│   ├── NutritionRxWidgets.swift      # Widget bundle
│   ├── CalorieRingWidget.swift       # Small
│   ├── MacrosOverviewWidget.swift    # Medium
│   ├── QuickLogWidget.swift          # Medium (interactive)
│   ├── WaterTrackerWidget.swift      # Small (interactive)
│   ├── WeeklySummaryWidget.swift     # Large
│   ├── LockScreenWidgets.swift       # Lock screen family
│   ├── WidgetDataProvider.swift      # Shared data
│   ├── WidgetIntents.swift           # AppIntents for iOS 17+
│   └── WidgetColors.swift            # Design tokens
├── NutritionRxWidgets.entitlements
└── Info.plist
```

### App Groups Setup

```swift
// Shared container for widget data
let appGroupID = "group.com.yourcompany.nutritionrx"
let sharedDefaults = UserDefaults(suiteName: appGroupID)

// Data keys
enum WidgetDataKeys {
    static let todayNutrition = "widget.todayNutrition"
    static let waterIntake = "widget.waterIntake"
    static let frequentFoods = "widget.frequentFoods"
    static let weeklyData = "widget.weeklyData"
}
```

### Interactive Widget (iOS 17+)

```swift
// Quick Log Food Intent
struct QuickLogFoodIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Food"
    
    @Parameter(title: "Food ID")
    var foodId: String
    
    @Parameter(title: "Serving ID")
    var servingId: String
    
    func perform() async throws -> some IntentResult {
        let dataStore = NutritionDataStore.shared
        try await dataStore.logFood(foodId: foodId, servingId: servingId)
        return .result()
    }
}

// Add Water Intent
struct AddWaterIntent: AppIntent {
    static var title: LocalizedStringResource = "Add Water"
    
    func perform() async throws -> some IntentResult {
        let dataStore = WaterDataStore.shared
        dataStore.addGlass()
        return .result()
    }
}
```

### React Native Bridge

```typescript
// src/native/NutritionWidgetBridge.ts
import { NativeModules, Platform } from 'react-native';

const { NutritionWidgetModule } = NativeModules;

export interface NutritionWidgetData {
  today: {
    calories: { consumed: number; target: number };
    protein: { consumed: number; target: number };
    carbs: { consumed: number; target: number };
    fat: { consumed: number; target: number };
  };
  water: {
    consumed: number;
    goal: number;
    glassSize: number;
  };
  frequentFoods: Array<{
    foodId: string;
    name: string;
    emoji: string;
    calories: number;
    defaultServingId: string;
  }>;
  weekly: {
    adherence: Array<{
      date: string;
      consumed: number;
      target: number;
    }>;
    weight: {
      start: number | null;
      end: number | null;
      unit: 'lbs' | 'kg';
    };
  };
}

export async function updateNutritionWidgetData(data: NutritionWidgetData): Promise<void> {
  if (Platform.OS === 'ios') {
    await NutritionWidgetModule.updateWidgetData(JSON.stringify(data));
  } else if (Platform.OS === 'android') {
    await NutritionWidgetModule.updateWidgetData(JSON.stringify(data));
  }
}

export async function refreshNutritionWidgets(): Promise<void> {
  if (Platform.OS === 'ios') {
    await NutritionWidgetModule.reloadAllTimelines();
  } else if (Platform.OS === 'android') {
    await NutritionWidgetModule.refreshWidgets();
  }
}
```

### Data Sync Hook

```typescript
// src/hooks/useNutritionWidgetSync.ts
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { updateNutritionWidgetData, refreshNutritionWidgets } from '../native/NutritionWidgetBridge';
import { useNutritionStore } from '../stores/nutritionStore';
import { useWaterStore } from '../stores/waterStore';

export function useNutritionWidgetSync() {
  const nutritionStore = useNutritionStore();
  const waterStore = useWaterStore();

  const syncWidgetData = async () => {
    const today = nutritionStore.getTodayNutrition();
    const water = waterStore.getTodayWater();
    const frequentFoods = nutritionStore.getFrequentFoods(3);
    const weeklyData = nutritionStore.getWeeklyAdherence();

    await updateNutritionWidgetData({
      today: {
        calories: { consumed: today.calories, target: today.calorieGoal },
        protein: { consumed: today.protein, target: today.proteinGoal },
        carbs: { consumed: today.carbs, target: today.carbsGoal },
        fat: { consumed: today.fat, target: today.fatGoal },
      },
      water: {
        consumed: water.glasses,
        goal: water.goalGlasses,
        glassSize: water.glassSizeMl,
      },
      frequentFoods: frequentFoods.map(f => ({
        foodId: f.id,
        name: f.name,
        emoji: f.emoji || '🍽️',
        calories: f.calories,
        defaultServingId: f.defaultServingId,
      })),
      weekly: {
        adherence: weeklyData.days.map(d => ({
          date: d.date,
          consumed: d.calories,
          target: d.goal,
        })),
        weight: {
          start: weeklyData.startWeight,
          end: weeklyData.endWeight,
          unit: nutritionStore.weightUnit,
        },
      },
    });

    await refreshNutritionWidgets();
  };

  useEffect(() => {
    syncWidgetData();

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        syncWidgetData();
      }
    });

    return () => subscription.remove();
  }, []);

  return { syncWidgetData };
}
```

### Sync Triggers

Call `syncWidgetData()` when:
1. Food is logged
2. Food is deleted
3. Water is logged
4. Daily goals are changed
5. Weight is logged
6. App returns to foreground
7. Day changes (midnight)

---

## Android Implementation (Jetpack Glance)

### Project Structure
```
android/app/src/main/java/com/nutritionrx/
├── widgets/
│   ├── CalorieRingWidget.kt
│   ├── MacrosOverviewWidget.kt
│   ├── QuickLogWidget.kt
│   ├── WaterTrackerWidget.kt
│   ├── WeeklySummaryWidget.kt
│   ├── WidgetDataStore.kt
│   ├── WidgetColors.kt
│   ├── WidgetActions.kt         # Action handlers
│   └── WidgetReceivers.kt
└── MainApplication.kt
```

### Deep Link Configuration

**React Navigation Linking:**
```typescript
// src/navigation/linking.ts
export const nutritionLinking = {
  prefixes: ['nutritionrx://'],
  config: {
    screens: {
      Diary: 'diary',
      AddFood: 'add-food',
      Scan: 'scan',
      Water: 'water',
      WaterAdd: 'water/add',
      QuickLog: {
        path: 'quick-log',
        parse: {
          foodId: (foodId: string) => foodId,
          servingId: (servingId: string) => servingId,
        },
      },
    },
  },
};
```

**Handle Quick Log Deep Link:**
```typescript
// src/screens/QuickLogHandler.tsx
import { useEffect } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useNutritionStore } from '../stores/nutritionStore';

export function QuickLogHandler() {
  const route = useRoute();
  const navigation = useNavigation();
  const { logFood } = useNutritionStore();

  useEffect(() => {
    const { foodId, servingId } = route.params as { foodId: string; servingId: string };
    
    if (foodId && servingId) {
      logFood(foodId, servingId).then(() => {
        // Show toast confirmation
        Toast.show('Food logged!');
        // Navigate to diary
        navigation.navigate('Diary');
      });
    }
  }, [route.params]);

  return null; // Or loading spinner
}
```

---

## Implementation Checklist

### Phase 1: Infrastructure
- [ ] Create iOS widget extension target
- [ ] Create Android widget module
- [ ] Set up App Groups (iOS) / SharedPreferences (Android)
- [ ] Create NutritionWidgetBridge native module
- [ ] Implement deep linking configuration
- [ ] Create useNutritionWidgetSync hook

### Phase 2: Calorie Ring Widget (Small)
- [ ] iOS SwiftUI implementation
- [ ] Android Glance implementation
- [ ] Progress ring with remaining/over states
- [ ] Proper number formatting (commas)

### Phase 3: Macros Overview Widget (Medium)
- [ ] iOS SwiftUI implementation
- [ ] Android Glance implementation
- [ ] Color-coded progress bars
- [ ] Log Food button deep link

### Phase 4: Quick Log Widget (Medium)
- [ ] iOS SwiftUI implementation with AppIntents (iOS 17+)
- [ ] Android Glance implementation
- [ ] Frequent foods logic
- [ ] Barcode scan button
- [ ] Interactive logging (iOS 17+)

### Phase 5: Water Tracker Widget (Small)
- [ ] iOS SwiftUI implementation with AppIntent
- [ ] Android Glance implementation
- [ ] Water drop visualization
- [ ] Interactive Add button (iOS 17+)

### Phase 6: Weekly Summary Widget (Large)
- [ ] iOS SwiftUI implementation
- [ ] Android Glance implementation
- [ ] Bar chart rendering
- [ ] Weight trend display

### Phase 7: Lock Screen Widgets (iOS)
- [ ] Calorie ring accessory circular
- [ ] Water progress accessory circular
- [ ] Macro summary accessory rectangular

### Phase 8: Testing & Polish
- [ ] Test widget updates on food logging
- [ ] Test interactive widgets (iOS 17+)
- [ ] Test deep links from all widgets
- [ ] Test midnight rollover
- [ ] Light and dark mode appearance
- [ ] Widget gallery previews
