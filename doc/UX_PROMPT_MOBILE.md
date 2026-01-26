# NutritionRx Mobile Design Prompt

## Purpose
This document provides exact design specifications for building the NutritionRx mobile app. Copy/paste into Claude or your IDE for consistent implementation.

---

## Project Context

You are building a mobile nutrition and calorie tracking app with the following characteristics:

**Design Direction:** "Nourished Calm"
- Aesthetic: MacroFactor confidence + Linear cleanliness
- Tone: Confident but gentle, calm but capable
- Philosophy: The app respects your time and doesn't judge

**Core Principles:**
1. Speed is respect — minimize taps to log food
2. No judgment — never shame the user for going over
3. Offline-first — works without internet for all core features
4. Privacy by default — no accounts required
5. Generous whitespace — breathing room in every layout
6. Dark mode first — easier on eyes during meal times

**Platform:** React Native (cross-platform iOS/Android)

**Ecosystem:** Sibling app to GymRx (gym workout tracker). Should share visual DNA but have its own personality.

---

## Design Tokens

### Colors

```javascript
const colors = {
  // === DARK MODE (Default) ===
  dark: {
    // Backgrounds
    bgPrimary: '#0D1117',
    bgSecondary: '#161B22',
    bgElevated: '#21262D',
    bgInteractive: '#30363D',
    
    // Text
    textPrimary: '#F0F6FC',
    textSecondary: '#8B949E',
    textTertiary: '#6E7681',
    textDisabled: '#484F58',
    
    // Borders
    borderDefault: '#30363D',
    borderStrong: '#484F58',
    
    // Brand
    accent: '#64B5F6',        // Ice Blue — primary actions, matches GymRx
    accentDark: '#4A90D9',    // Pressed state
    
    // Status
    success: '#3FB950',
    successBg: 'rgba(63, 185, 80, 0.15)',
    warning: '#D29922',
    warningBg: 'rgba(210, 153, 34, 0.15)',
    error: '#F85149',
    errorBg: 'rgba(248, 81, 73, 0.15)',
    
    // Macros — nutrition-specific
    protein: '#64B5F6',       // Ice Blue (matches accent)
    carbs: '#81C784',         // Soft Green
    fat: '#FFB74D',           // Warm Amber
    calories: '#F0F6FC',      // Primary text
    
    // Progress ring
    ringTrack: '#30363D',
    ringFill: '#64B5F6',
  },
  
  // === LIGHT MODE ===
  light: {
    // Backgrounds
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F6F8FA',
    bgElevated: '#FFFFFF',
    bgInteractive: '#F3F4F6',
    
    // Text
    textPrimary: '#1F2328',
    textSecondary: '#656D76',
    textTertiary: '#8C959F',
    textDisabled: '#AFB8C1',
    
    // Borders
    borderDefault: '#D0D7DE',
    borderStrong: '#8C959F',
    
    // Brand
    accent: '#2563EB',        // Slightly darker blue for contrast
    accentDark: '#1D4ED8',
    
    // Status
    success: '#16A34A',
    successBg: 'rgba(22, 163, 74, 0.1)',
    warning: '#CA8A04',
    warningBg: 'rgba(202, 138, 4, 0.1)',
    error: '#DC2626',
    errorBg: 'rgba(220, 38, 38, 0.1)',
    
    // Macros
    protein: '#2563EB',
    carbs: '#16A34A',
    fat: '#D97706',
    calories: '#1F2328',
    
    // Progress ring
    ringTrack: '#E5E7EB',
    ringFill: '#2563EB',
  }
};
```

### Typography

