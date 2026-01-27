# NutritionRx: Onboarding & Tooltips Implementation

> **How to Use This Document**
> 1. Copy the relevant "Claude Code Prompt" sections below and paste into your IDE
> 2. Work through phases in order - each builds on the previous
> 3. Reference the component specs when Claude needs design details
> 4. Use the checklist to track progress

---

## Prerequisites

Before starting onboarding implementation, ensure:
- [ ] React Native project with Expo
- [ ] React Navigation v6+ configured
- [ ] AsyncStorage installed (@react-native-async-storage/async-storage)
- [ ] Reanimated 3 installed (for animations)
- [ ] Existing navigation structure (tab navigator, etc.)
- [ ] Camera permissions configured (for barcode scanning later)

---

## Claude Code Prompts

### Prompt 1: Onboarding Store & Provider

```
I need to implement onboarding for my NutritionRx React Native app.

First, create the onboarding state management:

1. Create src/stores/onboardingStore.ts using Zustand with:
   - isComplete: boolean
   - completedAt: Date | null
   - goalPath: 'lose' | 'maintain' | 'gain' | 'track' | null
   - energyUnit: 'calories' | 'kilojoules' (default based on locale)
   - weightUnit: 'lbs' | 'kg' (default based on locale)
   - seenTooltips: string[]
   - firstFoodLoggedAt: Date | null
   
   Actions:
   - completeOnboarding()
   - setGoalPath(goal)
   - setEnergyUnit(unit)
   - setWeightUnit(unit)
   - markTooltipSeen(id: string)
   - hasSeenTooltip(id: string): boolean
   - markFirstFoodLogged()
   - resetOnboarding()

2. Persist to AsyncStorage with keys prefixed @nutritionrx/

3. Create src/constants/tooltipIds.ts with constants:
   - BARCODE_SCANNER, SERVING_SIZE
   - WATER_TRACKING, MEAL_COLLAPSE, QUICK_ADD, WEEKLY_SUMMARY

4. Add locale detection helper:
   - US/UK -> calories, lbs
   - EU/AU/others -> calories (or kJ for AU), kg

Colors for onboarding (Nourished Calm):
- Background: #FDF6E3 (warm cream)
- Card: #FFFFFF (white)
- Primary: #4ECDC4 (soft teal)
- Text: #2D3436 (charcoal)
- Text secondary: #636E72 (gray)
```

### Prompt 2: First Launch Screens

```
Create the first-launch onboarding flow for NutritionRx.

Create these screens in src/screens/onboarding/:

1. WelcomeScreen.tsx
   - Emoji (🥗) with gentle fade-in animation
   - "NutritionRx" title
   - "Nourish. Track. Thrive." subtitle
   - "Let's Begin" button (teal background)
   - Warm cream background (#FDF6E3)

2. GoalPathScreen.tsx
   - "What brings you to NutritionRx?" title
   - Radio card options (single select):
     - "Lose weight" - "Track calories to reach goals"
     - "Maintain weight" - "Keep your nutrition balanced"
     - "Build muscle" - "Optimize protein and calories"
     - "Just track what I eat" - "No specific goal in mind" [default]
   - "Continue" button
   - Use positive, non-judgmental language (no "diet" or "restrict")

3. PreferencesScreen.tsx
   - "A few quick preferences" title
   - Energy unit toggle: Calories | Kilojoules
   - Weight unit toggle: lbs | kg
   - Smart defaults based on locale
   - "Continue" button
   - "You can change these later" note at bottom

4. ReadyScreen.tsx
   - Checkmark icon with scale-in animation
   - "You're ready!" title
   - "How would you like to start?" subtitle
   - Three option cards:
     - "📷 Scan a barcode" -> open camera scanner
     - "🔍 Search for a food" -> open food search
     - "👀 Explore the app first" -> go to home/diary
   - Each option completes onboarding

Create OnboardingNavigator.tsx as a stack navigator.
```

### Prompt 3: Tooltip System

