# Weight Trend Graph Porting Guide (NutritionRx -> Gym App)

## Goal
Document how NutritionRx's current Weight Trend graph works end-to-end so you can replace the graph in your gym app with the same behavior.

## Drop-In Bundle Generated
Copy-ready files are now included in:
- `/Users/garrettcoughlin/Desktop/NutritionRx/docs/weight-trend-dropin/README.md`
- `/Users/garrettcoughlin/Desktop/NutritionRx/docs/weight-trend-dropin/WeightTrendChartMinimal.tsx`
- `/Users/garrettcoughlin/Desktop/NutritionRx/docs/weight-trend-dropin/trendWeight.ts`
- `/Users/garrettcoughlin/Desktop/NutritionRx/docs/weight-trend-dropin/weightTrendAdapters.ts`
- `/Users/garrettcoughlin/Desktop/NutritionRx/docs/weight-trend-dropin/types.ts`

## Where the graph is used
- Progress screen: `/Users/garrettcoughlin/Desktop/NutritionRx/src/app/(tabs)/progress.tsx:436`
- Dashboard widget wrapper: `/Users/garrettcoughlin/Desktop/NutritionRx/src/components/dashboard/widgets/WeightTrendWidget.tsx:34`
- Chart implementation: `/Users/garrettcoughlin/Desktop/NutritionRx/src/components/charts/WeightTrendChart.tsx:198`
- Legacy chart (not currently mounted): `/Users/garrettcoughlin/Desktop/NutritionRx/src/components/charts/WeightChart.tsx:31`

## Current component API
`WeightTrendChart` props are defined at `/Users/garrettcoughlin/Desktop/NutritionRx/src/components/charts/WeightTrendChart.tsx:185`.

- `entries: WeightEntry[]` (required)
- `chartHeight?: number` (default `120`)
- `initialWindowDays?: number` (default `30`)
- `onWindowDaysChange?: (days: number) => void`
- `targetWeightKg?: number | null` (shown in summary row only)
- `gesturesDisabled?: boolean` (used by dashboard edit mode)

## UX behavior implemented
Primary behavior is implemented in `/Users/garrettcoughlin/Desktop/NutritionRx/src/components/charts/WeightTrendChart.tsx`.

- Pinch-to-zoom with continuous window size (`3..365` days): lines 41-43, 459-479.
- Horizontal pan through history: lines 481-504.
- Long-press tooltip snapping to nearest point: lines 506-548, 759-800.
- Time-proportional x-axis labels with adaptive formats: lines 133-159, 575-587, 699-711.
- Y-axis hysteresis during active gestures (prevents y-scale jitter): lines 264-266, 296-321, 434-453.
- Binary-search window slicing for performance: lines 78-101, 393-413.
- Preset pills (`1W`, `1M`, `3M`, `6M`, `1Y`) plus proximity-based active state: lines 47-53, 117-131, 832-867.
- Summary row (`Current`, `Trend`, optional `Goal`, `Change`): lines 627-665.
- Edge states:
  - No entries: "Log your first weigh-in..." lines 602-609.
  - Single entry: single value + hint lines 611-623.
  - Empty visible window: "No data in this range" lines 802-813.

## Data model and flow

### Weight entry model
- Domain type includes both raw and trend weight:
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/types/domain.ts:85`
- DB row includes `trend_weight_kg`:
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/types/database.ts:81`
- Row -> domain mapping:
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/types/mappers.ts:92`

### How chart data is prepared
In chart component:
- Sort ascending by date and normalize date to noon local time (`T12:00:00`) to reduce timezone edge issues:
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/components/charts/WeightTrendChart.tsx:225`
- Use stored trend value if present, otherwise fallback to raw weight:
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/components/charts/WeightTrendChart.tsx:231`
- Convert to lbs on the fly from settings (`weightMultiplier`):
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/components/charts/WeightTrendChart.tsx:209`

### Where entries come from
- Progress screen loads up to 500 recent entries, then renders chart:
  - load: `/Users/garrettcoughlin/Desktop/NutritionRx/src/app/(tabs)/progress.tsx:274`
  - render: `/Users/garrettcoughlin/Desktop/NutritionRx/src/app/(tabs)/progress.tsx:436`
- Dashboard widget also loads 500 and renders chart with persisted zoom:
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/components/dashboard/widgets/WeightTrendWidget.tsx:47`

## Trend calculation (source of truth)
Trend is precomputed and persisted in DB; chart reads it.

- Canonical math module:
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/utils/trendWeight.ts:1`
- Half-life:
  - `HALF_LIFE_DAYS = 7` at line 11.
- Effective alpha:
  - `alpha = 1 - 2^(-dayGap / HALF_LIFE_DAYS)` at lines 18-27.
- Incremental recompute from changed date forward:
  - `recomputeEWMAFromDate(...)` at lines 63-120.

