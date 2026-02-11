import { computeTrendSeries } from '@/utils/trendWeight';
import { WeightTrendEntry, WeightUnit } from '@/types/weightTrend';

const LBS_PER_KG = 2.20462;

export interface WeightAdapterConfig<T> {
  getId: (item: T, index: number) => string;
  getDate: (item: T) => string | number | Date;
  getWeight: (item: T) => number;
  getWeightUnit: WeightUnit | ((item: T) => WeightUnit);
  getTrendWeight?: (item: T) => number | null | undefined;
  getTrendUnit?: WeightUnit | ((item: T) => WeightUnit);
  dedupeByDate?: 'none' | 'first' | 'last';
  computeTrendIfMissing?: boolean;
}

function toKg(value: number, unit: WeightUnit): number {
  return unit === 'lbs' ? value / LBS_PER_KG : value;
}

function asDate(input: string | number | Date): Date {
  if (input instanceof Date) return input;
  if (typeof input === 'number') return new Date(input);
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return new Date(input + 'T12:00:00');
  return new Date(input);
}

function toDateKeyLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function resolveUnit<T>(unit: WeightUnit | ((item: T) => WeightUnit), item: T): WeightUnit {
  return typeof unit === 'function' ? unit(item) : unit;
}

function dedupeEntries(entries: WeightTrendEntry[], strategy: 'none' | 'first' | 'last'): WeightTrendEntry[] {
  if (strategy === 'none') return entries;

  const map = new Map<string, WeightTrendEntry>();
  if (strategy === 'first') {
    for (const entry of entries) {
      if (!map.has(entry.date)) map.set(entry.date, entry);
    }
  } else {
    for (const entry of entries) {
      map.set(entry.date, entry);
    }
  }

  return Array.from(map.values());
}

export function adaptWeightEntries<T>(
  items: T[],
  config: WeightAdapterConfig<T>
): WeightTrendEntry[] {
  const normalized = items.map((item, index) => {
    const dateKey = toDateKeyLocal(asDate(config.getDate(item)));
    const weightKg = toKg(config.getWeight(item), resolveUnit(config.getWeightUnit, item));

    let trendWeightKg: number | undefined;
    if (config.getTrendWeight) {
      const rawTrend = config.getTrendWeight(item);
      if (rawTrend != null) {
        const trendUnit = config.getTrendUnit
          ? resolveUnit(config.getTrendUnit, item)
          : resolveUnit(config.getWeightUnit, item);
        trendWeightKg = toKg(rawTrend, trendUnit);
      }
    }

    return {
      id: config.getId(item, index),
      date: dateKey,
      weightKg,
      trendWeightKg,
    };
  });

  const dedupe = config.dedupeByDate ?? 'last';
  const deduped = dedupeEntries(normalized, dedupe).sort((a, b) => a.date.localeCompare(b.date));

  if (!config.computeTrendIfMissing) return deduped;

  const needsTrend = deduped.some((entry) => entry.trendWeightKg == null);
  if (!needsTrend) return deduped;

  const computed = computeTrendSeries(deduped.map((d) => ({ date: d.date, weightKg: d.weightKg })));
  const trendByDate = new Map(computed.map((c) => [c.date, c.trendWeightKg]));

  return deduped.map((entry) => ({
    ...entry,
    trendWeightKg: entry.trendWeightKg ?? trendByDate.get(entry.date),
  }));
}

/**
 * Example mapper for a common gym data shape:
 * {
 *   id: string,
 *   measuredAt: string | number | Date,
 *   bodyWeight: number,
 *   unit: 'kg' | 'lbs'
 * }
 */
export function adaptFromGymCheckIns<
  T extends {
    id: string;
    measuredAt: string | number | Date;
    bodyWeight: number;
    unit: WeightUnit;
    trendWeight?: number | null;
  }
>(items: T[]): WeightTrendEntry[] {
  return adaptWeightEntries(items, {
    getId: (item) => item.id,
    getDate: (item) => item.measuredAt,
    getWeight: (item) => item.bodyWeight,
    getWeightUnit: (item) => item.unit,
    getTrendWeight: (item) => item.trendWeight,
    dedupeByDate: 'last',
    computeTrendIfMissing: true,
  });
}
