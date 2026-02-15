import { computeDataAvailability } from '@/services/context/dataAvailability';
import type { RawNutritionData } from '@/services/context/nutritionContextQueries';

function makeRawData(overrides: Partial<RawNutritionData> = {}): RawNutritionData {
  return {
    dailyLogs: [],
    weeklyAverages: [],
    macroTargets: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
    frequentFoods: [],
    mealPatterns: [],
    weightTrend: [],
    goal: null,
    profile: null,
    weightUnit: 'lbs',
    ...overrides,
  };
}

function makeDailyLog(date: string) {
  return { date, calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 };
}

function makeWeeklyAverage(weekStart: string, daysLogged: number) {
  return { weekStart, avgCalories: 2000, avgProtein: 150, avgCarbs: 200, avgFat: 65, avgFiber: 25, daysLogged };
}

describe('computeDataAvailability', () => {
  describe('tier classification', () => {
    it('returns tier "none" when no daily logs exist', () => {
      const result = computeDataAvailability(makeRawData());
      expect(result.tier).toBe('none');
      expect(result.daysLogged).toBe(0);
    });

    it('returns tier "minimal" with 1-2 days logged', () => {
      const result = computeDataAvailability(
        makeRawData({ dailyLogs: [makeDailyLog('2025-01-15')] }),
      );
      expect(result.tier).toBe('minimal');
      expect(result.daysLogged).toBe(1);
    });

    it('returns tier "minimal" with 2 days logged', () => {
      const result = computeDataAvailability(
        makeRawData({
          dailyLogs: [makeDailyLog('2025-01-14'), makeDailyLog('2025-01-15')],
        }),
      );
      expect(result.tier).toBe('minimal');
      expect(result.daysLogged).toBe(2);
    });

    it('returns tier "moderate" with 3-6 days logged and fewer than 2 weeks', () => {
      const result = computeDataAvailability(
        makeRawData({
          dailyLogs: [
            makeDailyLog('2025-01-13'),
            makeDailyLog('2025-01-14'),
            makeDailyLog('2025-01-15'),
          ],
          weeklyAverages: [makeWeeklyAverage('2025-01-13', 3)],
        }),
      );
      expect(result.tier).toBe('moderate');
      expect(result.daysLogged).toBe(3);
    });

    it('returns tier "moderate" with 7+ days but fewer than 2 full weeks', () => {
      const logs = Array.from({ length: 7 }, (_, i) =>
        makeDailyLog(`2025-01-${String(15 - i).padStart(2, '0')}`),
      );
      const result = computeDataAvailability(
        makeRawData({
          dailyLogs: logs,
          weeklyAverages: [makeWeeklyAverage('2025-01-09', 4)],
        }),
      );
      expect(result.tier).toBe('moderate');
    });

    it('returns tier "high" with 7+ days and 2+ full weeks', () => {
      const logs = Array.from({ length: 14 }, (_, i) =>
        makeDailyLog(`2025-01-${String(15 - i).padStart(2, '0')}`),
      );
      const result = computeDataAvailability(
        makeRawData({
          dailyLogs: logs,
          weeklyAverages: [
            makeWeeklyAverage('2025-01-02', 5),
            makeWeeklyAverage('2025-01-09', 6),
          ],
        }),
      );
      expect(result.tier).toBe('high');
    });
  });

  describe('computed fields', () => {
    it('counts weeksWithData only for weeks with 3+ days logged', () => {
      const result = computeDataAvailability(
        makeRawData({
          dailyLogs: Array.from({ length: 14 }, (_, i) =>
            makeDailyLog(`2025-01-${String(15 - i).padStart(2, '0')}`),
          ),
          weeklyAverages: [
            makeWeeklyAverage('2025-01-02', 2),
            makeWeeklyAverage('2025-01-09', 5),
          ],
        }),
      );
      expect(result.weeksWithData).toBe(1);
    });

    it('sets hasWeightData true when 3+ weight entries exist', () => {
      const result = computeDataAvailability(
        makeRawData({
          weightTrend: [
            { date: '2025-01-13', weightKg: 80 },
            { date: '2025-01-14', weightKg: 79.8 },
            { date: '2025-01-15', weightKg: 79.5 },
          ],
        }),
      );
      expect(result.hasWeightData).toBe(true);
    });

    it('sets hasWeightData false with fewer than 3 weight entries', () => {
      const result = computeDataAvailability(
        makeRawData({
          weightTrend: [{ date: '2025-01-15', weightKg: 80 }],
        }),
      );
      expect(result.hasWeightData).toBe(false);
    });

    it('sets hasMealTimingData true when meal patterns exist', () => {
      const result = computeDataAvailability(
        makeRawData({
          mealPatterns: [{ mealType: 'breakfast', avgCalories: 500, frequency: 5 }],
        }),
      );
      expect(result.hasMealTimingData).toBe(true);
    });

    it('sets hasMealTimingData false when no meal patterns exist', () => {
      const result = computeDataAvailability(makeRawData());
      expect(result.hasMealTimingData).toBe(false);
    });
  });

  describe('prompt guidance', () => {
    it('contains DATA AVAILABILITY: NONE for no-data tier', () => {
      const result = computeDataAvailability(makeRawData());
      expect(result.promptGuidance).toContain('DATA AVAILABILITY: NONE');
      expect(result.promptGuidance).toContain('has not logged any nutrition data');
    });

    it('contains DATA AVAILABILITY: MINIMAL for minimal tier', () => {
      const result = computeDataAvailability(
        makeRawData({ dailyLogs: [makeDailyLog('2025-01-15')] }),
      );
      expect(result.promptGuidance).toContain('DATA AVAILABILITY: MINIMAL');
      expect(result.promptGuidance).toContain('1 days logged');
    });

    it('contains DATA AVAILABILITY: MODERATE for moderate tier', () => {
      const result = computeDataAvailability(
        makeRawData({
          dailyLogs: [
            makeDailyLog('2025-01-13'),
            makeDailyLog('2025-01-14'),
            makeDailyLog('2025-01-15'),
          ],
        }),
      );
      expect(result.promptGuidance).toContain('DATA AVAILABILITY: MODERATE');
    });

    it('contains DATA AVAILABILITY: HIGH for high tier', () => {
      const logs = Array.from({ length: 14 }, (_, i) =>
        makeDailyLog(`2025-01-${String(15 - i).padStart(2, '0')}`),
      );
      const result = computeDataAvailability(
        makeRawData({
          dailyLogs: logs,
          weeklyAverages: [
            makeWeeklyAverage('2025-01-02', 5),
            makeWeeklyAverage('2025-01-09', 6),
          ],
        }),
      );
      expect(result.promptGuidance).toContain('DATA AVAILABILITY: HIGH');
    });

    it('mentions weight data availability in high-tier guidance when present', () => {
      const logs = Array.from({ length: 14 }, (_, i) =>
        makeDailyLog(`2025-01-${String(15 - i).padStart(2, '0')}`),
      );
      const result = computeDataAvailability(
        makeRawData({
          dailyLogs: logs,
          weeklyAverages: [
            makeWeeklyAverage('2025-01-02', 5),
            makeWeeklyAverage('2025-01-09', 6),
          ],
          weightTrend: [
            { date: '2025-01-13', weightKg: 80 },
            { date: '2025-01-14', weightKg: 79.8 },
            { date: '2025-01-15', weightKg: 79.5 },
          ],
        }),
      );
      expect(result.promptGuidance).toContain('weight data available');
    });
  });
});
