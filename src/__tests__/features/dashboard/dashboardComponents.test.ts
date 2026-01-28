/**
 * Dashboard Component Tests
 * Tests for dashboard widget definitions and integration
 */

// Mock widget components before any imports
jest.mock('@/components/dashboard/widgets', () => ({
  CalorieRingWidget: jest.fn(() => null),
  MacroBarsWidget: jest.fn(() => null),
  WaterTrackerWidget: jest.fn(() => null),
  WeightTrendWidget: jest.fn(() => null),
  TodaysMealsWidget: jest.fn(() => null),
  StreakBadgeWidget: jest.fn(() => null),
  WeeklyAverageWidget: jest.fn(() => null),
  ProteinFocusWidget: jest.fn(() => null),
  QuickAddWidget: jest.fn(() => null),
  GoalsSummaryWidget: jest.fn(() => null),
  MealIdeasWidget: jest.fn(() => null),
}));

// Mock AsyncStorage before imports
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock generateId
jest.mock('@/utils/generateId', () => ({
  generateId: jest.fn(() => 'test-widget-id'),
}));

// Import types and definitions
import { WidgetType, WidgetSize, DashboardWidget } from '@/types/dashboard';
import {
  WIDGET_DEFINITIONS,
  getWidgetDefinition,
  getAllWidgetDefinitions,
  getWidgetsByCategory,
  WIDGET_CATEGORIES,
  DEFAULT_WIDGET_TYPES,
} from '@/constants/widgetDefinitions';
import { useDashboardStore } from '@/stores/dashboardStore';

