import { DayBudget } from '@/types/planning';

const ABSOLUTE_MIN_CALORIES = 800;
const SOFT_WARNING_CALORIES = 1200;

/**
 * Proportional redistribution with iterative clamping.
 * Preserves weekly total as invariant.
 * Returns null if adjustment is impossible.
 */
export function redistributeCalories(
  days: DayBudget[],
  changedIndex: number,
  newCalories: number,
  proteinFloor: number
): DayBudget[] | null {
  const weeklyTotal = days.reduce((sum, d) => sum + d.calories, 0);
  const delta = newCalories - days[changedIndex].calories;
  if (delta === 0) return days.map((d) => ({ ...d }));

  const result = days.map((d) => ({ ...d }));
  result[changedIndex].calories = newCalories;

  let remainingDelta = -delta;
  let iterations = 5;

  while (Math.abs(remainingDelta) > 0 && iterations-- > 0) {
    const adjustable = result
      .map((d, i) => ({ ...d, index: i }))
      .filter(
        (d) =>
          d.index !== changedIndex &&
          !d.locked &&
          !d.isPast &&
          (remainingDelta > 0 || d.calories > ABSOLUTE_MIN_CALORIES)
      );

    if (adjustable.length === 0) return null;

    const totalCal = adjustable.reduce((s, d) => s + d.calories, 0);
    let distributed = 0;

    for (let i = 0; i < adjustable.length; i++) {
      const d = adjustable[i];
      const isLast = i === adjustable.length - 1;
      const proportion = d.calories / (totalCal || 1);
      const dayDelta = isLast
        ? remainingDelta - distributed
        : Math.round(remainingDelta * proportion);

      const newCal = Math.max(ABSOLUTE_MIN_CALORIES, d.calories + dayDelta);
      distributed += newCal - d.calories;
      result[d.index].calories = newCal;
    }

    const actual = result.reduce((s, d) => s + d.calories, 0);
    remainingDelta = weeklyTotal - actual;
    if (Math.abs(remainingDelta) <= 1) remainingDelta = 0;
  }

  // Recalculate macros for all changed days
  for (let i = 0; i < result.length; i++) {
    if (result[i].calories !== days[i].calories) {
      const m = recalculateMacros(result[i].calories, days[i], proteinFloor);
      Object.assign(result[i], m);
    }
  }

  return result;
}

/**
 * Macro cascade: protein preserved (>= floor), fat maintains %, carbs absorb remainder.
 */
export function recalculateMacros(
  newCalories: number,
  originalDay: DayBudget,
  proteinFloor: number
): { protein: number; carbs: number; fat: number } {
  const protein = Math.max(originalDay.protein, proteinFloor);
  const proteinCal = protein * 4;
  const origFatPct =
    originalDay.calories > 0
      ? (originalDay.fat * 9) / originalDay.calories
      : 0.3;
  const fatCal = Math.max(
    Math.round(newCalories * origFatPct),
    Math.round(newCalories * 0.15)
  );
  const fat = Math.round(fatCal / 9);
  const carbCal = Math.max(0, newCalories - proteinCal - fatCal);
  const carbs = Math.round(carbCal / 4);
  return { protein, carbs, fat };
}

/**
 * Generate initial 7-day budget from base daily targets.
 */
export function generateInitialBudget(
  baseCalories: number,
  baseProtein: number,
  baseCarbs: number,
  baseFat: number,
  weekStartDate: string,
  _startDayOfWeek: number
): DayBudget[] {
  const today = new Date().toISOString().split('T')[0];
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const start = new Date(weekStartDate + 'T12:00:00');
  const days: DayBudget[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const dow = d.getDay();
    days.push({
      date: iso,
      dayOfWeek: dow,
      dayLabel: labels[dow],
      calories: baseCalories,
      protein: baseProtein,
      carbs: baseCarbs,
      fat: baseFat,
      locked: false,
      isToday: iso === today,
      isPast: iso < today,
    });
  }
  return days;
}

/** Warning text for extreme day values. */
export function getDayWarning(
  calories: number,
  dailyAverage: number
): string | null {
  if (calories <= ABSOLUTE_MIN_CALORIES)
    return 'This is at the minimum (800 cal). Your health comes first.';
  if (calories < SOFT_WARNING_CALORIES)
    return 'Very low-calorie days can leave you feeling drained.';
  if (calories > dailyAverage * 1.5)
    return 'This day is significantly above average. Make sure lighter days still feel sustainable.';
  return null;
}

/** +/- % deviation from daily average. */
export function getDeviationPercent(
  calories: number,
  weeklyTotal: number
): number {
  const avg = weeklyTotal / 7;
  if (avg === 0) return 0;
  return Math.round(((calories - avg) / avg) * 100);
}
