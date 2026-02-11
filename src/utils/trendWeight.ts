import { weightRepository } from '@/repositories';

const BASE_ALPHA_PER_DAY = 0.2;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const EWMA_ALPHA_PER_DAY = 0.1;

/**
 * Calculates a time-weighted exponential moving average of recent weight entries.
 *
 * Unlike a standard EMA that assumes uniform intervals, this adjusts the
 * smoothing factor based on the actual time gap between entries:
 *   effective_alpha = 1 - (1 - 0.2)^dayGap
 *
 * This means:
 *   1-day gap  → alpha ≈ 0.20 (standard smoothing)
 *   2-day gap  → alpha ≈ 0.36 (more weight to new reading)
 *   7-day gap  → alpha ≈ 0.79 (nearly resets)
 *   14-day gap → alpha ≈ 0.96 (essentially starts fresh)
 */
export async function calculateTrendWeight(): Promise<number | null> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 14 * MS_PER_DAY).toISOString().split('T')[0];

  const entries = await weightRepository.findByDateRange(startDate, endDate);

  if (entries.length === 0) return null;
  if (entries.length === 1) return entries[0].weightKg;

  // entries are already sorted oldest-to-newest from findByDateRange
  let ema = entries[0].weightKg;

  for (let i = 1; i < entries.length; i++) {
    const prevDate = new Date(entries[i - 1].date + 'T12:00:00').getTime();
    const currDate = new Date(entries[i].date + 'T12:00:00').getTime();
    const dayGap = Math.max((currDate - prevDate) / MS_PER_DAY, 0.01);
    const effectiveAlpha = 1 - Math.pow(1 - BASE_ALPHA_PER_DAY, dayGap);
    ema = effectiveAlpha * entries[i].weightKg + (1 - effectiveAlpha) * ema;
  }

  return Math.round(ema * 10) / 10;
}

/**
 * Computes a full EWMA chain for a sorted-ASC array of entries.
 * Uses α = 0.1/day with time-gap adjustment.
 * Returns a Map of entry id → trend weight value.
 */
export function computeEWMAChain(
  entries: Array<{ id: string; date: string; weightKg: number }>
): Map<string, number> {
  const result = new Map<string, number>();

  if (entries.length === 0) return result;

  let prevTrend = entries[0].weightKg;
  let prevDate = new Date(entries[0].date + 'T12:00:00').getTime();
  result.set(entries[0].id, prevTrend);

  for (let i = 1; i < entries.length; i++) {
    const currDate = new Date(entries[i].date + 'T12:00:00').getTime();
    const dayGap = Math.max((currDate - prevDate) / MS_PER_DAY, 0.01);
    const effectiveAlpha = 1 - Math.pow(1 - EWMA_ALPHA_PER_DAY, dayGap);
    const trend = effectiveAlpha * entries[i].weightKg + (1 - effectiveAlpha) * prevTrend;

    result.set(entries[i].id, trend);
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
      const effectiveAlpha = 1 - Math.pow(1 - EWMA_ALPHA_PER_DAY, dayGap);
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
    const effectiveAlpha = 1 - Math.pow(1 - EWMA_ALPHA_PER_DAY, dayGap);
    const trend = effectiveAlpha * allEntries[i].weightKg + (1 - effectiveAlpha) * prevTrend;

    updates.push({ id: allEntries[i].id, trendWeightKg: trend });
    prevTrend = trend;
    prevDate = currDate;
  }

  return updates;
}