describe('Widget Definitions', () => {
  describe('WIDGET_DEFINITIONS', () => {
    it('defines all 11 widget types', () => {
      const widgetTypes: WidgetType[] = [
        'calorie_ring',
        'macro_bars',
        'water_tracker',
        'weight_trend',
        'todays_meals',
        'streak_badge',
        'weekly_average',
        'protein_focus',
        'quick_add',
        'goals_summary',
        'meal_ideas',
      ];

      widgetTypes.forEach((type) => {
        expect(WIDGET_DEFINITIONS[type]).toBeDefined();
      });
    });

    it('each definition has required properties', () => {
      Object.entries(WIDGET_DEFINITIONS).forEach(([type, def]) => {
        expect(def.type).toBe(type);
        expect(def.name).toBeDefined();
        expect(def.description).toBeDefined();
        expect(def.icon).toBeDefined();
        expect(def.defaultSize).toBeDefined();
        expect(def.category).toBeDefined();
        expect(def.component).toBeDefined();
      });
    });

    it('calorie_ring widget has correct metadata', () => {
      const def = WIDGET_DEFINITIONS.calorie_ring;

      expect(def.name).toBe('Calorie Ring');
      expect(def.description).toContain('calorie');
      expect(def.category).toBe('nutrition');
    });

    it('macro_bars widget has correct metadata', () => {
      const def = WIDGET_DEFINITIONS.macro_bars;

      expect(def.name).toBe('Macro Bars');
      expect(def.description).toContain('Protein');
      expect(def.category).toBe('nutrition');
    });

    it('water_tracker widget has correct metadata', () => {
      const def = WIDGET_DEFINITIONS.water_tracker;

      expect(def.name).toBe('Water Tracker');
      expect(def.description).toContain('water');
      expect(def.category).toBe('nutrition');
    });

    it('weight_trend widget has correct metadata', () => {
      const def = WIDGET_DEFINITIONS.weight_trend;

      expect(def.name).toBe('Weight Trend');
      expect(def.description).toContain('chart');
      expect(def.category).toBe('progress');
    });

    it('todays_meals widget has correct metadata', () => {
      const def = WIDGET_DEFINITIONS.todays_meals;

      expect(def.name).toBe("Today's Meals");
      expect(def.category).toBe('meals');
    });

    it('streak_badge widget has correct metadata', () => {
      const def = WIDGET_DEFINITIONS.streak_badge;

      expect(def.name).toBe('Streak Badge');
      expect(def.category).toBe('progress');
    });
  });

  describe('getWidgetDefinition', () => {
    it('returns definition for valid type', () => {
      const def = getWidgetDefinition('calorie_ring');

      expect(def).toBeDefined();
      expect(def?.type).toBe('calorie_ring');
    });

    it('returns undefined for invalid type', () => {
      const def = getWidgetDefinition('invalid_type' as WidgetType);

      expect(def).toBeUndefined();
    });
  });

  describe('getAllWidgetDefinitions', () => {
    it('returns all widget definitions', () => {
      const definitions = getAllWidgetDefinitions();

      expect(definitions).toHaveLength(11);
    });

    it('returns array of definition objects', () => {
      const definitions = getAllWidgetDefinitions();

      definitions.forEach((def) => {
        expect(def.type).toBeDefined();
        expect(def.name).toBeDefined();
        expect(def.component).toBeDefined();
      });
    });
  });

  describe('getWidgetsByCategory', () => {
    it('returns nutrition widgets', () => {
      const nutritionWidgets = getWidgetsByCategory('nutrition');

      expect(nutritionWidgets.length).toBeGreaterThan(0);
      nutritionWidgets.forEach((def) => {
        expect(def.category).toBe('nutrition');
      });
    });

    it('returns progress widgets', () => {
      const progressWidgets = getWidgetsByCategory('progress');

      expect(progressWidgets.length).toBeGreaterThan(0);
      progressWidgets.forEach((def) => {
        expect(def.category).toBe('progress');
      });
    });

    it('returns meals widgets', () => {
      const mealsWidgets = getWidgetsByCategory('meals');

      expect(mealsWidgets.length).toBeGreaterThan(0);
      mealsWidgets.forEach((def) => {
        expect(def.category).toBe('meals');
      });
    });

    it('returns empty array for unknown category', () => {
      const widgets = getWidgetsByCategory('unknown');

      expect(widgets).toHaveLength(0);
    });
  });

  describe('WIDGET_CATEGORIES', () => {
    it('defines three categories', () => {
      expect(WIDGET_CATEGORIES).toHaveLength(3);
    });

    it('has nutrition category', () => {
      const nutrition = WIDGET_CATEGORIES.find((c) => c.id === 'nutrition');
      expect(nutrition).toBeDefined();
      expect(nutrition?.label).toBe('Nutrition');
    });

    it('has meals category', () => {
      const meals = WIDGET_CATEGORIES.find((c) => c.id === 'meals');
      expect(meals).toBeDefined();
      expect(meals?.label).toBe('Meals');
    });

    it('has progress category', () => {
      const progress = WIDGET_CATEGORIES.find((c) => c.id === 'progress');
      expect(progress).toBeDefined();
      expect(progress?.label).toBe('Progress');
    });
  });

  describe('DEFAULT_WIDGET_TYPES', () => {
    it('includes calorie_ring', () => {
      expect(DEFAULT_WIDGET_TYPES).toContain('calorie_ring');
    });

    it('includes macro_bars', () => {
      expect(DEFAULT_WIDGET_TYPES).toContain('macro_bars');
    });

    it('includes water_tracker', () => {
      expect(DEFAULT_WIDGET_TYPES).toContain('water_tracker');
    });

    it('includes todays_meals', () => {
      expect(DEFAULT_WIDGET_TYPES).toContain('todays_meals');
    });

    it('has 4 default widgets', () => {
      expect(DEFAULT_WIDGET_TYPES).toHaveLength(4);
    });
  });
});