```
Create a reusable tooltip system for NutritionRx contextual help.

1. Create src/providers/TooltipProvider.tsx:
   - Context with: showTooltip, hideTooltip, activeTooltip, markSeen, hasSeen
   - State for currently active tooltip
   - Integration with onboardingStore for persistence

2. Create src/components/TooltipModal.tsx:
   - Modal with semi-transparent overlay (rgba(0,0,0,0.5))
   - White card with rounded corners (16pt radius)
   - Shadow for elevation
   - Optional icon/emoji at top
   - Content text (centered)
   - Action buttons ("Got it" default, or custom actions)
   - Slide-up animation with Reanimated (springify, damping: 15)

3. Create src/hooks/useTooltip.ts:
   - Convenience hook to access tooltip context
   - Helper to show tooltip only if not seen

Tooltip interface:
{
  id: string;
  content: string;
  icon?: string;
  position: 'top' | 'bottom' | 'center';
  actions?: Array<{ label: string; onPress: () => void; primary?: boolean }>;
}

Colors:
- Card: #FFFFFF
- Text: #2D3436
- Primary button: #4ECDC4 bg, #FFFFFF text
- Secondary button: transparent, #636E72 text
```

### Prompt 4: First Food Logging Tooltips

```
Add contextual tooltips for first food logging in NutritionRx.

1. When barcode scanner opens for the first time:
   - Show tooltip (center position)
   - Icon: 📷
   - Content: "Point your camera at any barcode to instantly find nutrition info"
   - ID: TOOLTIP_IDS.BARCODE_SCANNER
   - Single "Got it" action

2. When user finds a food and the serving size picker is visible:
   - Show tooltip pointing to serving size dropdown
   - Content: "Adjust the serving size to match what you're eating"
   - ID: TOOLTIP_IDS.SERVING_SIZE

3. After first food is successfully logged, show celebration modal:
   - Create src/components/FirstFoodCelebration.tsx
   - Emoji: 🎉
   - Title: "First food logged!"
   - Subtitle: "You're off to a great start. Tracking gets easier with practice."
   - Show mini progress bar: "{calories} / {goal} calories"
   - "Continue" button
   - Success haptic feedback
   - Call onboardingStore.markFirstFoodLogged()

Trigger celebration only once (check firstFoodLoggedAt in store).
```

### Prompt 5: Progressive Discovery Tooltips

```
Add progressive discovery tooltips that appear based on usage in NutritionRx.

1. Water Tracking Introduction (first diary view):
   - Trigger: User views diary for first time AND hasSeenTooltip(WATER_TRACKING) === false
   - Content: "Don't forget hydration! Track your water intake here"
   - Position: bottom (pointing to water section)
   - ID: TOOLTIP_IDS.WATER_TRACKING

2. Meal Collapse Tip (after 5+ foods logged):
   - Trigger: totalFoodsLogged >= 5 AND hasSeenTooltip(MEAL_COLLAPSE) === false
   - Content: "Tip: Tap a meal header to collapse it and focus on other meals"
   - Position: top (near meal headers)
   - ID: TOOLTIP_IDS.MEAL_COLLAPSE

3. Weekly Check-in (after 7 days of tracking):
   - Trigger: daysTracked >= 7 AND hasSeenTooltip(WEEKLY_SUMMARY) === false
   - Icon: 🎉
   - Content: "One week of tracking! You've logged {count} foods and stayed consistent. Check your weekly summary to see your progress."
   - Actions: ["View Summary" (primary), "Later"]
   - ID: TOOLTIP_IDS.WEEKLY_SUMMARY

4. Quick Add Discovery (after 10+ logs):
   - Trigger: totalFoodsLogged >= 10 AND hasSeenTooltip(QUICK_ADD) === false
   - Content: "Logging your favorites often? Pin them to Quick Add for one-tap logging."
   - Actions: ["Show Me How" (primary), "Later"]
   - ID: TOOLTIP_IDS.QUICK_ADD

Create src/hooks/useProgressiveTooltips.ts to check these conditions.
```

### Prompt 6: Empty States

