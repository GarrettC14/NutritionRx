/**
 * Watch Types Tests
 * Tests for Apple Watch type definitions
 */

import {
  WatchDailyData,
  WatchSimpleFood,
  WatchCommand,
  WatchCommandType,
  AddWaterCommand,
  RemoveWaterCommand,
  QuickAddCaloriesCommand,
  LogFoodCommand,
  RequestSyncCommand,
  WatchSessionState,
  WatchActivationState,
  WatchReachabilityEvent,
  WatchSessionStateEvent,
} from '@/types/watch';

describe('Watch Types', () => {
  describe('WatchDailyData', () => {
    it('accepts valid daily data', () => {
      const data: WatchDailyData = {
        date: '2024-01-15',
        caloriesConsumed: 1500,
        calorieTarget: 2000,
        waterGlasses: 5,
        waterTarget: 8,
        protein: 100,
        carbs: 150,
        fat: 50,
        recentFoods: [],
        favoriteFoods: [],
      };

      expect(data.date).toBe('2024-01-15');
      expect(data.caloriesConsumed).toBe(1500);
      expect(data.calorieTarget).toBe(2000);
      expect(data.waterGlasses).toBe(5);
      expect(data.waterTarget).toBe(8);
      expect(data.protein).toBe(100);
      expect(data.carbs).toBe(150);
      expect(data.fat).toBe(50);
      expect(data.recentFoods).toEqual([]);
      expect(data.favoriteFoods).toEqual([]);
    });

    it('accepts daily data with foods', () => {
      const recentFood: WatchSimpleFood = {
        id: '1',
        name: 'Apple',
        calories: 95,
      };

      const favoriteFood: WatchSimpleFood = {
        id: '2',
        name: 'Banana',
        calories: 105,
        protein: 1,
        carbs: 27,
        fat: 0,
      };

      const data: WatchDailyData = {
        date: '2024-01-15',
        caloriesConsumed: 200,
        calorieTarget: 2000,
        waterGlasses: 0,
        waterTarget: 8,
        protein: 1,
        carbs: 27,
        fat: 0,
        recentFoods: [recentFood],
        favoriteFoods: [favoriteFood],
      };

      expect(data.recentFoods).toHaveLength(1);
      expect(data.favoriteFoods).toHaveLength(1);
    });
  });

  describe('WatchSimpleFood', () => {
    it('accepts minimal food data', () => {
      const food: WatchSimpleFood = {
        id: '123',
        name: 'Grilled Chicken',
        calories: 165,
      };

      expect(food.id).toBe('123');
      expect(food.name).toBe('Grilled Chicken');
      expect(food.calories).toBe(165);
      expect(food.protein).toBeUndefined();
      expect(food.carbs).toBeUndefined();
      expect(food.fat).toBeUndefined();
    });

    it('accepts food with full macros', () => {
      const food: WatchSimpleFood = {
        id: '456',
        name: 'Greek Yogurt',
        calories: 150,
        protein: 15,
        carbs: 10,
        fat: 6,
      };

      expect(food.protein).toBe(15);
      expect(food.carbs).toBe(10);
      expect(food.fat).toBe(6);
    });
  });

  describe('WatchCommand types', () => {
    it('accepts addWater command', () => {
      const command: AddWaterCommand = {
        type: 'addWater',
        glasses: 1,
      };

      expect(command.type).toBe('addWater');
      expect(command.glasses).toBe(1);
    });

    it('accepts removeWater command', () => {
      const command: RemoveWaterCommand = {
        type: 'removeWater',
        glasses: 1,
      };

      expect(command.type).toBe('removeWater');
      expect(command.glasses).toBe(1);
    });

    it('accepts quickAddCalories command', () => {
      const command: QuickAddCaloriesCommand = {
        type: 'quickAddCalories',
        calories: 200,
        meal: 'Lunch',
      };

      expect(command.type).toBe('quickAddCalories');
      expect(command.calories).toBe(200);
      expect(command.meal).toBe('Lunch');
    });

    it('accepts logFood command', () => {
      const command: LogFoodCommand = {
        type: 'logFood',
        foodId: 'food-123',
        meal: 'Dinner',
      };

      expect(command.type).toBe('logFood');
      expect(command.foodId).toBe('food-123');
      expect(command.meal).toBe('Dinner');
    });

    it('accepts requestSync command', () => {
      const command: RequestSyncCommand = {
        type: 'requestSync',
      };

      expect(command.type).toBe('requestSync');
    });

    it('WatchCommand union accepts all command types', () => {
      const commands: WatchCommand[] = [
        { type: 'addWater', glasses: 1 },
        { type: 'removeWater', glasses: 1 },
        { type: 'quickAddCalories', calories: 100, meal: 'Snack' },
        { type: 'logFood', foodId: '123', meal: 'Breakfast' },
        { type: 'requestSync' },
      ];

      expect(commands).toHaveLength(5);
      commands.forEach((cmd) => {
        expect(cmd.type).toBeDefined();
      });
    });
  });

  describe('WatchSessionState', () => {
    it('accepts session state data', () => {
      const state: WatchSessionState = {
        isSupported: true,
        isPaired: true,
        isWatchAppInstalled: true,
        isReachable: true,
      };

      expect(state.isSupported).toBe(true);
      expect(state.isPaired).toBe(true);
      expect(state.isWatchAppInstalled).toBe(true);
      expect(state.isReachable).toBe(true);
    });

    it('accepts partial availability state', () => {
      const state: WatchSessionState = {
        isSupported: true,
        isPaired: true,
        isWatchAppInstalled: false,
        isReachable: false,
      };

      expect(state.isWatchAppInstalled).toBe(false);
      expect(state.isReachable).toBe(false);
    });
  });

  describe('WatchActivationState', () => {
    it('accepts all activation states', () => {
      const states: WatchActivationState[] = [
        'notActivated',
        'inactive',
        'activated',
        'unknown',
      ];

      expect(states).toHaveLength(4);
      expect(states).toContain('notActivated');
      expect(states).toContain('inactive');
      expect(states).toContain('activated');
      expect(states).toContain('unknown');
    });
  });

  describe('WatchReachabilityEvent', () => {
    it('accepts reachability event', () => {
      const event: WatchReachabilityEvent = {
        isReachable: true,
      };

      expect(event.isReachable).toBe(true);
    });
  });

  describe('WatchSessionStateEvent', () => {
    it('accepts session state event without error', () => {
      const event: WatchSessionStateEvent = {
        state: 'activated',
      };

      expect(event.state).toBe('activated');
      expect(event.error).toBeUndefined();
    });

    it('accepts session state event with error', () => {
      const event: WatchSessionStateEvent = {
        state: 'inactive',
        error: 'Connection lost',
      };

      expect(event.state).toBe('inactive');
      expect(event.error).toBe('Connection lost');
    });
  });

  describe('WatchCommandType', () => {
    it('includes all command types', () => {
      const types: WatchCommandType[] = [
        'addWater',
        'removeWater',
        'quickAddCalories',
        'logFood',
        'requestSync',
      ];

      expect(types).toHaveLength(5);
    });
  });
});

