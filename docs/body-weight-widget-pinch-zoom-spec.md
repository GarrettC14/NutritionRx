# BodyWeightWidget Pinch-to-Zoom Redesign
## Research & Implementation Specification

---

## MacroFactor Reference Analysis

### How MacroFactor's Weight Chart Works

MacroFactor's weight chart is widely regarded as best-in-class in the fitness app space. Their approach evolved across several major releases:

**v1.3.5 (May 2022)** — First introduced pinch-to-zoom on charts for Weight Trend, Expenditure, Nutrition, and Scale Weight. This was a core interaction upgrade that applied to all their chart surfaces.

**v3.0 Dashboard Revamp (Sep 2024)** — Added a hybrid interaction model that combines:
- **6 preset time intervals** (3, 7, 14, 30, 90 days) as quick-select pills below the chart — "within thumb's reach"
- **Pinch and pan gestures** for continuous exploration within and beyond those presets
- **Tap-and-hold on data points** to surface an informative tooltip for data exploration
- **Dynamic summary stats** above the chart that update as the visible time window changes (e.g., average weight for the data in view)

**v4.0 Dashboard Customization (Nov 2024)** — Added temporal aggregation (daily, weekly, monthly) as a separate axis of control, letting users zoom semantically as well as temporally.

### Key UX Patterns to Adopt

#### 1. Dual-Layer Visualization: Raw + Trend
MacroFactor displays **two lines** on the weight chart:
- **Scale Weight** — a pale/lighter line showing raw daily weigh-ins, with linear interpolation for missing days
- **Weight Trend** — a bold/deep purple line showing the algorithmically smoothed trend that filters out daily noise (water weight, glycogen, sodium fluctuations)

This is the single most praised feature of the app. Users rave about it because it prevents the emotional rollercoaster of day-to-day scale fluctuations. The trend weight uses an exponential moving average approach.

**Recommendation for GymRx:** Even without the full expenditure algorithm, you can implement a simpler weighted moving average or exponential smoothing to show a trend line alongside raw data points. This would be a significant differentiator.

#### 2. Hybrid Time Control: Presets + Gestures
MacroFactor does NOT make users choose between preset buttons and gestures — they offer both:

- **Preset pills** serve as anchors / quick navigation: "Show me the last week" / "Show me the last 90 days"
- **Pinch-to-zoom** allows continuous refinement: "I want to see exactly the last 23 days"
- **Pan** allows scrolling through time: "Show me what was happening in November"
- **The chart header** dynamically updates to show the current window (e.g., date range, average weight for visible data)

This is smarter than the analysis document's suggestion to remove the pill buttons entirely. The pills are fast one-tap shortcuts; the gestures are for exploration.

#### 3. Data Point Interaction
- **Tap-and-hold** on any data point brings up a tooltip showing the exact value and date
- The tooltip is designed for "data exploration" — it's contextual and informative
- This replaces the current GymRx behavior where the entire widget is one big TouchableOpacity that navigates to /measurements

#### 4. Dynamic Analytics Above the Chart
As the visible window changes (via pinch/pan/preset), summary statistics above the chart update in real-time:
- Current trend weight
- Change over the visible period (e.g., "-2.3 lbs in 30 days")
- Rate of change

---

## Implementation Architecture

### State Model

Replace the current discrete `selectedRange` with a continuous window model:

```typescript
interface WeightChartState {
  // Core window state (shared values on UI thread)
  windowDays: number;           // Width of visible time window (continuous, 3–365)
  anchorDayOffset: number;      // Days offset from today for right edge (0 = today)

  // Derived (computed, not stored)
  // anchorDate = daysBefore(today, anchorDayOffset)
  // startDate  = daysBefore(anchorDate, windowDays)

  // Interaction state
  isGesturing: boolean;         // True during active pinch/pan
  selectedPoint: WeightPoint | null;  // For long-press tooltip
  lockedYMin: number | null;    // Y-scale lock during gesture
  lockedYMax: number | null;    // Y-scale lock during gesture

  // Persisted preference
  lastWindowDays: number;       // Saved to WidgetConfig for session persistence
}
```

**WidgetConfig change:**
```typescript
// Before
chartRange?: '7d' | '30d' | '90d';

// After
chartWindowDays?: number;  // Continuous, persisted last zoom level
```

**Config migration (read-time):**

When reading WidgetConfig, transparently convert legacy `chartRange` to the new `chartWindowDays` format:

```typescript
const LEGACY_RANGE_TO_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '180d': 180,
};

function readChartWindowDays(config: WidgetConfig): number {
  // New format takes precedence
  if (config.chartWindowDays != null) {
    return config.chartWindowDays;
  }
  // Migrate legacy format
  if (config.chartRange != null) {
    return LEGACY_RANGE_TO_DAYS[config.chartRange] ?? 30;
  }
  // Default
  return 30;
}

// On first write after migration, persist as new format and clear legacy key
function writeChartWindowDays(config: WidgetConfig, days: number): WidgetConfig {
  return {
    ...config,
    chartWindowDays: days,
    chartRange: undefined, // Clear legacy key
  };
}
```

This ensures existing users who had "3M" selected see 90 days on upgrade with no disruption. The legacy field is cleaned up on the next write.

### Gesture Architecture

Use `react-native-gesture-handler` v2's declarative Gesture API (already installed) with `react-native-reanimated` shared values for 60fps performance.

```typescript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, runOnJS } from 'react-native-reanimated';

// Shared values (run on UI thread)
const windowDays = useSharedValue(30);
const savedWindowDays = useSharedValue(30);
const anchorDayOffset = useSharedValue(0);       // Days offset from today (0 = anchored to today)
const savedAnchorDayOffset = useSharedValue(0);

// --- PINCH GESTURE ---
const pinchGesture = Gesture.Pinch()
  .onStart(() => {
    savedWindowDays.value = windowDays.value;
    onGestureActivate();
  })
  .onUpdate((e) => {
    // Inverse relationship: pinch in (scale > 1) = fewer days = zoom in
    const newDays = savedWindowDays.value / e.scale;
    windowDays.value = clamp(newDays, MIN_DAYS, MAX_DAYS);
  })
  .onEnd(() => {
    // Snap to nearest whole day
    windowDays.value = Math.round(windowDays.value);
    runOnJS(persistWindowDays)(windowDays.value);
  })
  .onFinalize(() => {
    // Fires on END, CANCELLED, and FAILED — safe to decrement always
    onGestureDeactivate();
  });

// --- PAN GESTURE ---
const panGesture = Gesture.Pan()
  .onStart(() => {
    savedAnchorDayOffset.value = anchorDayOffset.value;
    onGestureActivate();
  })
  .onUpdate((e) => {
    // Convert pixel translation to days (all math stays in day units)
    const daysPerPixel = windowDays.value / chartWidth;
    // Negative translationX (drag left) = move forward in time = decrease offset
    const daysDelta = -e.translationX * daysPerPixel;
    const newOffset = savedAnchorDayOffset.value + daysDelta;
    // Clamp: can't go past today (offset >= 0), can't go past oldest data
    anchorDayOffset.value = clamp(newOffset, 0, maxHistoryDays);
  })
  .onEnd(() => {
    // Snap to nearest whole day
    anchorDayOffset.value = Math.round(anchorDayOffset.value);
    runOnJS(persistAnchorOffset)(anchorDayOffset.value);
  })
  .onFinalize(() => {
    onGestureDeactivate();
  });

// --- LONG PRESS for tooltip ---
const longPressGesture = Gesture.LongPress()
  .minDuration(300)
  .numberOfPointers(1)
  .maxDistance(10)
  .onStart((e) => {
    if (activeGestureCount.value > 0) return; // Pinch/pan in progress, suppress
    runOnJS(showTooltipAtPosition)(e.x, e.y);
  })
  .onEnd(() => {
    runOnJS(hideTooltip)();
  });

// --- COMPOSE ---
const composedGesture = Gesture.Simultaneous(
  pinchGesture,
  panGesture,
  longPressGesture
);
```

### Threading Model & Data Ownership

| Concern | Thread | Mechanism |
|---------|--------|-----------|
| `windowDays`, `anchorDayOffset` | UI (shared values) | Updated every gesture frame |
| `windowStartMs`, `windowEndMs` | UI (shared values) | Updated via `runOnJS` → `updateWindowBounds` |
| Binary search (`visibleRange`) | UI (worklet) | `useDerivedValue` against shared ms boundaries |
| Data slicing (`allWeightData.slice`) | JS | Triggered by `visibleRange` change via `useAnimatedReaction` |
| SVG path string generation | JS | Computed from sliced data, passed to `<Path d={...}>` |
| Y-axis lock/unlock | UI (shared values) | `activeGestureCount` drives lock state |

### DST-Safe Date Math