```javascript
const typography = {
  // Font families
  fontFamily: {
    primary: 'Inter',           // Or 'SF Pro Display' on iOS
    mono: 'JetBrains Mono',     // Or 'SF Mono' on iOS — use for numbers
  },
  
  // Type scale
  display: {
    large: {
      fontSize: 34,
      lineHeight: 41,
      letterSpacing: -0.4,
      fontWeight: '700',
    },
    medium: {
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.3,
      fontWeight: '700',
    },
    small: {
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.2,
      fontWeight: '600',
    },
  },
  
  title: {
    large: {
      fontSize: 20,
      lineHeight: 25,
      letterSpacing: -0.2,
      fontWeight: '600',
    },
    medium: {
      fontSize: 17,
      lineHeight: 22,
      letterSpacing: -0.1,
      fontWeight: '600',
    },
    small: {
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: 0,
      fontWeight: '600',
    },
  },
  
  body: {
    large: {
      fontSize: 17,
      lineHeight: 24,
      letterSpacing: 0,
      fontWeight: '400',
    },
    medium: {
      fontSize: 15,
      lineHeight: 22,
      letterSpacing: 0,
      fontWeight: '400',
    },
    small: {
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      fontWeight: '400',
    },
  },
  
  caption: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
    fontWeight: '400',
  },
  
  overline: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  
  // Numeric typography (for calories, macros, weight)
  metric: {
    large: {
      fontSize: 48,
      lineHeight: 52,
      letterSpacing: -1.0,
      fontWeight: '700',
      fontFamily: 'mono',
    },
    medium: {
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.5,
      fontWeight: '600',
      fontFamily: 'mono',
    },
    small: {
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.3,
      fontWeight: '500',
      fontFamily: 'mono',
    },
    tiny: {
      fontSize: 17,
      lineHeight: 22,
      letterSpacing: 0,
      fontWeight: '500',
      fontFamily: 'mono',
    },
  },
};
```

### Spacing

```javascript
const spacing = {
  // Base unit: 4px
  0: 0,
  1: 4,    // Tight padding
  2: 8,    // Inline spacing
  3: 12,   // Compact padding
  4: 16,   // Standard padding
  5: 20,   // Comfortable padding
  6: 24,   // Section spacing
  8: 32,   // Large section spacing
  10: 40,  // Screen section breaks
  12: 48,  // Major section breaks
  16: 64,  // Screen-level spacing
  
  // Component-specific
  cardPadding: 16,
  cardGap: 12,
  listItemHeight: 56,
  listItemPadding: 16,
  buttonPaddingV: 12,
  buttonPaddingH: 24,
  inputPaddingV: 12,
  inputPaddingH: 16,
  screenEdgePadding: 16,
  bottomNavHeight: 83, // Including safe area
};
```

### Border Radius

```javascript
const borderRadius = {
  none: 0,
  sm: 4,      // Small elements, tags
  md: 8,      // Buttons, inputs
  lg: 12,     // Cards
  xl: 16,     // Large cards, modals
  full: 9999, // Pills, circular elements
};
```

### Shadows

```javascript
const shadows = {
  // Dark mode — subtle glow effect
  dark: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 8px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.5)',
  },
  
  // Light mode — traditional shadows
  light: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 8px rgba(0, 0, 0, 0.1)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.15)',
  },
};
```

---

## Component Patterns

### Progress Ring (Calorie Display)

```jsx
// Main calorie display — center of home screen
<View style={styles.progressContainer}>
  <CircularProgress
    size={200}
    strokeWidth={12}
    progress={consumed / target}
    trackColor={colors.ringTrack}
    fillColor={colors.ringFill}
  >
    <View style={styles.progressContent}>
      <Text style={typography.metric.large}>{consumed}</Text>
      <Text style={typography.caption}>of {target} kcal</Text>
    </View>
  </CircularProgress>
</View>

// Style: No animation on load, smooth animation on value change
// Progress should never turn red when over target — just continue filling
```

### Macro Bar