describe('Dashboard Store Integration', () => {
  beforeEach(() => {
    useDashboardStore.getState().reset();
    jest.clearAllMocks();
  });

  describe('widget management workflow', () => {
    it('initializes with default widgets', () => {
      const state = useDashboardStore.getState();

      expect(state.widgets).toHaveLength(4);
      expect(state.widgets[0].type).toBe('calorie_ring');
    });

    it('can add all widget types', () => {
      const widgetTypes: WidgetType[] = [
        'streak_badge',
        'weekly_average',
        'protein_focus',
        'quick_add',
        'goals_summary',
        'meal_ideas',
        'weight_trend',
      ];

      widgetTypes.forEach((type) => {
        useDashboardStore.getState().addWidget(type);
      });

      const state = useDashboardStore.getState();
      expect(state.widgets.length).toBe(4 + widgetTypes.length);
    });

    it('edit mode workflow works correctly', () => {
      const store = useDashboardStore.getState();

      // Start in non-edit mode
      expect(store.isEditMode).toBe(false);

      // Enter edit mode
      store.setEditMode(true);
      expect(useDashboardStore.getState().isEditMode).toBe(true);

      // Add a widget while in edit mode
      store.addWidget('streak_badge');
      expect(useDashboardStore.getState().widgets).toHaveLength(5);

      // Exit edit mode
      useDashboardStore.getState().setEditMode(false);
      expect(useDashboardStore.getState().isEditMode).toBe(false);
    });

    it('reorder workflow preserves all widgets', () => {
      const originalCount = useDashboardStore.getState().widgets.length;
      const visibleIds = useDashboardStore.getState()
        .widgets
        .filter((w) => w.isVisible)
        .map((w) => w.id)
        .reverse();

      useDashboardStore.getState().reorderWidgets(visibleIds);

      const newCount = useDashboardStore.getState().widgets.length;
      expect(newCount).toBe(originalCount);
    });

    it('remove and add workflow maintains positions', () => {
      // Remove first widget
      const firstId = useDashboardStore.getState().widgets[0].id;
      useDashboardStore.getState().removeWidget(firstId);

      // Positions should be re-indexed
      const afterRemove = useDashboardStore.getState().widgets;
      afterRemove.forEach((w, i) => {
        expect(w.position).toBe(i);
      });

      // Add new widget
      useDashboardStore.getState().addWidget('streak_badge');

      // New widget should be at the end
      const afterAdd = useDashboardStore.getState().widgets;
      const newWidget = afterAdd.find((w) => w.type === 'streak_badge');
      expect(newWidget?.position).toBe(afterAdd.length - 1);
    });
  });

  describe('widget configuration', () => {
    it('can configure widget options', () => {
      useDashboardStore.getState().updateWidgetConfig('default-2', {
        showFiber: true,
      });

      const widget = useDashboardStore.getState().widgets.find(
        (w) => w.id === 'default-2'
      );

      expect(widget?.config?.showFiber).toBe(true);
    });

    it('add widget with initial config', () => {
      useDashboardStore.getState().addWidget('weight_trend', {
        chartRange: '30d',
      });

      const widget = useDashboardStore.getState().widgets.find(
        (w) => w.type === 'weight_trend'
      );

      expect(widget?.config?.chartRange).toBe('30d');
    });
  });

  describe('visibility toggle', () => {
    it('can hide and show widgets', () => {
      const widgetId = useDashboardStore.getState().widgets[0].id;

      // Hide widget
      useDashboardStore.getState().toggleWidgetVisibility(widgetId);
      let widget = useDashboardStore.getState().widgets.find((w) => w.id === widgetId);
      expect(widget?.isVisible).toBe(false);

      // Show widget again
      useDashboardStore.getState().toggleWidgetVisibility(widgetId);
      widget = useDashboardStore.getState().widgets.find((w) => w.id === widgetId);
      expect(widget?.isVisible).toBe(true);
    });
  });

  describe('reset functionality', () => {
    it('resetToDefaults restores original widgets', () => {
      // Add some widgets
      useDashboardStore.getState().addWidget('streak_badge');
      useDashboardStore.getState().addWidget('weight_trend');

      // Remove a default widget
      useDashboardStore.getState().removeWidget('default-1');

      // Reset
      useDashboardStore.getState().resetToDefaults();

      const state = useDashboardStore.getState();
      expect(state.widgets).toHaveLength(4);
      expect(state.widgets[0].type).toBe('calorie_ring');
    });
  });
});
