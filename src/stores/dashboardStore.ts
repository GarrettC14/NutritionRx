/**
 * Dashboard Store
 * Zustand store for managing customizable dashboard state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '@/utils/generateId';
import {
  DashboardWidget,
  WidgetType,
  WidgetConfig,
} from '@/types/dashboard';

interface DashboardState {
  // State
  widgets: DashboardWidget[];
  isEditMode: boolean;

  // Actions
  setEditMode: (isEdit: boolean) => void;
  reorderWidgets: (orderedIds: string[]) => void;
  addWidget: (type: WidgetType, config?: WidgetConfig) => void;
  removeWidget: (id: string) => void;
  toggleWidgetVisibility: (id: string) => void;
  updateWidgetConfig: (id: string, config: Partial<WidgetConfig>) => void;
  resetToDefaults: () => void;
  reset: () => void;
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: 'default-1',
    type: 'calorie_ring',
    position: 0,
    isVisible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-2',
    type: 'macro_bars',
    position: 1,
    isVisible: true,
    config: { showFiber: false },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-3',
    type: 'water_tracker',
    position: 2,
    isVisible: true,
    config: { dailyGoal: 8 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-4',
    type: 'todays_meals',
    position: 3,
    isVisible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const initialState = {
  widgets: DEFAULT_WIDGETS,
  isEditMode: false,
};

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setEditMode: (isEdit) => set({ isEditMode: isEdit }),

      reorderWidgets: (orderedIds) => {
        const widgetMap = new Map(get().widgets.map((w) => [w.id, w]));
        const reorderedWidgets = orderedIds
          .map((id) => widgetMap.get(id))
          .filter((w): w is DashboardWidget => w !== undefined)
          .map((w, i) => ({
            ...w,
            position: i,
            updatedAt: new Date().toISOString(),
          }));
        // Add any widgets not in orderedIds (hidden widgets)
        const orderedIdSet = new Set(orderedIds);
        const hiddenWidgets = get()
          .widgets.filter((w) => !orderedIdSet.has(w.id))
          .map((w, i) => ({
            ...w,
            position: reorderedWidgets.length + i,
            updatedAt: new Date().toISOString(),
          }));
        set({ widgets: [...reorderedWidgets, ...hiddenWidgets] });
      },

      addWidget: (type, config) => {
        const widgets = get().widgets;
        const newWidget: DashboardWidget = {
          id: generateId(),
          type,
          position: widgets.length,
          isVisible: true,
          config,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set({ widgets: [...widgets, newWidget] });
      },

      removeWidget: (id) => {
        const widgets = get().widgets.filter((w) => w.id !== id);
        const reindexed = widgets.map((w, i) => ({
          ...w,
          position: i,
          updatedAt: new Date().toISOString(),
        }));
        set({ widgets: reindexed });
      },

      toggleWidgetVisibility: (id) => {
        const widgets = get().widgets.map((w) =>
          w.id === id
            ? { ...w, isVisible: !w.isVisible, updatedAt: new Date().toISOString() }
            : w
        );
        set({ widgets });
      },

      updateWidgetConfig: (id, config) => {
        const widgets = get().widgets.map((w) =>
          w.id === id
            ? {
                ...w,
                config: { ...w.config, ...config },
                updatedAt: new Date().toISOString(),
              }
            : w
        );
        set({ widgets });
      },

      resetToDefaults: () => {
        const now = new Date().toISOString();
        const freshDefaults = DEFAULT_WIDGETS.map((w, i) => ({
          ...w,
          id: `default-${i + 1}`,
          position: i,
          createdAt: now,
          updatedAt: now,
        }));
        set({ widgets: freshDefaults, isEditMode: false });
      },

      reset: () => set(initialState),
    }),
    {
      name: 'nutritionrx-dashboard-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        widgets: state.widgets,
      }),
    }
  )
);

// Selector helpers
export const selectVisibleWidgets = (state: DashboardState) =>
  state.widgets.filter((w) => w.isVisible).sort((a, b) => a.position - b.position);

export const selectWidgetById = (state: DashboardState, id: string) =>
  state.widgets.find((w) => w.id === id);

export const selectWidgetTypes = (state: DashboardState) =>
  state.widgets.map((w) => w.type);