```jsx
// Horizontal bar showing macro breakdown
<View style={styles.macroBar}>
  <View style={[styles.macroSegment, { flex: protein, backgroundColor: colors.protein }]} />
  <View style={[styles.macroSegment, { flex: carbs, backgroundColor: colors.carbs }]} />
  <View style={[styles.macroSegment, { flex: fat, backgroundColor: colors.fat }]} />
</View>

// Below the bar, show values:
<View style={styles.macroLabels}>
  <MacroLabel icon="P" value={protein} color={colors.protein} />
  <MacroLabel icon="C" value={carbs} color={colors.carbs} />
  <MacroLabel icon="F" value={fat} color={colors.fat} />
</View>

// Style: 4px height, rounded ends, gap between segments
```

### Meal Section

```jsx
// Collapsible meal section (Breakfast, Lunch, etc.)
<View style={styles.mealSection}>
  <Pressable style={styles.mealHeader} onPress={toggleExpand}>
    <Text style={typography.title.medium}>{mealName}</Text>
    <Text style={typography.body.medium}>{totalCalories} kcal</Text>
    <TouchableOpacity onPress={onAddFood} hitSlop={8}>
      <PlusIcon size={24} color={colors.accent} />
    </TouchableOpacity>
  </Pressable>
  
  {expanded && (
    <View style={styles.mealItems}>
      {items.map(item => (
        <FoodItem key={item.id} {...item} />
      ))}
    </View>
  )}
</View>
```

### Food Item Row

```jsx
<Pressable style={styles.foodItem} onPress={onEdit}>
  <View style={styles.foodItemContent}>
    <Text style={typography.body.medium} numberOfLines={1}>
      {name}
    </Text>
    <Text style={typography.caption}>
      {servings} {servingUnit}
    </Text>
  </View>
  <Text style={typography.body.medium}>
    {calories} kcal
  </Text>
</Pressable>

// Style: 56px height, horizontal padding, swipe to delete
```

### Add Food Button

```jsx
// Floating action button for quick add
<Pressable style={styles.fab}>
  <PlusIcon size={24} color={colors.textPrimary} />
</Pressable>

// Position: Bottom right, 16px from edge, above tab bar
// Size: 56px diameter
// Background: accent color
// Shadow: md
```

### Barcode Scanner Overlay

```jsx
<View style={styles.scannerOverlay}>
  <View style={styles.scannerFrame}>
    {/* Rounded corners only, transparent center */}
    <View style={styles.cornerTL} />
    <View style={styles.cornerTR} />
    <View style={styles.cornerBL} />
    <View style={styles.cornerBR} />
  </View>
  
  <Text style={styles.scannerHint}>
    Align barcode within frame
  </Text>
</View>

// Frame: 250x150px, 16px corner radius
// Corners: 3px stroke, accent color, 24px length
```

### Weight Entry Roller

```jsx
// Use native picker or custom roller for weight input
<WeightPicker
  value={weight}
  onChange={setWeight}
  unit={unit} // 'kg' or 'lbs'
  min={unit === 'kg' ? 30 : 66}
  max={unit === 'kg' ? 250 : 550}
  step={unit === 'kg' ? 0.1 : 0.2}
/>

// Style: Large, easy to scroll
// Default to last logged weight
// Show change from previous (+/- kg/lbs)
```

### Chart (Weight/Calorie Trend)

```jsx
<LineChart
  data={weightData}
  width={screenWidth - 32}
  height={200}
  chartConfig={{
    backgroundColor: colors.bgSecondary,
    backgroundGradientFrom: colors.bgSecondary,
    backgroundGradientTo: colors.bgSecondary,
    color: () => colors.accent,
    labelColor: () => colors.textSecondary,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.accent,
    },
  }}
  bezier // Smooth line
  withInnerLines={false}
  withOuterLines={false}
/>

// Show trend line (moving average) in addition to raw data
// Time periods: 7d, 30d, 90d, All
```

---

## Screen Layouts

### Home Screen (Today)