```typescript
function daysBefore(date: Date, days: number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return new Date(d.getTime() - 1);
}
```

### Trend Line (Time-delta-adjusted EMA)

```typescript
const HALF_LIFE_DAYS = 7;

function calendarDaysBetween(a: Date, b: Date): number {
  const aNorm = new Date(a); aNorm.setHours(0, 0, 0, 0);
  const bNorm = new Date(b); bNorm.setHours(0, 0, 0, 0);
  const msPerDay = 86400000;
  return Math.round((bNorm.getTime() - aNorm.getTime()) / msPerDay);
}

function calculateTrendWeight(data: WeightPoint[]): WeightPoint[] {
  if (data.length === 0) return [];
  const trend: WeightPoint[] = [{ ...data[0] }];
  for (let i = 1; i < data.length; i++) {
    const dtDays = calendarDaysBetween(data[i - 1].date, data[i].date);
    const alpha = 1 - Math.pow(2, -dtDays / HALF_LIFE_DAYS);
    const trendWeight = alpha * data[i].weight + (1 - alpha) * trend[i - 1].weight;
    trend.push({ date: data[i].date, weight: trendWeight, dateMs: data[i].dateMs });
  }
  return trend;
}
```

---

## Migration Checklist

### Remove
- [ ] `TimeRange` type ('7d' | '30d' | '90d' | '180d') from widget
- [ ] `selectedRange` state and `setSelectedRange`
- [ ] Range-specific date formatting logic
- [ ] `TouchableOpacity` wrapping the entire widget
- [ ] Tap gesture in chart area (navigation moved to header only)

### Add
- [ ] Continuous `windowDays` + `anchorDayOffset` state model
- [ ] `GestureDetector` with `Gesture.Simultaneous(pinch, pan, longPress)`
- [ ] Shared values for all gesture-driven state
- [ ] Binary search (`lowerBound`/`upperBound`) for visible data windowing
- [ ] Time-proportional X-axis calculation
- [ ] Adaptive axis labels based on `windowDays`
- [ ] Time-delta-adjusted trend weight line
- [ ] Dynamic summary stats header
- [ ] Data point tooltip on long-press
- [ ] Preset pills with min-distance highlight + smooth animation
- [ ] Eager data loading with pre-extracted timestamp array
- [ ] Y-axis hysteresis via `activeGestureCount`
- [ ] DST-safe date math
- [ ] Config migration: `readChartWindowDays()`
- [ ] `useAnimatedReaction` bridge
- [ ] Empty/sparse data guards

### Modify
- [ ] `WidgetConfig` — add `chartWindowDays: number`, deprecate `chartRange`
- [ ] Chart layout — isolate gesture area from header/footer
- [ ] Y-axis auto-scaling with hysteresis during gestures
- [ ] Preset pills — keep but add 1Y and smart highlighting

---

## Complexity Estimate

| Component | Effort | Notes |
|-----------|--------|-------|
| Gesture setup (Pinch + Pan + LongPress) | ~80 lines | Simultaneous composition, day-unit math, long-press guards |
| Animated shared values & derived data | ~60 lines | windowDays, anchorDayOffset, windowStartMs/EndMs |
| Binary search visible window | ~30 lines | lowerBound/upperBound worklets + timestamp extraction |
| Threading bridge (`useAnimatedReaction`) | ~30 lines | UI-thread indices → JS-thread slice + path regen |
| Time-proportional X-axis | ~30 lines | Replace index-based spacing |
| Time-delta-adjusted trend weight | ~30 lines | Alpha varies with gap size via half-life formula |
| Adaptive axis labels | ~30 lines | Dynamic tick count + format |
| Tooltip component | ~60 lines | Floating card + nearest-point logic |
| Dynamic summary header | ~40 lines | Current trend, change, rate |
| Y-axis hysteresis (`activeGestureCount`) | ~40 lines | Lock/unlock lifecycle + withTiming settle |
| DST-safe date utilities | ~25 lines | daysBefore(), toDayKey(), updateWindowBounds() |
| Config migration | ~20 lines | readChartWindowDays(), writeChartWindowDays() |
| Preset pills refactor | ~35 lines | Min-distance highlight, disabled states, withTiming snap |
| Empty/sparse data edge cases | ~45 lines | Empty state, single-point, short-history, empty-window guards |
| Widget layout restructure | ~20 lines | Isolate gesture area, header-only navigation |
| **Total** | **~570 lines** | Net increase ~340 lines after removing old code |