```
Create empty state components for NutritionRx.

1. src/components/empty/EmptyDiary.tsx
   - Emoji: 🍽️
   - Title: "Your diary is empty"
   - Subtitle: "Start tracking your first meal of the day"
   - Two buttons side by side:
     - "📷 Scan Barcode" (primary teal)
     - "🔍 Search Food" (secondary outline)
   - Props: onScanBarcode, onSearchFood

2. src/components/empty/EmptyWeightLog.tsx
   - Emoji: ⚖️
   - Title: "No weight data yet"
   - Subtitle: "Log your weight to see trends over time"
   - Note: "This is completely optional" (smaller, gray)
   - Button: "Log Weight"
   - Props: onLogWeight

3. src/components/empty/NoSearchResults.tsx
   - Emoji: 🔍
   - Title: "No results for "{query}""
   - Subtitle: "Try a different spelling or create a custom food"
   - Button: "Create Custom Food"
   - Props: query, onCreateCustom

Style with Nourished Calm colors:
- Background: #FDF6E3 or white card
- Emoji: 48px
- Title: #2D3436, 18px, semibold
- Subtitle: #636E72, 14px
- Primary button: #4ECDC4 bg, white text
- Secondary button: white bg, #4ECDC4 text, 1px border
```

### Prompt 7: Settings Integration

```
Add onboarding-related settings to NutritionRx Settings screen.

1. Add a "Reset Tutorials" row in Settings:
   - Icon: refresh-cw
   - Title: "Reset Tutorials"
   - Subtitle: "Show all tips and guides again"
   - onPress:
     - Call onboardingStore.resetOnboarding()
     - Show Alert: "Done - Tutorials will appear again on your next action"

2. Add unit preferences in Settings (editable post-onboarding):
   - Energy Unit: Calories | Kilojoules
   - Weight Unit: lbs | kg
   - These should update the onboardingStore values

3. Update the app's root navigator to:
   - Check onboardingStore.isComplete on mount
   - If false, show OnboardingNavigator
   - If true, show main app navigator
   - Listen for changes to isComplete

4. Handle the three paths from ReadyScreen:
   - "Scan barcode" -> complete onboarding, navigate to scanner
   - "Search food" -> complete onboarding, navigate to food search
   - "Explore app" -> complete onboarding, navigate to diary/home
```

---

## Overview

Implement a calming, supportive onboarding flow for NutritionRx that guides users through setup and their first food log. Follow the "Nourished Calm" philosophy—no anxiety-inducing language, no judgment.

---

## Design System Reference

### Colors
```typescript
const onboardingColors = {
  background: '#FDF6E3',          // Warm cream
  cardBackground: '#FFFFFF',       // White
  primary: '#4ECDC4',             // Soft teal
  textPrimary: '#2D3436',         // Charcoal
  textSecondary: '#636E72',       // Gray
  spotlight: 'rgba(0, 0, 0, 0.7)', // Tooltip overlay
  tooltipBg: '#FFFFFF',           // Tooltip background
  success: '#4ECDC4',             // Celebration teal
};
```

### Typography
```typescript
const onboardingTypography = {
  headline: { fontSize: 26, fontWeight: '700', color: '#2D3436' },
  title: { fontSize: 18, fontWeight: '600', color: '#2D3436' },
  body: { fontSize: 16, fontWeight: '400', color: '#636E72' },
  caption: { fontSize: 14, fontWeight: '500', color: '#636E72' },
};
```

---

## Phase 1: First Launch Flow (~90 seconds)

### Screen 1: Welcome (5 seconds)

```
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│                   🥗                        │
│                                             │
│             NutritionRx                     │
│                                             │
│       Nourish. Track. Thrive.               │
│                                             │
│                                             │
│                                             │
│                                             │
│           [ Let's Begin ]                   │
│                                             │
└─────────────────────────────────────────────┘
```

**Component:** `WelcomeScreen.tsx`
```typescript
interface WelcomeScreenProps {
  onContinue: () => void;
}

// Soft fade-in animation
// Nature-inspired subtle background pattern
```

---

### Screen 2: Goal Path (20 seconds)