### Recompute triggers
Repository recomputes trend after writes:
- Create: `/Users/garrettcoughlin/Desktop/NutritionRx/src/repositories/weightRepository.ts:133`
- Update: `/Users/garrettcoughlin/Desktop/NutritionRx/src/repositories/weightRepository.ts:163`
- Delete: `/Users/garrettcoughlin/Desktop/NutritionRx/src/repositories/weightRepository.ts:199`
- Recompute batching strategy (`CASE WHEN ...`) for performance:
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/repositories/weightRepository.ts:112`

Reflection flow also recomputes trend in transaction:
- `/Users/garrettcoughlin/Desktop/NutritionRx/src/stores/reflectionStore.ts:232`

### Schema and migrations
- Initial `weight_entries` table (no trend column initially):
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/db/migrations/001_initial.ts:124`
- Migration adds `trend_weight_kg` + backfills EWMA:
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/db/migrations/017_trend_weight.ts:6`
- Migration 020 re-unifies all trend values via canonical utility:
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/db/migrations/020_unify_trend_weight.ts:14`
- Current schema version `20`:
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/db/migrations/index.ts:23`

## Dashboard-specific persistence
`WeightTrendWidget` persists zoom state in widget config.

- Config supports legacy + new key:
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/types/dashboard.ts:30`
- Legacy `chartRange` -> `chartWindowDays` migration on read/write:
  - read: `/Users/garrettcoughlin/Desktop/NutritionRx/src/components/dashboard/widgets/WeightTrendWidget.tsx:27`
  - write: `/Users/garrettcoughlin/Desktop/NutritionRx/src/components/dashboard/widgets/WeightTrendWidget.tsx:51`

## Dependencies you need in gym app
Core runtime libraries used by this graph:
- `react-native-svg`: `/Users/garrettcoughlin/Desktop/NutritionRx/package.json:57`
- `react-native-gesture-handler`: `/Users/garrettcoughlin/Desktop/NutritionRx/package.json:51`
- `react-native-reanimated`: `/Users/garrettcoughlin/Desktop/NutritionRx/package.json:54`

Theme color usage for raw/trend lines:
- `/Users/garrettcoughlin/Desktop/NutritionRx/src/constants/colors.ts:101`

## Porting strategy

### Option A (recommended): keep stored trend values
Use the same architecture as NutritionRx:
1. Add `trend_weight_kg` to your weight table.
2. Recompute from edited date forward after any create/update/delete.
3. Feed chart `entries` with both `weightKg` and `trendWeightKg`.
4. Keep chart render pure; do not compute trend in render path.

This gives consistent trend values across chart + any other analytics.

### Option B: compute trend in memory only
If your gym app does not have DB trend storage yet:
1. Reuse `computeTrendSeries` logic from `/Users/garrettcoughlin/Desktop/NutritionRx/src/utils/trendWeight.ts:33`.
2. Build a view-model list with `{ weight, trendWeight, dateMs }`.
3. Pass it into a simplified chart adapter.

Tradeoff: easier initial integration, but trend can drift from other features if computed differently elsewhere.

## Gym-App Data Mapping Worksheet
Use this worksheet to map your gym app model into `WeightTrendEntry`.

Target entry shape:
```ts
type WeightTrendEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  trendWeightKg?: number;
};
```

Map these fields:
- `id`: unique weigh-in identifier (or synthetic stable id)
- `date`: normalize to local-day key (`YYYY-MM-DD`)
- `weightKg`: canonical kg value (convert if source is lbs)
- `trendWeightKg` (optional): existing stored trend (kg) if available

Recommended adapter path:
1. Copy `/Users/garrettcoughlin/Desktop/NutritionRx/docs/weight-trend-dropin/weightTrendAdapters.ts`
2. Start with `adaptWeightEntries(...)`
3. Set `computeTrendIfMissing: true` for initial migration
4. Move to persisted trend values when DB update is ready

## Important implementation notes for parity
- Dates are treated as local-day strings and converted with `'T12:00:00'` before math to avoid midnight timezone drift:
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/components/charts/WeightTrendChart.tsx:230`
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/utils/trendWeight.ts:41`
- Trend line is shown only when at least 3 points exist in the visible slice:
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/components/charts/WeightTrendChart.tsx:43`
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/components/charts/WeightTrendChart.tsx:366`
- Data points are hidden when `visibleData.length > 30` to reduce clutter:
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/components/charts/WeightTrendChart.tsx:737`
- `targetWeightKg` currently affects summary stats only, not a plotted goal line:
  - summary use: `/Users/garrettcoughlin/Desktop/NutritionRx/src/components/charts/WeightTrendChart.tsx:643`

## Integration checklist for your gym app
- [ ] Add chart component equivalent to `WeightTrendChart`.
- [ ] Wire weight unit conversion (`kg` canonical storage, display conversion on render).
- [ ] Provide entries sorted ascending by date.
- [ ] Implement trend recompute from changed date forward.
- [ ] Persist zoom window if you have a dashboard widget context.
- [ ] Verify edge states for 0, 1, and sparse data.
- [ ] Verify pinch, pan, and long-press interactions inside scroll containers.

## Recommended Implementation Order
1. Copy `types.ts`, `trendWeight.ts`, `weightTrendAdapters.ts` from `/Users/garrettcoughlin/Desktop/NutritionRx/docs/weight-trend-dropin/`.
2. Add `WeightTrendChartMinimal.tsx` and render it with adapter output.
3. Keep `computeTrendIfMissing: true` until DB trend column is added.
4. Add `trend_weight_kg` column and recompute-on-write flow in your repository/service layer.
5. Disable in-memory trend fallback once persisted trend is available.

## Quick "what to copy first"
- Chart UI and gestures:
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/components/charts/WeightTrendChart.tsx`
- Trend math utility:
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/utils/trendWeight.ts`
- Repository recompute pattern:
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/repositories/weightRepository.ts`
- Widget zoom persistence (if needed):
  - `/Users/garrettcoughlin/Desktop/NutritionRx/src/components/dashboard/widgets/WeightTrendWidget.tsx`
