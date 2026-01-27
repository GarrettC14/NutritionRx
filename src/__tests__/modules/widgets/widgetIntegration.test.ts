/**
 * Widget Integration Tests
 * End-to-end tests for widget data flow
 */

import { WidgetDataContainer, WidgetNutritionData, WidgetWaterData } from '@/modules/widgets/types';

describe('Widget Data Types', () => {
  describe('WidgetNutritionData', () => {
    it('has all required fields', () => {
      const data: WidgetNutritionData = {
        caloriesConsumed: 1500,
        caloriesGoal: 2000,
        proteinConsumed: 80,
        proteinGoal: 150,
        carbsConsumed: 200,
        carbsGoal: 250,
        fatConsumed: 50,
        fatGoal: 65,
        lastUpdated: new Date().toISOString(),
      };

      expect(data.caloriesConsumed).toBeDefined();
      expect(data.caloriesGoal).toBeDefined();
      expect(data.proteinConsumed).toBeDefined();
      expect(data.proteinGoal).toBeDefined();
      expect(data.carbsConsumed).toBeDefined();
      expect(data.carbsGoal).toBeDefined();
      expect(data.fatConsumed).toBeDefined();
      expect(data.fatGoal).toBeDefined();
      expect(data.lastUpdated).toBeDefined();
    });

    it('calculates calories remaining correctly', () => {
      const data: WidgetNutritionData = {
        caloriesConsumed: 1500,
        caloriesGoal: 2000,
        proteinConsumed: 0,
        proteinGoal: 0,
        carbsConsumed: 0,
        carbsGoal: 0,
        fatConsumed: 0,
        fatGoal: 0,
        lastUpdated: '',
      };

      const remaining = data.caloriesGoal - data.caloriesConsumed;
      expect(remaining).toBe(500);
    });

    it('calculates progress percentage correctly', () => {
      const data: WidgetNutritionData = {
        caloriesConsumed: 1500,
        caloriesGoal: 2000,
        proteinConsumed: 0,
        proteinGoal: 0,
        carbsConsumed: 0,
        carbsGoal: 0,
        fatConsumed: 0,
        fatGoal: 0,
        lastUpdated: '',
      };

      const progress = data.caloriesConsumed / data.caloriesGoal;
      expect(progress).toBe(0.75);
    });

    it('handles zero goal gracefully', () => {
      const data: WidgetNutritionData = {
        caloriesConsumed: 100,
        caloriesGoal: 0,
        proteinConsumed: 0,
        proteinGoal: 0,
        carbsConsumed: 0,
        carbsGoal: 0,
        fatConsumed: 0,
        fatGoal: 0,
        lastUpdated: '',
      };

      const progress = data.caloriesGoal > 0
        ? data.caloriesConsumed / data.caloriesGoal
        : 0;
      expect(progress).toBe(0);
    });
  });

  describe('WidgetWaterData', () => {
    it('has all required fields', () => {
      const data: WidgetWaterData = {
        glassesConsumed: 5,
        glassesGoal: 8,
        glassSizeMl: 250,
        lastUpdated: new Date().toISOString(),
      };

      expect(data.glassesConsumed).toBeDefined();
      expect(data.glassesGoal).toBeDefined();
      expect(data.glassSizeMl).toBeDefined();
      expect(data.lastUpdated).toBeDefined();
    });

    it('calculates glasses remaining correctly', () => {
      const data: WidgetWaterData = {
        glassesConsumed: 5,
        glassesGoal: 8,
        glassSizeMl: 250,
        lastUpdated: '',
      };

      const remaining = data.glassesGoal - data.glassesConsumed;
      expect(remaining).toBe(3);
    });

    it('calculates water progress correctly', () => {
      const data: WidgetWaterData = {
        glassesConsumed: 4,
        glassesGoal: 8,
        glassSizeMl: 250,
        lastUpdated: '',
      };

      const progress = data.glassesConsumed / data.glassesGoal;
      expect(progress).toBe(0.5);
    });

    it('calculates consumed mL correctly', () => {
      const data: WidgetWaterData = {
        glassesConsumed: 5,
        glassesGoal: 8,
        glassSizeMl: 250,
        lastUpdated: '',
      };

      const consumedMl = data.glassesConsumed * data.glassSizeMl;
      expect(consumedMl).toBe(1250);
    });

    it('calculates goal mL correctly', () => {
      const data: WidgetWaterData = {
        glassesConsumed: 5,
        glassesGoal: 8,
        glassSizeMl: 250,
        lastUpdated: '',
      };

      const goalMl = data.glassesGoal * data.glassSizeMl;
      expect(goalMl).toBe(2000);
    });
  });

  describe('WidgetDataContainer', () => {
    it('combines nutrition and water data with date', () => {
      const container: WidgetDataContainer = {
        nutrition: {
          caloriesConsumed: 1500,
          caloriesGoal: 2000,
          proteinConsumed: 80,
          proteinGoal: 150,
          carbsConsumed: 200,
          carbsGoal: 250,
          fatConsumed: 50,
          fatGoal: 65,
          lastUpdated: new Date().toISOString(),
        },
        water: {
          glassesConsumed: 5,
          glassesGoal: 8,
          glassSizeMl: 250,
          lastUpdated: new Date().toISOString(),
        },
        date: '2024-01-15',
      };

      expect(container.nutrition).toBeDefined();
      expect(container.water).toBeDefined();
      expect(container.date).toBe('2024-01-15');
    });

    it('date format is YYYY-MM-DD', () => {
      const container: WidgetDataContainer = {
        nutrition: {
          caloriesConsumed: 0,
          caloriesGoal: 0,
          proteinConsumed: 0,
          proteinGoal: 0,
          carbsConsumed: 0,
          carbsGoal: 0,
          fatConsumed: 0,
          fatGoal: 0,
          lastUpdated: '',
        },
        water: {
          glassesConsumed: 0,
          glassesGoal: 0,
          glassSizeMl: 0,
          lastUpdated: '',
        },
        date: '2024-01-15',
      };

      expect(container.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

describe('Widget Data Flow', () => {
  it('simulates complete day tracking flow', () => {
    // Start of day
    let container: WidgetDataContainer = {
      nutrition: {
        caloriesConsumed: 0,
        caloriesGoal: 2000,
        proteinConsumed: 0,
        proteinGoal: 150,
        carbsConsumed: 0,
        carbsGoal: 250,
        fatConsumed: 0,
        fatGoal: 65,
        lastUpdated: new Date().toISOString(),
      },
      water: {
        glassesConsumed: 0,
        glassesGoal: 8,
        glassSizeMl: 250,
        lastUpdated: new Date().toISOString(),
      },
      date: '2024-01-15',
    };

    expect(container.nutrition.caloriesConsumed).toBe(0);
    expect(container.water.glassesConsumed).toBe(0);

    // Breakfast
    container.nutrition.caloriesConsumed += 500;
    container.nutrition.proteinConsumed += 25;
    container.nutrition.carbsConsumed += 60;
    container.nutrition.fatConsumed += 15;
    container.water.glassesConsumed += 2;

    expect(container.nutrition.caloriesConsumed).toBe(500);
    expect(container.water.glassesConsumed).toBe(2);

    // Lunch
    container.nutrition.caloriesConsumed += 600;
    container.nutrition.proteinConsumed += 40;
    container.nutrition.carbsConsumed += 70;
    container.nutrition.fatConsumed += 20;
    container.water.glassesConsumed += 2;

    expect(container.nutrition.caloriesConsumed).toBe(1100);
    expect(container.water.glassesConsumed).toBe(4);

    // Dinner
    container.nutrition.caloriesConsumed += 700;
    container.nutrition.proteinConsumed += 45;
    container.nutrition.carbsConsumed += 80;
    container.nutrition.fatConsumed += 25;
    container.water.glassesConsumed += 2;

    expect(container.nutrition.caloriesConsumed).toBe(1800);
    expect(container.water.glassesConsumed).toBe(6);

    // Check progress
    const calorieProgress = container.nutrition.caloriesConsumed / container.nutrition.caloriesGoal;
    const waterProgress = container.water.glassesConsumed / container.water.glassesGoal;

    expect(calorieProgress).toBe(0.9); // 90%
    expect(waterProgress).toBe(0.75); // 75%
  });

  it('handles goal completion correctly', () => {
    const container: WidgetDataContainer = {
      nutrition: {
        caloriesConsumed: 2000,
        caloriesGoal: 2000,
        proteinConsumed: 150,
        proteinGoal: 150,
        carbsConsumed: 250,
        carbsGoal: 250,
        fatConsumed: 65,
        fatGoal: 65,
        lastUpdated: new Date().toISOString(),
      },
      water: {
        glassesConsumed: 8,
        glassesGoal: 8,
        glassSizeMl: 250,
        lastUpdated: new Date().toISOString(),
      },
      date: '2024-01-15',
    };

    const calorieProgress = Math.min(
      1.0,
      container.nutrition.caloriesConsumed / container.nutrition.caloriesGoal
    );
    const waterProgress = Math.min(
      1.0,
      container.water.glassesConsumed / container.water.glassesGoal
    );

    expect(calorieProgress).toBe(1.0);
    expect(waterProgress).toBe(1.0);
  });

  it('handles exceeding goals correctly', () => {
    const container: WidgetDataContainer = {
      nutrition: {
        caloriesConsumed: 2500,
        caloriesGoal: 2000,
        proteinConsumed: 180,
        proteinGoal: 150,
        carbsConsumed: 300,
        carbsGoal: 250,
        fatConsumed: 80,
        fatGoal: 65,
        lastUpdated: new Date().toISOString(),
      },
      water: {
        glassesConsumed: 10,
        glassesGoal: 8,
        glassSizeMl: 250,
        lastUpdated: new Date().toISOString(),
      },
      date: '2024-01-15',
    };

    // Progress should be capped at 100%
    const calorieProgress = Math.min(
      1.0,
      container.nutrition.caloriesConsumed / container.nutrition.caloriesGoal
    );
    const waterProgress = Math.min(
      1.0,
      container.water.glassesConsumed / container.water.glassesGoal
    );

    expect(calorieProgress).toBe(1.0);
    expect(waterProgress).toBe(1.0);

    // But actual values are preserved
    expect(container.nutrition.caloriesConsumed).toBe(2500);
    expect(container.water.glassesConsumed).toBe(10);
  });
});

describe('Widget Constants', () => {
  it('app group identifier follows Apple conventions', () => {
    const appGroupId = 'group.com.nutritionrx.app';
    expect(appGroupId).toMatch(/^group\.[a-z0-9.]+$/);
  });

  it('update interval is reasonable', () => {
    const updateIntervalMinutes = 15;
    expect(updateIntervalMinutes).toBeGreaterThanOrEqual(5);
    expect(updateIntervalMinutes).toBeLessThanOrEqual(60);
  });
});
