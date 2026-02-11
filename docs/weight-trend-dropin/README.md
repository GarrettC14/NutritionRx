# Weight Trend Drop-In Bundle

This folder contains a copy-ready, app-agnostic bundle you can move into your gym app.

## Files
- `WeightTrendChartMinimal.tsx`: reusable React Native chart with pinch, pan, presets, and tooltip.
- `trendWeight.ts`: canonical EWMA trend math (half-life based).
- `weightTrendAdapters.ts`: data-model adapters to normalize gym app records into chart entries.
- `types.ts`: shared chart types + default color palette.

## Install requirements (if missing)
- `react-native-svg`
- `react-native-gesture-handler`
- `react-native-reanimated`

## 1) Map your gym data model

If your gym app uses a shape like:
```ts
type GymCheckIn = {
  id: string;
  measuredAt: string; // ISO
  bodyWeight: number;
  unit: 'kg' | 'lbs';
  trendWeight?: number;
};
```

Use:
```ts
import { adaptFromGymCheckIns } from './weightTrendAdapters';

const entries = adaptFromGymCheckIns(checkIns);
```

For custom shapes:
```ts
import { adaptWeightEntries } from './weightTrendAdapters';

const entries = adaptWeightEntries(rawRows, {
  getId: (row, i) => row.entryId ?? String(i),
  getDate: (row) => row.logged_at,
  getWeight: (row) => row.weight_value,
  getWeightUnit: (row) => row.weight_unit, // 'kg' | 'lbs'
  getTrendWeight: (row) => row.trend_value,
  dedupeByDate: 'last',
  computeTrendIfMissing: true,
});
```

## 2) Render the chart

```tsx
import { WeightTrendChartMinimal } from './WeightTrendChartMinimal';

<WeightTrendChartMinimal
  entries={entries}
  unit="lbs"
  chartHeight={200}
  initialWindowDays={30}
  targetWeightKg={goalWeightKg}
  onWindowDaysChange={(days) => saveUserPreference(days)}
/>;
```

## 3) Persist trend values (recommended)

For consistency across features, persist `trend_weight_kg` in your DB and recompute forward on edits:
- On create/update/delete of a weigh-in:
  - load entries ordered by date asc
  - run `recomputeEWMAFromDate(...)` from changed date
  - write updated `trend_weight_kg` for affected rows

## 4) Suggested DB schema change

```sql
ALTER TABLE weight_entries ADD COLUMN trend_weight_kg REAL;
CREATE INDEX IF NOT EXISTS idx_weight_entries_date ON weight_entries(date DESC);
```

## 5) Integration checks
- 0 entries: chart empty state renders.
- 1 entry: single value state renders.
- >=3 entries: trend line appears.
- pinch zoom changes window (`3..365` days).
- pan shifts historical window.
- long-press tooltip snaps to nearest point.
- unit conversion remains display-only (`kg` canonical storage).

## 6) Notes
- Input `date` should be day-level (`YYYY-MM-DD`) whenever possible.
- Adapter normalizes timestamps to local date keys.
- Chart treats negative change as "positive change" color (weight-loss orientation). If your gym app is gain-focused, adjust styling in `WeightTrendChartMinimal.tsx`.