```
┌─────────────────────────────────────────────┐
│  ←                                          │
│                                             │
│        What brings you to                   │
│        NutritionRx?                         │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │  ○  Lose weight                     │   │
│  │     Track calories to reach goals   │   │
│  │                                     │   │
│  ├─────────────────────────────────────┤   │
│  │                                     │   │
│  │  ○  Maintain weight                 │   │
│  │     Keep your nutrition balanced    │   │
│  │                                     │   │
│  ├─────────────────────────────────────┤   │
│  │                                     │   │
│  │  ○  Build muscle                    │   │
│  │     Optimize protein and calories   │   │
│  │                                     │   │
│  ├─────────────────────────────────────┤   │
│  │                                     │   │
│  │  ●  Just track what I eat           │   │
│  │     No specific goal in mind        │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│          [ Continue ]                       │
│                                             │
└─────────────────────────────────────────────┘
```

**Component:** `GoalPathScreen.tsx`
```typescript
type GoalPath = 'lose' | 'maintain' | 'gain' | 'track';

interface GoalPathScreenProps {
  onComplete: (goal: GoalPath) => void;
}

const goalOptions: Array<{ value: GoalPath; label: string; subtitle: string }> = [
  { value: 'lose', label: 'Lose weight', subtitle: 'Track calories to reach goals' },
  { value: 'maintain', label: 'Maintain weight', subtitle: 'Keep your nutrition balanced' },
  { value: 'gain', label: 'Build muscle', subtitle: 'Optimize protein and calories' },
  { value: 'track', label: 'Just track what I eat', subtitle: 'No specific goal in mind' },
];

// Default: 'track' (no pressure)
```

**Note:** We intentionally use positive, non-judgmental language. No "diet" or "restrict" terminology.

---

### Screen 3: Quick Preferences (15 seconds)

```
┌─────────────────────────────────────────────┐
│  ←                                          │
│                                             │
│        A few quick preferences              │
│                                             │
│  Energy unit                                │
│  ┌──────────────┐  ┌──────────────┐        │
│  │   Calories   │  │  Kilojoules  │        │
│  │   ● ────     │  │     ──── ○   │        │
│  └──────────────┘  └──────────────┘        │
│                                             │
│  Weight unit                                │
│  ┌──────────────┐  ┌──────────────┐        │
│  │     lbs      │  │      kg      │        │
│  │   ● ────     │  │     ──── ○   │        │
│  └──────────────┘  └──────────────┘        │
│                                             │
│                                             │
│          [ Continue ]                       │
│                                             │
│      You can change these later             │
│                                             │
└─────────────────────────────────────────────┘
```

**Component:** `PreferencesScreen.tsx`
```typescript
interface PreferencesScreenProps {
  onComplete: (prefs: {
    energyUnit: 'calories' | 'kilojoules';
    weightUnit: 'lbs' | 'kg';
  }) => void;
}

// Smart defaults based on locale
// US/UK: calories, lbs
// EU/AU: kilojoules/calories, kg
```

---

### Screen 4: Ready to Track (10 seconds)

```
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│               ✓                             │
│                                             │
│        You're ready!                        │
│                                             │
│    How would you like to start?             │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  📷  Scan a barcode                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  🔍  Search for a food              │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  👀  Explore the app first          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

**Component:** `ReadyScreen.tsx`
```typescript
interface ReadyScreenProps {
  onScanBarcode: () => void;    // Open camera scanner
  onSearchFood: () => void;     // Open food search
  onExplore: () => void;        // Go to home/diary
}
```

---

## Phase 2: First Food Logging (Contextual)

### Tooltip 1: Barcode Scanner

When user first opens scanner:

```
  ┌─────────────────────────────────────┐
  │ 💡 Point your camera at any         │
  │    barcode to instantly find        │
  │    nutrition info                   │
  │                        [ Got it ]   │
  └─────────────────────────────────────┘
              ▼
  ┌─────────────────────────────────────┐
  │                                     │
  │         [ Camera Viewfinder ]       │
  │                                     │
  │      ┌─────────────────────┐        │
  │      │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│        │
  │      └─────────────────────┘        │
  │                                     │
  └─────────────────────────────────────┘
