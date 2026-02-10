import { weightRepository } from '@/repositories';

const BASE_ALPHA_PER_DAY = 0.2;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

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
