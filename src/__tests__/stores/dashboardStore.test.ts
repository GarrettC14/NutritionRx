/**
 * Dashboard Store Tests
 * Tests for customizable dashboard state management
 */

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

import { useDashboardStore, selectVisibleWidgets, selectWidgetById, selectWidgetTypes } from '@/stores/dashboardStore';
import { generateId } from '@/utils/generateId';

const mockGenerateId = generateId as jest.Mock;

describe('dashboardStore', () => {
  const mockWidgets = [
    {
      id: 'widget-1',
      type: 'calorie_ring' as const,
      position: 0,
      isVisible: true,
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z',
    },
    {
      id: 'widget-2',
      type: 'macro_bars' as const,
      position: 1,
      isVisible: true,
      config: { showFiber: false },
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z',
    },
    {
      id: 'widget-3',
      type: 'water_tracker' as const,
      position: 2,
      isVisible: false,
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z',
    },
  ];

  beforeEach(() => {
    // Reset store to a clean state with mock widgets
    useDashboardStore.setState({
      widgets: [...mockWidgets],
      isEditMode: false,
    });
    jest.clearAllMocks();
    mockGenerateId.mockReturnValue('new-widget-id');
  });

  describe('initial state', () => {
    it('has default widgets', () => {
      // Reset to actual initial state to test defaults
      useDashboardStore.getState().reset();
      const state = useDashboardStore.getState();

      expect(state.widgets).toHaveLength(5);
      expect(state.widgets[0].type).toBe('nutrition_overview');
      expect(state.widgets[1].type).toBe('quick_add');
      expect(state.widgets[2].type).toBe('water_tracker');
      expect(state.widgets[3].type).toBe('todays_meals');
      expect(state.widgets[4].type).toBe('streak_badge');
    });

    it('starts in non-edit mode', () => {
      const state = useDashboardStore.getState();
      expect(state.isEditMode).toBe(false);
    });
  });

  describe('setEditMode', () => {
    it('enables edit mode', () => {
      useDashboardStore.getState().setEditMode(true);
      const state = useDashboardStore.getState();
      expect(state.isEditMode).toBe(true);
    });

    it('disables edit mode', () => {
      useDashboardStore.setState({ isEditMode: true });
      useDashboardStore.getState().setEditMode(false);
      const state = useDashboardStore.getState();
      expect(state.isEditMode).toBe(false);
    });
  });

  describe('reorderWidgets', () => {
    it('reorders widgets based on provided IDs', () => {
      useDashboardStore.getState().reorderWidgets(['widget-2', 'widget-1']);

      const state = useDashboardStore.getState();
      const visibleWidgets = state.widgets.filter((w) => w.isVisible);

      expect(visibleWidgets[0].id).toBe('widget-2');
      expect(visibleWidgets[0].position).toBe(0);
      expect(visibleWidgets[1].id).toBe('widget-1');
      expect(visibleWidgets[1].position).toBe(1);
    });

    it('preserves hidden widgets', () => {
      useDashboardStore.getState().reorderWidgets(['widget-2', 'widget-1']);

      const state = useDashboardStore.getState();
      const hiddenWidget = state.widgets.find((w) => w.id === 'widget-3');

      expect(hiddenWidget).toBeDefined();
      expect(hiddenWidget?.isVisible).toBe(false);
    });

    it('updates updatedAt timestamp', () => {
      const beforeUpdate = new Date().toISOString();
      useDashboardStore.getState().reorderWidgets(['widget-2', 'widget-1']);

      const state = useDashboardStore.getState();
      expect(new Date(state.widgets[0].updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeUpdate).getTime()
      );
    });
  });

  describe('addWidget', () => {
    it('adds a new widget to the list', () => {
      mockGenerateId.mockReturnValueOnce('new-widget-id');
      useDashboardStore.getState().addWidget('streak_badge');

      const state = useDashboardStore.getState();
      expect(state.widgets).toHaveLength(4);
      expect(state.widgets[3].type).toBe('streak_badge');
      expect(state.widgets[3].id).toBe('new-widget-id');
    });

    it('sets the correct position', () => {
      useDashboardStore.getState().addWidget('streak_badge');

      const state = useDashboardStore.getState();
      const newWidget = state.widgets.find((w) => w.type === 'streak_badge');

      expect(newWidget?.position).toBe(3);
    });

    it('adds widget with config', () => {
      useDashboardStore.getState().addWidget('weight_trend', { chartRange: '30d' });

      const state = useDashboardStore.getState();
      const newWidget = state.widgets.find((w) => w.type === 'weight_trend');

      expect(newWidget?.config?.chartRange).toBe('30d');
    });

    it('makes new widget visible by default', () => {
      useDashboardStore.getState().addWidget('weekly_average');

      const state = useDashboardStore.getState();
      const newWidget = state.widgets.find((w) => w.type === 'weekly_average');

      expect(newWidget?.isVisible).toBe(true);
    });
  });

  describe('removeWidget', () => {
    it('removes widget by id', () => {
      useDashboardStore.getState().removeWidget('widget-2');

      const state = useDashboardStore.getState();
      expect(state.widgets).toHaveLength(2);
      expect(state.widgets.find((w) => w.id === 'widget-2')).toBeUndefined();
    });

    it('reindexes remaining widgets', () => {
      useDashboardStore.getState().removeWidget('widget-1');

      const state = useDashboardStore.getState();
      expect(state.widgets[0].position).toBe(0);
      expect(state.widgets[1].position).toBe(1);
    });

    it('does nothing for non-existent widget', () => {
      useDashboardStore.getState().removeWidget('non-existent');

      const state = useDashboardStore.getState();
      expect(state.widgets).toHaveLength(3);
    });
  });

  describe('toggleWidgetVisibility', () => {
    it('hides visible widget', () => {
      useDashboardStore.getState().toggleWidgetVisibility('widget-1');

      const state = useDashboardStore.getState();
      const widget = state.widgets.find((w) => w.id === 'widget-1');

      expect(widget?.isVisible).toBe(false);
    });

    it('shows hidden widget', () => {
      useDashboardStore.getState().toggleWidgetVisibility('widget-3');

      const state = useDashboardStore.getState();
      const widget = state.widgets.find((w) => w.id === 'widget-3');

      expect(widget?.isVisible).toBe(true);
    });

    it('updates updatedAt timestamp', () => {
      const beforeUpdate = new Date().toISOString();
      useDashboardStore.getState().toggleWidgetVisibility('widget-1');

      const state = useDashboardStore.getState();
      const widget = state.widgets.find((w) => w.id === 'widget-1');

      expect(new Date(widget!.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeUpdate).getTime()
      );
    });
  });

  describe('updateWidgetConfig', () => {
    it('updates widget config', () => {
      useDashboardStore.getState().updateWidgetConfig('widget-2', { showFiber: true });

      const state = useDashboardStore.getState();
      const widget = state.widgets.find((w) => w.id === 'widget-2');

      expect(widget?.config?.showFiber).toBe(true);
    });

    it('merges with existing config', () => {
      useDashboardStore.getState().updateWidgetConfig('widget-2', { newKey: 'value' } as any);

      const state = useDashboardStore.getState();
      const widget = state.widgets.find((w) => w.id === 'widget-2');

      expect(widget?.config?.showFiber).toBe(false);
      expect((widget?.config as any)?.newKey).toBe('value');
    });

    it('adds config to widget without existing config', () => {
      useDashboardStore.getState().updateWidgetConfig('widget-1', { chartRange: '7d' });

      const state = useDashboardStore.getState();
      const widget = state.widgets.find((w) => w.id === 'widget-1');

      expect(widget?.config?.chartRange).toBe('7d');
    });
  });

  describe('resetToDefaults', () => {
    it('restores default widgets', () => {
      // Remove all widgets first
      useDashboardStore.setState({ widgets: [] });

      useDashboardStore.getState().resetToDefaults();

      const state = useDashboardStore.getState();
      expect(state.widgets).toHaveLength(5);
      expect(state.widgets[0].type).toBe('nutrition_overview');
      expect(state.widgets[1].type).toBe('quick_add');
      expect(state.widgets[2].type).toBe('water_tracker');
      expect(state.widgets[3].type).toBe('todays_meals');
      expect(state.widgets[4].type).toBe('streak_badge');
    });

    it('exits edit mode', () => {
      useDashboardStore.setState({ isEditMode: true });

      useDashboardStore.getState().resetToDefaults();

      const state = useDashboardStore.getState();
      expect(state.isEditMode).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets to initial state', () => {
      useDashboardStore.setState({
        widgets: [],
        isEditMode: true,
      });

      useDashboardStore.getState().reset();

      const state = useDashboardStore.getState();
      expect(state.widgets).toHaveLength(5);
      expect(state.isEditMode).toBe(false);
    });
  });

  describe('selectors', () => {
    describe('selectVisibleWidgets', () => {
      it('returns only visible widgets', () => {
        const state = useDashboardStore.getState();
        const visible = selectVisibleWidgets(state);

        expect(visible).toHaveLength(2);
        expect(visible.every((w) => w.isVisible)).toBe(true);
      });

      it('returns widgets sorted by position', () => {
        // Set widgets with different positions
        useDashboardStore.setState({
          widgets: [
            { ...mockWidgets[0], position: 2 },
            { ...mockWidgets[1], position: 0 },
          ],
        });

        const state = useDashboardStore.getState();
        const visible = selectVisibleWidgets(state);

        expect(visible[0].position).toBe(0);
        expect(visible[1].position).toBe(2);
      });
    });

    describe('selectWidgetById', () => {
      it('finds widget by id', () => {
        const state = useDashboardStore.getState();
        const widget = selectWidgetById(state, 'widget-2');

        expect(widget).toBeDefined();
        expect(widget?.type).toBe('macro_bars');
      });

      it('returns undefined for non-existent id', () => {
        const state = useDashboardStore.getState();
        const widget = selectWidgetById(state, 'non-existent');

        expect(widget).toBeUndefined();
      });
    });

    describe('selectWidgetTypes', () => {
      it('returns array of widget types', () => {
        const state = useDashboardStore.getState();
        const types = selectWidgetTypes(state);

        expect(types).toEqual(['calorie_ring', 'macro_bars', 'water_tracker']);
      });
    });
  });
});