```

### Tooltip 2: Food Found - Adjust Serving

After scanning/finding a food:

```
  ┌─────────────────────────────────────┐
  │ 💡 Adjust the serving size to       │
  │    match what you're eating         │
  │                        [ Got it ]   │
  └─────────────────────────────────────┘
              ▼
  ┌─────────────────────────────────────┐
  │  Greek Yogurt                       │
  │  Chobani                            │
  │                                     │
  │  Serving Size                       │
  │  ┌─────────────────────────────┐   │
  │  │  1 container (150g)     ▼  │   │
  │  └─────────────────────────────┘   │
  │                                     │
  │  Calories: 120                      │
  │  Protein:  12g                      │
  │  Carbs:    8g                       │
  │  Fat:      2g                       │
  └─────────────────────────────────────┘
```

### Celebration: First Food Logged

After successfully logging first food:

```
┌─────────────────────────────────────────────┐
│                                             │
│                  🎉                         │
│                                             │
│        First food logged!                   │
│                                             │
│    You're off to a great start.             │
│    Tracking gets easier with practice.      │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │   Today's Progress                  │   │
│  │                                     │   │
│  │   ━━━░░░░░░░░░░░░░░░░░░░░  6%     │   │
│  │                                     │   │
│  │   120 / 2,000 calories              │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│            [ Continue ]                     │
│                                             │
└─────────────────────────────────────────────┘
```

**Haptic:** Success vibration pattern

---

## Phase 3: Progressive Discovery Tooltips

### Water Tracking Introduction (First Diary View)

```
  ┌─────────────────────────────────────┐
  │ 💡 Don't forget hydration!          │
  │    Track your water intake here     │
  │                        [ Got it ]   │
  └─────────────────────────────────────┘
              ▼
  ┌─────────────────────────────────────┐
  │  💧 Water            3/8 glasses    │
  │  ━━━━━━━━━░░░░░░░░░░░░░░           │
  │                        [ + Add ]    │
  └─────────────────────────────────────┘
```

### Meal Section Collapse (After 5+ logged foods)

```
  ┌─────────────────────────────────────┐
  │ 💡 Tip: Tap a meal header to        │
  │    collapse it and focus on         │
  │    other meals                      │
  │                        [ Got it ]   │
  └─────────────────────────────────────┘
              ▼
  ┌─────────────────────────────────────┐
  │  ▼ Breakfast                420 cal │
  └─────────────────────────────────────┘
```

### Weekly Check-in (After 7 days)

```
  ┌─────────────────────────────────────┐
  │ 🎉 One week of tracking!            │
  │                                     │
  │    You've logged 35 foods           │
  │    and stayed consistent.           │
  │                                     │
  │    Check your weekly summary        │
  │    to see your progress.            │
  │                                     │
  │    [ View Summary ]  [ Later ]      │
  └─────────────────────────────────────┘
```

### Quick Add Discovery (After 10+ logs)

```
  ┌─────────────────────────────────────┐
  │ 💡 Logging your favorites often?    │
  │    Pin them to Quick Add for        │
  │    one-tap logging.                 │
  │                                     │
  │    [ Show Me How ]  [ Later ]       │
  └─────────────────────────────────────┘
```

---

## Component Architecture

### TooltipProvider

```typescript
// src/providers/TooltipProvider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Tooltip {
  id: string;
  content: string;
  position: 'top' | 'bottom' | 'center';
  actions?: Array<{ label: string; onPress: () => void; primary?: boolean }>;
  icon?: string;
}

interface TooltipContextValue {
  showTooltip: (tooltip: Tooltip) => void;
  hideTooltip: () => void;
  activeTooltip: Tooltip | null;
  markSeen: (id: string) => Promise<void>;
  hasSeen: (id: string) => boolean;
}

