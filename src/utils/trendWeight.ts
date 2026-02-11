/**
 * Canonical EWMA trend weight module.
 *
 * Single source of truth for all trend weight calculations.
 * Uses a half-life formulation: after HALF_LIFE_DAYS days,
 * old data has exactly half the influence.
 *
 * Pure math — zero database/repository imports.
 */

export const HALF_LIFE_DAYS = 7;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Computes the effective smoothing alpha for a given day gap.
 *
 * effectiveAlpha = 1 - 2^(-dayGap / HALF_LIFE_DAYS)
 *
 * Properties:
 *   dayGap = 0  → alpha = 0       (same-day, no change)
 *   dayGap = 7  → alpha = 0.5     (half-life definition)
 *   dayGap = 14 → alpha = 0.75    (two half-lives)
 */
export function computeEffectiveAlpha(dayGap: number): number {
  return 1 - Math.pow(2, -dayGap / HALF_LIFE_DAYS);
}

/**
 * Computes a full EWMA trend series for a sorted-ASC array of entries.
 * Uses HALF_LIFE_DAYS, same formula as DB storage.
 */
export function computeTrendSeries(
  entries: Array<{ date: string; weightKg: number }>,
): Array<{ date: string; weightKg: number; trendWeightKg: number }> {
  if (entries.length === 0) return [];

  const result: Array<{ date: string; weightKg: number; trendWeightKg: number }> = [];

  let prevTrend = entries[0].weightKg;
  let prevDate = new Date(entries[0].date + 'T12:00:00').getTime();
  result.push({ date: entries[0].date, weightKg: entries[0].weightKg, trendWeightKg: prevTrend });

  for (let i = 1; i < entries.length; i++) {
    const currDate = new Date(entries[i].date + 'T12:00:00').getTime();
    const dayGap = Math.max((currDate - prevDate) / MS_PER_DAY, 0.01);
    const effectiveAlpha = computeEffectiveAlpha(dayGap);
    const trend = effectiveAlpha * entries[i].weightKg + (1 - effectiveAlpha) * prevTrend;

    result.push({ date: entries[i].date, weightKg: entries[i].weightKg, trendWeightKg: trend });
    prevTrend = trend;
    prevDate = currDate;
  }

  return result;
}

/**
 * Recomputes EWMA from a given date forward.
 * Seeds from the previous entry's stored trend weight, then recomputes forward.
 * Returns an array of { id, trendWeightKg } for entries that need DB updates.
 */
export function recomputeEWMAFromDate(
  allEntries: Array<{ id: string; date: string; weightKg: number; trendWeightKg?: number }>,
  changedDate: string
): Array<{ id: string; trendWeightKg: number }> {
  if (allEntries.length === 0) return [];

  // Find the index of the first entry at or after changedDate
  let startIdx = allEntries.findIndex((e) => e.date >= changedDate);
  if (startIdx === -1) return [];

  // Seed: use the previous entry's stored trend, or the first entry's raw weight
  let prevTrend: number;
  let prevDate: number;

  if (startIdx > 0) {
    const prev = allEntries[startIdx - 1];
    prevTrend = prev.trendWeightKg ?? prev.weightKg;
    prevDate = new Date(prev.date + 'T12:00:00').getTime();
  } else {
    // First entry — its trend is its raw weight
    prevTrend = allEntries[0].weightKg;
    prevDate = new Date(allEntries[0].date + 'T12:00:00').getTime();

    // Include the first entry in updates
    const updates: Array<{ id: string; trendWeightKg: number }> = [
      { id: allEntries[0].id, trendWeightKg: prevTrend },
    ];

    for (let i = 1; i < allEntries.length; i++) {
      const currDate = new Date(allEntries[i].date + 'T12:00:00').getTime();
      const dayGap = Math.max((currDate - prevDate) / MS_PER_DAY, 0.01);
      const effectiveAlpha = computeEffectiveAlpha(dayGap);
      const trend = effectiveAlpha * allEntries[i].weightKg + (1 - effectiveAlpha) * prevTrend;

      updates.push({ id: allEntries[i].id, trendWeightKg: trend });
      prevTrend = trend;
      prevDate = currDate;
    }

    return updates;
  }

  // Recompute from startIdx forward
  const updates: Array<{ id: string; trendWeightKg: number }> = [];

  for (let i = startIdx; i < allEntries.length; i++) {
    const currDate = new Date(allEntries[i].date + 'T12:00:00').getTime();
    const dayGap = Math.max((currDate - prevDate) / MS_PER_DAY, 0.01);
    const effectiveAlpha = computeEffectiveAlpha(dayGap);
    const trend = effectiveAlpha * allEntries[i].weightKg + (1 - effectiveAlpha) * prevTrend;

    updates.push({ id: allEntries[i].id, trendWeightKg: trend });
    prevTrend = trend;
    prevDate = currDate;
  }

  return updates;
}
