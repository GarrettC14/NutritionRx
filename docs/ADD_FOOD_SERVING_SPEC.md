# Add Food Screen - Flexible Serving Size Specification

## Overview

The Add Food screen allows users to log any food with flexible serving sizes. Users can enter any amount using their preferred unit (serving, grams, ounces, cups, etc.) via selectable pills — the same pattern used in the Create Food screen.

## Design Philosophy

- **Simple first**: Default to "1 serving" for fastest logging
- **Flexible when needed**: Easy access to any unit without extra taps
- **Real-time feedback**: Show nutrition updating as amount/unit changes
- **Remember preferences**: Store last-used unit per food for faster repeat logging

---

## Screen Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back                                      Add to Lunch   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🍌                                                  │   │
│  │  Banana, raw                                        │   │
│  │  Medium (118g per serving)                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  HOW MUCH?                                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │                    [ 1 ]                            │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │serving │ │   g    │ │   oz   │ │  cup   │ │  tbsp  │   │
│  │   ✓    │ │        │ │        │ │        │ │        │   │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │     105 cal                                         │   │
│  │                                                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │ P: 1.3g  │  │ C: 27g   │  │ F: 0.4g  │          │   │
│  │  └──────────┘  └──────────┘  └──────────┘          │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    [Add Food]                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Food Header
- Food emoji/icon (if available)
- Food name
- Default serving description (e.g., "Medium (118g per serving)")
- Source indicator for API foods (e.g., small "Open Food Facts" badge)

### 2. Amount Input
- Large, centered numeric input field
- Supports decimals (0.5, 1.5, etc.)
- Tap to open numeric keypad
- Default value: 1
- Auto-select all text on tap for easy replacement

### 3. Unit Selector Pills
Horizontal scrollable row of pill buttons:

| Unit | Label | Available When |
|------|-------|----------------|
| `serving` | "serving" | Always (uses food's defined serving) |
| `g` | "g" | When food has gram weight |
| `oz` | "oz" | When food has gram weight (auto-convert) |
| `cup` | "cup" | When food has volume data |
| `tbsp` | "tbsp" | When food has volume data |
| `tsp` | "tsp" | When food has volume data |
| `ml` | "ml" | When food has volume data |
| `fl oz` | "fl oz" | When food has volume data |

**Pill States:**
- **Selected**: Filled background (primary color), white text
- **Available**: Outlined, primary text color
- **Unavailable**: Hidden (don't show units that can't be calculated)

### 4. Nutrition Preview Card
- Shows calories prominently (large font)
- Macro pills below: Protein, Carbs, Fat
- Updates in real-time as amount/unit changes
- Subtle animation on value change (fade or count-up)

### 5. Add Button
- Primary action button
- Fixed at bottom of screen
- Label: "Add Food" or "Add to [Meal]"

---

## Interaction Flows

### Flow 1: Quick Add (Most Common)
1. User sees food with "1 serving" pre-selected
2. Tap "Add Food"
3. Done — food logged

### Flow 2: Partial Serving
1. User taps amount field
2. Types "0.5"
3. Nutrition preview updates to show half the values
4. Tap "Add Food"

### Flow 3: Weighed Food (Precision Tracking)
1. User taps "g" pill
2. Amount field clears or shows "100"
3. User types actual weight from scale (e.g., "145")
4. Nutrition preview updates based on gram weight
5. Tap "Add Food"

### Flow 4: Volume-Based
1. User taps "cup" pill
2. Types "0.5" for half cup
3. Nutrition preview updates
4. Tap "Add Food"

---

## Unit Conversion Logic

```typescript
interface FoodServingData {
  // From food database
  servingSizeG?: number;      // Grams per 1 serving (e.g., 118 for medium banana)
  servingSizeMl?: number;     // Milliliters per 1 serving (for liquids)
  caloriesPer100g: number;    // Base nutrition per 100g
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

// Conversion factors
const GRAMS_PER_OZ = 28.3495;
const ML_PER_CUP = 236.588;
const ML_PER_TBSP = 14.787;
const ML_PER_TSP = 4.929;
const ML_PER_FL_OZ = 29.5735;

function calculateNutrition(
  food: FoodServingData,
  amount: number,
  unit: ServingUnit
): NutritionValues {
  let grams: number;

  switch (unit) {
    case 'serving':
      grams = amount * (food.servingSizeG ?? 100);
      break;
    case 'g':
      grams = amount;
      break;
    case 'oz':
      grams = amount * GRAMS_PER_OZ;
      break;
    case 'cup':
      // Assume 1 cup = servingSizeMl or estimate from density
      grams = amount * (food.servingSizeMl ? food.servingSizeMl * (food.servingSizeG / food.servingSizeMl) : food.servingSizeG * 2);
      break;
    case 'tbsp':
      grams = amount * (food.servingSizeG / (food.servingSizeMl / ML_PER_TBSP));
      break;
    case 'tsp':
      grams = amount * (food.servingSizeG / (food.servingSizeMl / ML_PER_TSP));
      break;
    case 'ml':
      grams = amount * (food.servingSizeG / food.servingSizeMl);
      break;
    case 'fl oz':
      grams = amount * (food.servingSizeG / food.servingSizeMl) * ML_PER_FL_OZ;
      break;
  }

  const multiplier = grams / 100;

  return {
    calories: Math.round(food.caloriesPer100g * multiplier),
    protein: Math.round(food.proteinPer100g * multiplier * 10) / 10,
    carbs: Math.round(food.carbsPer100g * multiplier * 10) / 10,
    fat: Math.round(food.fatPer100g * multiplier * 10) / 10,
    grams: Math.round(grams),
  };
}
```

---

## Available Units by Food Type

| Food Type | Available Units |
|-----------|-----------------|
| **Solid foods** (banana, chicken) | serving, g, oz |
| **Liquids** (milk, juice) | serving, ml, fl oz, cup, tbsp, tsp |
| **Powders/granular** (flour, sugar) | serving, g, oz, cup, tbsp, tsp |
| **Spreads** (peanut butter) | serving, g, oz, tbsp, tsp |
| **Custom foods** | Whatever units were defined at creation |

---

## Database Schema Updates

Add to `food_logs` table:
```sql
-- Store the unit used for each log entry
serving_unit TEXT DEFAULT 'serving',  -- 'serving', 'g', 'oz', 'cup', 'tbsp', 'tsp', 'ml', 'fl_oz'
serving_amount REAL NOT NULL,          -- The numeric amount (e.g., 1.5)
serving_grams REAL,                     -- Calculated gram equivalent (for analytics)
```

Add to `foods` table (for tracking user preferences):
```sql
-- Track last used unit per food for this user
last_used_unit TEXT DEFAULT 'serving',
```

---

## TypeScript Types

```typescript
type ServingUnit = 'serving' | 'g' | 'oz' | 'cup' | 'tbsp' | 'tsp' | 'ml' | 'fl_oz';

interface ServingUnitConfig {
  id: ServingUnit;
  label: string;
  shortLabel: string;
  category: 'weight' | 'volume' | 'serving';
}

const SERVING_UNITS: ServingUnitConfig[] = [
  { id: 'serving', label: 'Serving', shortLabel: 'serving', category: 'serving' },
  { id: 'g', label: 'Grams', shortLabel: 'g', category: 'weight' },
  { id: 'oz', label: 'Ounces', shortLabel: 'oz', category: 'weight' },
  { id: 'cup', label: 'Cup', shortLabel: 'cup', category: 'volume' },
  { id: 'tbsp', label: 'Tablespoon', shortLabel: 'tbsp', category: 'volume' },
  { id: 'tsp', label: 'Teaspoon', shortLabel: 'tsp', category: 'volume' },
  { id: 'ml', label: 'Milliliters', shortLabel: 'ml', category: 'volume' },
  { id: 'fl_oz', label: 'Fluid Ounces', shortLabel: 'fl oz', category: 'volume' },
];

interface AddFoodState {
  food: Food;
  amount: number;
  unit: ServingUnit;
  calculatedNutrition: NutritionValues;
  availableUnits: ServingUnit[];
}
```

---

## Component: `ServingUnitPicker`

```tsx
interface ServingUnitPickerProps {
  selectedUnit: ServingUnit;
  availableUnits: ServingUnit[];
  onUnitChange: (unit: ServingUnit) => void;
}

// Renders as horizontal scrollable row of pills
// Only shows units that are available for this food
// Highlights selected unit with filled style
```

---

## Behavioral Rules

### 1. Default Unit Selection
- First time logging a food: Default to "serving"
- Repeat logging: Use last-used unit for that food
- After scanning barcode: Default to "serving"

### 2. Amount Field Behavior
- When unit changes to "g": Set amount to serving size in grams (e.g., 118)
- When unit changes to "serving": Set amount to 1
- When unit changes to other: Set amount to 1 (or equivalent)
- Preserve amount when switching between similar units (g ↔ oz)

### 3. Validation
- Amount must be > 0
- Amount must be ≤ 9999 (reasonable upper limit)
- Show warning for very large portions (e.g., > 5 servings)

### 4. Keyboard
- Numeric keypad with decimal point
- "Done" button to dismiss
- Auto-advance focus to Add button after entering amount

---

## Edge Cases

### Food Without Gram Weight
- Only show "serving" unit
- Show note: "Only serving size available"

### Food Without Volume Data
- Hide cup, tbsp, tsp, ml, fl oz options
- Only show: serving, g, oz

### Custom Foods
- Show only units that were defined during creation
- If user created with "per serving" only, that's all they see
- If user created with "per 100g", all weight units available

### Very Small Amounts
- Allow 0.1 minimum
- Round display to 1 decimal place
- Store full precision in database

---

## Testing Requirements

### Unit Tests

```typescript
describe('ServingUnitConverter', () => {
  it('converts 1 serving to correct grams', () => {});
  it('converts grams to ounces correctly', () => {});
  it('converts cups to grams for liquids', () => {});
  it('handles foods without gram weight', () => {});
  it('handles decimal amounts (0.5, 1.5)', () => {});
  it('calculates correct nutrition for all units', () => {});
});

describe('AddFoodScreen', () => {
  it('defaults to 1 serving for new foods', () => {});
  it('remembers last used unit for repeat foods', () => {});
  it('updates nutrition preview on amount change', () => {});
  it('updates nutrition preview on unit change', () => {});
  it('only shows available units for food type', () => {});
  it('validates amount is greater than 0', () => {});
});
```

### E2E Tests

```typescript
describe('Add Food with Flexible Servings', () => {
  it('logs food with default 1 serving', async () => {});
  it('logs food with 0.5 serving', async () => {});
  it('logs food by gram weight', async () => {});
  it('logs food by ounces', async () => {});
  it('logs liquid food by cups', async () => {});
  it('remembers last used unit on repeat log', async () => {});
  it('shows correct nutrition for each unit type', async () => {});
});
```

---

## Implementation Notes

### Performance
- Debounce nutrition calculation (100ms) when typing amount
- Pre-calculate available units when food loads
- Memoize unit conversion functions

### Accessibility
- Unit pills should be navigable via VoiceOver
- Amount field should announce current value
- Nutrition preview should announce on change

### Animation
- Subtle scale animation on pill selection
- Fade transition on nutrition value changes
- Avoid jarring layout shifts

---

## Visual Design Notes

### Pill Styling (matches Create Food screen)

```typescript
// Selected pill
{
  backgroundColor: colors.primary[500],  // Deep Navy
  borderColor: colors.primary[500],
  textColor: colors.neutral[50],         // White
}

// Unselected pill
{
  backgroundColor: 'transparent',
  borderColor: colors.neutral[300],
  textColor: colors.neutral[700],
}

// Pill dimensions
{
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 20,
  marginRight: 8,
}
```

### Amount Input Styling

```typescript
// Large, centered input
{
  fontSize: 48,
  fontWeight: '600',
  textAlign: 'center',
  color: colors.neutral[900],
  borderBottomWidth: 2,
  borderBottomColor: colors.primary[500],
}
```

---

## Summary

This specification creates a serving size picker that:

1. **Maintains simplicity**: Default "1 serving" flow is just 1 tap
2. **Enables flexibility**: Any unit accessible via pill selector
3. **Provides feedback**: Real-time nutrition preview
4. **Remembers preferences**: Last-used unit per food
5. **Stays consistent**: Same pill pattern as Create Food screen
6. **Handles edge cases**: Graceful fallbacks for missing data

The design prioritizes the 80% case (quick "1 serving" logging) while making the 20% case (precision gram logging) equally accessible without extra navigation.