export const TooltipContext = createContext<TooltipContextValue | null>(null);

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  const [activeTooltip, setActiveTooltip] = useState<Tooltip | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem('@nutritionrx/seen_tooltips').then(data => {
      if (data) setSeenIds(new Set(JSON.parse(data)));
    });
  }, []);

  const showTooltip = (tooltip: Tooltip) => {
    if (!seenIds.has(tooltip.id)) {
      setActiveTooltip(tooltip);
    }
  };

  const hideTooltip = () => setActiveTooltip(null);

  const markSeen = async (id: string) => {
    const updated = new Set(seenIds).add(id);
    setSeenIds(updated);
    await AsyncStorage.setItem('@nutritionrx/seen_tooltips', JSON.stringify([...updated]));
    hideTooltip();
  };

  const hasSeen = (id: string) => seenIds.has(id);

  return (
    <TooltipContext.Provider value={{ showTooltip, hideTooltip, activeTooltip, markSeen, hasSeen }}>
      {children}
      {activeTooltip && <TooltipModal tooltip={activeTooltip} onDismiss={() => markSeen(activeTooltip.id)} />}
    </TooltipContext.Provider>
  );
}

export const useTooltip = () => {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error('useTooltip must be within TooltipProvider');
  return ctx;
};
```

### TooltipModal

```typescript
// src/components/TooltipModal.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';

interface TooltipModalProps {
  tooltip: Tooltip;
  onDismiss: () => void;
}