```
┌─────────────────────────────────────────┐
│ ◀ Mon, Jan 25           [⚙️]           │  ← Date nav + settings
├─────────────────────────────────────────┤
│                                         │
│          ┌─────────────────┐           │
│          │                 │           │
│          │     1,450       │           │  ← Calorie ring
│          │   of 2,100      │           │
│          │                 │           │
│          └─────────────────┘           │
│                                         │
│     P: 85g    C: 180g    F: 45g        │  ← Macro summary
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  Breakfast                 340    [+]   │
│    Oatmeal with banana     240 kcal    │
│    Black coffee             2 kcal     │
│                                         │
│  Lunch                       0    [+]   │
│    Tap + to add food                   │
│                                         │
│  Dinner                      0    [+]   │
│    Tap + to add food                   │
│                                         │
│  Snacks                    110    [+]   │
│    Apple                    95 kcal    │
│    Almonds (10)            70 kcal     │
│                                         │
├─────────────────────────────────────────┤
│   [🏠]      [📊]      [⚙️]            │  ← Tab bar
│   Today    Progress   Settings          │
└─────────────────────────────────────────┘
```

### Add Food Screen

```
┌─────────────────────────────────────────┐
│ ← Add to Breakfast                      │
├─────────────────────────────────────────┤
│                                         │
│  🔍 Search foods...              [📷]   │  ← Search + barcode
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  RECENT                                 │
│  ┌─────────────────────────────────┐   │
│  │ Oatmeal           150 kcal  [+] │   │
│  │ Banana             90 kcal  [+] │   │
│  │ Black coffee        2 kcal  [+] │   │
│  └─────────────────────────────────┘   │
│                                         │
│  FREQUENT                               │
│  ┌─────────────────────────────────┐   │
│  │ Scrambled eggs    200 kcal  [+] │   │
│  │ Toast w/ butter   180 kcal  [+] │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  [➕ Quick Add]     [🍽️ Create Food]   │  ← Bottom actions
│                                         │
└─────────────────────────────────────────┘
```

### Progress Screen

```
┌─────────────────────────────────────────┐
│ Progress                      [+ Weight]│
├─────────────────────────────────────────┤
│                                         │
│  Weight                                 │
│  ┌─────────────────────────────────┐   │
│  │                                  │   │
│  │     📈 Chart (7d default)       │   │
│  │                                  │   │
│  └─────────────────────────────────┘   │
│  [7d] [30d] [90d] [All]                │
│                                         │
│  Current: 180.2 lbs  (-2.3 this week)  │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  Calories                               │
│  ┌─────────────────────────────────┐   │
│  │                                  │   │
│  │     📊 Bar chart (7d)           │   │
│  │                                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Average: 1,850 kcal/day               │
│                                         │
├─────────────────────────────────────────┤
│   [🏠]      [📊]      [⚙️]            │
│   Today    Progress   Settings          │
└─────────────────────────────────────────┘
```

---

## Interaction Guidelines

### Animations

| Action | Animation | Duration |
|--------|-----------|----------|
| Screen transition | Slide from right | 300ms |
| Modal appear | Fade + slide up | 250ms |
| List item delete | Slide out + collapse | 200ms |
| Progress ring fill | Ease-out | 400ms |
| Tab switch | Cross-fade | 150ms |

### Haptics

| Action | Haptic |
|--------|--------|
| Food logged | Light impact |
| Barcode scanned successfully | Success |
| Item deleted | Medium impact |
| Error | Error notification |
| Weight logged | Light impact |

### Gestures

| Gesture | Action |
|---------|--------|
| Swipe left on food item | Reveal delete |
| Swipe right on food item | Quick duplicate |
| Pull down on list | Refresh (if online) |
| Long press on food item | Edit serving size |
| Swipe left/right on date | Previous/next day |

---

## Empty States

### No Foods Logged

```
┌─────────────────────────────────────────┐
│                                         │
│           🍽️                            │
│                                         │
│    Start tracking your day              │
│                                         │
│    Tap + to add your first meal        │
│                                         │
│         [+ Add Food]                    │
│                                         │
└─────────────────────────────────────────┘
```

### No Weight History

