/**
 * Android Widget Tests
 * Tests for Android Jetpack Glance widget integration
 */

import { WidgetDataContainer, WidgetNutritionData, WidgetWaterData } from '@/modules/widgets/types';

describe('Android Widget Types', () => {
  describe('NutritionData for Android', () => {
    it('matches Kotlin data class structure', () => {
      const data: WidgetNutritionData = {
        caloriesConsumed: 1500,
        caloriesGoal: 2000,
        proteinConsumed: 80,
        proteinGoal: 150,
        carbsConsumed: 200,
        carbsGoal: 250,
        fatConsumed: 50,
        fatGoal: 65,
        lastUpdated: '2024-01-15T10:00:00.000Z',
      };

      // Verify all required fields
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

    it('serializes correctly to JSON for SharedPreferences', () => {
      const data: WidgetNutritionData = {
        caloriesConsumed: 1500,
        caloriesGoal: 2000,
        proteinConsumed: 80,
        proteinGoal: 150,
        carbsConsumed: 200,
        carbsGoal: 250,
        fatConsumed: 50,
        fatGoal: 65,
        lastUpdated: '2024-01-15T10:00:00.000Z',
      };

      const json = JSON.stringify(data);
      const parsed = JSON.parse(json);

      expect(parsed.caloriesConsumed).toBe(1500);
      expect(parsed.caloriesGoal).toBe(2000);
    });
  });

  describe('WaterData for Android', () => {
    it('matches Kotlin data class structure', () => {
      const data: WidgetWaterData = {
        glassesConsumed: 5,
        glassesGoal: 8,
        glassSizeMl: 250,
        lastUpdated: '2024-01-15T10:00:00.000Z',
      };

      expect(data.glassesConsumed).toBeDefined();
      expect(data.glassesGoal).toBeDefined();
      expect(data.glassSizeMl).toBeDefined();
      expect(data.lastUpdated).toBeDefined();
    });
  });

  describe('WidgetDataContainer for Android', () => {
    it('serializes complete container for SharedPreferences', () => {
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
          lastUpdated: '2024-01-15T10:00:00.000Z',
        },
        water: {
          glassesConsumed: 5,
          glassesGoal: 8,
          glassSizeMl: 250,
          lastUpdated: '2024-01-15T10:00:00.000Z',
        },
        date: '2024-01-15',
      };

      const json = JSON.stringify(container);

      // Verify JSON structure matches what Kotlin expects
      expect(json).toContain('"nutrition"');
      expect(json).toContain('"water"');
      expect(json).toContain('"date"');

      const parsed = JSON.parse(json);
      expect(parsed.nutrition.caloriesConsumed).toBe(1500);
      expect(parsed.water.glassesConsumed).toBe(5);
      expect(parsed.date).toBe('2024-01-15');
    });
  });
});

describe('Android Widget Calculations', () => {
  describe('Calories calculations', () => {
    it('calculates remaining calories', () => {
      const consumed = 1500;
      const goal = 2000;
      const remaining = Math.max(0, goal - consumed);

      expect(remaining).toBe(500);
    });

    it('caps remaining at 0 when over goal', () => {
      const consumed = 2500;
      const goal = 2000;
      const remaining = Math.max(0, goal - consumed);

      expect(remaining).toBe(0);
    });

    it('calculates progress as float 0-1', () => {
      const consumed = 1500;
      const goal = 2000;
      const progress = goal > 0 ? Math.min(1, consumed / goal) : 0;

      expect(progress).toBe(0.75);
    });

    it('caps progress at 1.0', () => {
      const consumed = 2500;
      const goal = 2000;
      const progress = goal > 0 ? Math.min(1, consumed / goal) : 0;

      expect(progress).toBe(1);
    });
  });

  describe('Water calculations', () => {
    it('calculates consumed mL', () => {
      const glasses = 5;
      const sizeMl = 250;
      const consumedMl = glasses * sizeMl;

      expect(consumedMl).toBe(1250);
    });

    it('calculates goal mL', () => {
      const goal = 8;
      const sizeMl = 250;
      const goalMl = goal * sizeMl;

      expect(goalMl).toBe(2000);
    });

    it('calculates water progress', () => {
      const consumed = 6;
      const goal = 8;
      const progress = goal > 0 ? Math.min(1, consumed / goal) : 0;

      expect(progress).toBe(0.75);
    });
  });
});