export function TooltipModal({ tooltip, onDismiss }: TooltipModalProps) {
  return (
    <Modal transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View 
          entering={SlideInUp.springify().damping(15)}
          style={styles.card}
        >
          {tooltip.icon && <Text style={styles.icon}>{tooltip.icon}</Text>}
          <Text style={styles.content}>{tooltip.content}</Text>
          
          <View style={styles.actions}>
            {tooltip.actions?.map((action, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.button, action.primary && styles.buttonPrimary]}
                onPress={() => {
                  action.onPress();
                  onDismiss();
                }}
              >
                <Text style={[styles.buttonText, action.primary && styles.buttonTextPrimary]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            )) || (
              <TouchableOpacity style={styles.buttonPrimary} onPress={onDismiss}>
                <Text style={styles.buttonTextPrimary}>Got it</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 12,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2D3436',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonPrimary: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#636E72',
    fontSize: 15,
    fontWeight: '500',
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
```

### Tooltip IDs

```typescript
// src/constants/tooltipIds.ts
export const TOOLTIP_IDS = {
  // First food logging
  BARCODE_SCANNER: 'onboarding.barcode.intro',
  SERVING_SIZE: 'onboarding.food.servingSize',
  
  // Progressive discovery
  WATER_TRACKING: 'discovery.waterTracking',
  MEAL_COLLAPSE: 'discovery.mealCollapse',
  QUICK_ADD: 'discovery.quickAdd',
  WEEKLY_SUMMARY: 'discovery.weeklySummary',
} as const;
```

---

## Empty States

### Empty Diary

```typescript
// src/components/EmptyDiary.tsx
export function EmptyDiary({ onAddFood, onScanBarcode }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🍽️</Text>
      <Text style={styles.title}>Your diary is empty</Text>
      <Text style={styles.subtitle}>
        Start tracking your first meal of the day
      </Text>
      
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.primaryButton} onPress={onScanBarcode}>
          <Text style={styles.primaryButtonText}>📷 Scan Barcode</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={onAddFood}>
          <Text style={styles.secondaryButtonText}>🔍 Search Food</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

### Empty Weight Log

```typescript
// src/components/EmptyWeightLog.tsx
export function EmptyWeightLog({ onLogWeight }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>⚖️</Text>
      <Text style={styles.title}>No weight data yet</Text>
      <Text style={styles.subtitle}>
        Log your weight to see trends over time
      </Text>
      <Text style={styles.note}>
        This is completely optional
      </Text>
      
      <TouchableOpacity style={styles.button} onPress={onLogWeight}>
        <Text style={styles.buttonText}>Log Weight</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### No Search Results

```typescript
// src/components/NoSearchResults.tsx
export function NoSearchResults({ query, onCreateCustom }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔍</Text>
      <Text style={styles.title}>No results for "{query}"</Text>
      <Text style={styles.subtitle}>
        Try a different spelling or create a custom food
      </Text>
      
      <TouchableOpacity style={styles.button} onPress={onCreateCustom}>
        <Text style={styles.buttonText}>Create Custom Food</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## Calorie Goal Setup (Optional Extension)

For users who selected a weight goal, offer guided calorie calculation:

### Screen: Calculate Your Goal

```
┌─────────────────────────────────────────────┐
│  ← Calculate Your Goal                      │
│                                             │
│  Let's figure out the right calorie         │
│  target for your goal                       │
│                                             │
│  Current weight                             │
│  ┌─────────────────────────────────────┐   │
│  │         165 lbs                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Goal weight                                │
│  ┌─────────────────────────────────────┐   │
│  │         155 lbs                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Activity level                             │
│  ┌─────────────────────────────────────┐   │
│  │  Moderately active               ▼  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Recommended: 1,750 calories/day            │
│  To lose 1 lb/week at a healthy pace        │
│                                             │
│          [ Use This Goal ]                  │
│                                             │
│  Or set a custom goal                       │
│                                             │
└─────────────────────────────────────────────┘
```

**Note:** This is optional and should never feel pressured. Always offer "skip" or "set custom" options.

---

## Data Model

```typescript
// src/stores/onboardingStore.ts
interface OnboardingState {
  isComplete: boolean;
  completedAt: Date | null;
  goalPath: 'lose' | 'maintain' | 'gain' | 'track' | null;
  energyUnit: 'calories' | 'kilojoules';
  weightUnit: 'lbs' | 'kg';
  seenTooltips: string[];
  firstFoodLoggedAt: Date | null;
  totalFoodsLogged: number;
  daysTracked: number;
}

// AsyncStorage keys
const STORAGE_KEYS = {
  ONBOARDING_COMPLETE: '@nutritionrx/onboarding_complete',
  GOAL_PATH: '@nutritionrx/goal_path',
  ENERGY_UNIT: '@nutritionrx/energy_unit',
  WEIGHT_UNIT: '@nutritionrx/weight_unit',
  SEEN_TOOLTIPS: '@nutritionrx/seen_tooltips',
  FIRST_FOOD_LOGGED: '@nutritionrx/first_food_logged',
};
```

---

## Settings: Reset Tutorials

```typescript
// In Settings screen
<SettingsRow
  icon="refresh-cw"
  title="Reset Tutorials"
  subtitle="Show all tips and guides again"
  onPress={async () => {
    await AsyncStorage.removeItem('@nutritionrx/seen_tooltips');
    await AsyncStorage.removeItem('@nutritionrx/onboarding_complete');
    Alert.alert('Done', 'Tutorials will appear again on your next action');
  }}
/>
```

---

## Implementation Checklist

### Phase 1: First Launch Flow
- [ ] WelcomeScreen component
- [ ] GoalPathScreen component
- [ ] PreferencesScreen component
- [ ] ReadyScreen component
- [ ] Onboarding navigator/stack
- [ ] AsyncStorage persistence
- [ ] Auto-skip if complete

### Phase 2: Tooltip System
- [ ] TooltipProvider context
- [ ] TooltipModal component
- [ ] useTooltip hook
- [ ] Tooltip ID constants
- [ ] Persistence for seen tooltips

### Phase 3: First Food Logging
- [ ] Barcode scanner intro tooltip
- [ ] Serving size tooltip
- [ ] First food celebration modal

### Phase 4: Progressive Discovery
- [ ] Water tracking introduction
- [ ] Meal collapse tip
- [ ] Quick Add discovery
- [ ] Weekly summary celebration

### Phase 5: Empty States
- [ ] EmptyDiary component
- [ ] EmptyWeightLog component
- [ ] NoSearchResults component

### Phase 6: Settings
- [ ] Reset tutorials option
- [ ] Clear seen tooltips function

---

## Testing Checklist

- [ ] Fresh install shows onboarding
- [ ] Can skip through onboarding
- [ ] Preferences persist correctly
- [ ] Tooltips show only once
- [ ] First food celebration triggers
- [ ] Water tracking tooltip shows on first diary view
- [ ] Reset tutorials clears all state
- [ ] Empty states show correct CTAs
- [ ] Energy unit (cal/kJ) applies throughout app
- [ ] Weight unit (lbs/kg) applies throughout app