```
┌─────────────────────────────────────────┐
│                                         │
│           ⚖️                            │
│                                         │
│    Log your first weight                │
│                                         │
│    Track your progress over time        │
│                                         │
│         [+ Log Weight]                  │
│                                         │
└─────────────────────────────────────────┘
```

### Barcode Not Found

```
┌─────────────────────────────────────────┐
│                                         │
│           🔍                            │
│                                         │
│    Product not found                    │
│                                         │
│    Try searching by name or             │
│    create a custom food                 │
│                                         │
│    [Search]    [Create Food]            │
│                                         │
└─────────────────────────────────────────┘
```

---

## Error States

### Network Error (Non-Blocking)

```jsx
// Toast notification — doesn't block usage
<Toast
  message="Couldn't search online. Showing cached results."
  icon="wifi-off"
  duration={3000}
/>
```

### Barcode Scan Failed

```jsx
// Inline message in scanner
<View style={styles.scanError}>
  <Text>Couldn't read barcode. Try again or search manually.</Text>
</View>
```

---

## Anti-Patterns to Avoid

### Never Do This

```jsx
// ❌ Red text for over budget
<Text style={{ color: 'red' }}>{calories} over!</Text>

// ❌ Warning modal for going over
<Modal title="Warning">You've exceeded your calorie goal!</Modal>

// ❌ Confetti for hitting goal
<Confetti />

// ❌ Motivational pop-ups
<Modal title="Great job!">Keep up the good work!</Modal>

// ❌ Streak counters
<Text>🔥 5 day streak!</Text>

// ❌ Achievement badges
<Badge>Perfect Week!</Badge>
```

### Always Do This

```jsx
// ✅ Neutral indicator when over budget
<Text style={{ color: colors.textPrimary }}>
  {calories} kcal ({overBy} over target)
</Text>

// ✅ Subtle progress indication
<CircularProgress progress={Math.min(1, consumed / target)} />
// (Just stops at 100%, doesn't turn red or warn)

// ✅ Quiet success confirmation
<Toast message="Logged" duration={1000} />
```

---

## Accessibility

### Touch Targets
- Minimum 44x44pt touch target for all interactive elements
- 8pt minimum spacing between touch targets

### Contrast
- Text contrast ratio: minimum 4.5:1 (body), 3:1 (large text)
- All colors in palette meet WCAG AA

### Screen Reader
- All images have `accessibilityLabel`
- Custom components have `accessibilityRole`
- Progress announced: "1450 of 2100 calories"

### Motion
- Respect `prefers-reduced-motion`
- No auto-playing animations
- All animations < 500ms

---

## Implementation Notes

### Offline Handling

```javascript
// Check network before API calls
const isOnline = await NetInfo.fetch().then(state => state.isConnected);

if (isOnline) {
  // Try API lookup
  const result = await openFoodFactsLookup(barcode);
  // Cache result locally
  await cacheFood(result);
} else {
  // Search local cache only
  const result = await localSearch(barcode);
}
```

### Data Persistence

```javascript
// Use SQLite for all local data
// Tables: foods, log_entries, weight_entries, user_goals

// Example: Save food log
const saveLogEntry = async (entry) => {
  await db.runAsync(
    `INSERT INTO log_entries (id, food_id, date, meal_type, servings) 
     VALUES (?, ?, ?, ?, ?)`,
    [entry.id, entry.foodId, entry.date, entry.mealType, entry.servings]
  );
};
```

### Barcode Scanning

```javascript
// Use expo-barcode-scanner or react-native-camera
// On successful scan:
const handleBarcodeScan = async (barcode) => {
  // 1. Check local cache first
  let food = await localLookup(barcode);
  
  if (!food) {
    // 2. Try Open Food Facts API
    food = await openFoodFactsLookup(barcode);
    
    if (food) {
      // Cache for offline use
      await cacheFood(food);
    }
  }
  
  if (food) {
    navigateToFoodDetail(food);
  } else {
    showNotFoundSheet();
  }
};
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-25 | Initial specification |