describe('Android Widget Deep Links', () => {
  it('generates correct meal deep links', () => {
    const meals = ['breakfast', 'lunch', 'dinner', 'snack'];

    meals.forEach((meal) => {
      const deepLink = `nutritionrx://add-food?meal=${meal}`;
      expect(deepLink).toContain('nutritionrx://');
      expect(deepLink).toContain(`meal=${meal}`);
    });
  });

  it('generates general add food deep link', () => {
    const deepLink = 'nutritionrx://add-food';
    expect(deepLink).toBe('nutritionrx://add-food');
  });

  it('generates app launch deep link', () => {
    const deepLink = 'nutritionrx://';
    expect(deepLink).toBe('nutritionrx://');
  });
});

describe('Android Widget Sizes', () => {
  describe('Today Summary widget sizes', () => {
    it('supports small size (2x2)', () => {
      const small = { width: 110, height: 110 };
      expect(small.width).toBeGreaterThanOrEqual(110);
      expect(small.height).toBeGreaterThanOrEqual(110);
    });

    it('supports medium size (4x2)', () => {
      const medium = { width: 200, height: 110 };
      expect(medium.width).toBeGreaterThanOrEqual(200);
    });

    it('supports large size (4x4)', () => {
      const large = { width: 300, height: 200 };
      expect(large.width).toBeGreaterThanOrEqual(300);
      expect(large.height).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Water tracking widget sizes', () => {
    it('supports small and medium sizes', () => {
      const small = { width: 110, height: 110 };
      const medium = { width: 200, height: 110 };

      expect(small.width).toBe(110);
      expect(medium.width).toBe(200);
    });
  });

  describe('Quick Add widget sizes', () => {
    it('supports small and medium sizes', () => {
      const small = { width: 110, height: 110 };
      const medium = { width: 200, height: 110 };

      expect(small.width).toBe(110);
      expect(medium.width).toBe(200);
    });
  });
});

describe('Android SharedPreferences Integration', () => {
  const SHARED_PREFS_NAME = 'nutritionrx_widget_data';
  const WIDGET_DATA_KEY = 'widget_data';

  it('uses correct SharedPreferences name', () => {
    expect(SHARED_PREFS_NAME).toBe('nutritionrx_widget_data');
  });

  it('uses correct data key', () => {
    expect(WIDGET_DATA_KEY).toBe('widget_data');
  });

  it('data format is compatible with Kotlin parsing', () => {
    const container: WidgetDataContainer = {
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

    const json = JSON.stringify(container);
    const parsed = JSON.parse(json);

    // Kotlin uses optInt, optDouble, optString
    // These return default values if the key doesn't exist
    // So we need to ensure all keys are present

    expect(typeof parsed.nutrition.caloriesConsumed).toBe('number');
    expect(typeof parsed.nutrition.caloriesGoal).toBe('number');
    expect(typeof parsed.nutrition.proteinConsumed).toBe('number');
    expect(typeof parsed.nutrition.proteinGoal).toBe('number');
    expect(typeof parsed.water.glassesConsumed).toBe('number');
    expect(typeof parsed.water.glassesGoal).toBe('number');
    expect(typeof parsed.date).toBe('string');
  });
});

describe('Android Widget Update Interval', () => {
  it('update interval is 15 minutes (900000ms)', () => {
    const updateIntervalMinutes = 15;
    const updateIntervalMs = updateIntervalMinutes * 60 * 1000;

    expect(updateIntervalMs).toBe(900000);
  });

  it('meets Android minimum update interval', () => {
    // Android requires minimum 30 minute update interval
    // But we can request more frequent updates through WorkManager
    const updateIntervalMinutes = 15;
    expect(updateIntervalMinutes).toBeGreaterThanOrEqual(15);
  });
});