describe('Watch Types - Edge Cases', () => {
  describe('WatchDailyData edge values', () => {
    it('handles zero values', () => {
      const data: WatchDailyData = {
        date: '2024-01-15',
        caloriesConsumed: 0,
        calorieTarget: 0,
        waterGlasses: 0,
        waterTarget: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        recentFoods: [],
        favoriteFoods: [],
      };

      expect(data.caloriesConsumed).toBe(0);
    });

    it('handles high values (over target)', () => {
      const data: WatchDailyData = {
        date: '2024-01-15',
        caloriesConsumed: 5000,
        calorieTarget: 2000,
        waterGlasses: 20,
        waterTarget: 8,
        protein: 300,
        carbs: 500,
        fat: 200,
        recentFoods: [],
        favoriteFoods: [],
      };

      expect(data.caloriesConsumed).toBeGreaterThan(data.calorieTarget);
    });
  });

  describe('WatchSimpleFood edge values', () => {
    it('handles empty name', () => {
      const food: WatchSimpleFood = {
        id: '123',
        name: '',
        calories: 0,
      };

      expect(food.name).toBe('');
    });

    it('handles long name', () => {
      const longName = 'A'.repeat(200);
      const food: WatchSimpleFood = {
        id: '123',
        name: longName,
        calories: 100,
      };

      expect(food.name.length).toBe(200);
    });

    it('handles decimal macros', () => {
      const food: WatchSimpleFood = {
        id: '123',
        name: 'Test Food',
        calories: 150,
        protein: 10.5,
        carbs: 20.3,
        fat: 5.7,
      };

      expect(food.protein).toBe(10.5);
    });
  });

  describe('QuickAddCaloriesCommand meal types', () => {
    it('accepts all meal types', () => {
      const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

      meals.forEach((meal) => {
        const command: QuickAddCaloriesCommand = {
          type: 'quickAddCalories',
          calories: 100,
          meal: meal as any,
        };

        expect(command.meal).toBe(meal);
      });
    });
  });
});
