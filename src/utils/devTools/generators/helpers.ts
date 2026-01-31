import { SQLiteDatabase } from 'expo-sqlite';

// ============================================================
// ID Generation
// ============================================================

export function generateId(prefix: string = 'dev'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================
// Date/Time Utilities
// ============================================================

export function daysAgo(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().split('T')[0];
}

export function datetimeAgo(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString();
}

export function randomTimeOfDay(date: string, hourMin = 6, hourMax = 22): string {
  const hour = randomInt(hourMin, hourMax);
  const minute = randomInt(0, 59);
  const second = randomInt(0, 59);
  return `${date}T${pad(hour)}:${pad(minute)}:${pad(second)}.000Z`;
}

export function mealTimeOfDay(date: string, mealType: string): string {
  const ranges: Record<string, [number, number]> = {
    breakfast: [6, 9],
    lunch: [11, 13],
    dinner: [17, 20],
    snack: [14, 16],
  };
  const [min, max] = ranges[mealType] ?? [8, 20];
  return randomTimeOfDay(date, min, max);
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function datesBetween(startDaysAgo: number, endDaysAgo: number = 0): string[] {
  const dates: string[] = [];
  for (let i = startDaysAgo; i >= endDaysAgo; i--) {
    dates.push(daysAgo(i));
  }
  return dates;
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function nowISO(): string {
  return new Date().toISOString();
}

// ============================================================
// Random Selection & Distribution
// ============================================================

export function weightedPick<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function randomPick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

export function shouldSkip(skipProbability: number): boolean {
  return Math.random() < skipProbability;
}

export function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================================
// Batch Insert
// ============================================================

export async function batchInsert(
  db: SQLiteDatabase,
  table: string,
  columns: string[],
  rows: unknown[][],
  batchSize: number = 200
): Promise<number> {
  if (rows.length === 0) return 0;

  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const placeholders = batch
      .map(() => `(${columns.map(() => '?').join(', ')})`)
      .join(', ');
    const values = batch.flat();

    await db.runAsync(
      `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`,
      values as any[]
    );
    inserted += batch.length;
  }
  return inserted;
}

// ============================================================
// Weight/Nutrition Helpers
// ============================================================

export function gaussianRandom(mean: number, stdDev: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function round(value: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
