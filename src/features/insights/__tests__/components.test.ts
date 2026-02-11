/**
 * UI Component Module Tests
 * Verifies components export correctly and related logic works.
 * Note: Full render tests require jsdom environment; these are structural tests.
 */

// Mock dependencies that don't transpile in node test env
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-native-reanimated', () => ({
  default: {
    View: 'Animated.View',
  },
  useSharedValue: jest.fn((v) => ({ value: v })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((v) => v),
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] || null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => Promise.resolve()),
    },
  };
});

jest.mock('../services/daily/DailyDataCollector', () => ({
  collectDailyInsightData: jest.fn(),
}));

jest.mock('../services/daily/WidgetHeadlineEngine', () => ({
  computeWidgetHeadline: jest.fn(),
}));

jest.mock('../services/LLMService', () => ({
  LLMService: {
    generate: jest.fn(),
    getStatus: jest.fn(),
  },
}));

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      bgPrimary: '#fff',
      bgSecondary: '#f5f5f5',
      bgElevated: '#fff',
      bgInteractive: '#e8e8e8',
      textPrimary: '#000',
      textSecondary: '#666',
      textTertiary: '#999',
      borderDefault: '#ddd',
      accent: '#007AFF',
      success: '#34C759',
    },
    isDark: false,
  }),
}));

jest.mock('@/constants/spacing', () => ({
  spacing: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 },
  borderRadius: { none: 0, sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
}));

jest.mock('@/constants/typography', () => ({
  typography: {
    display: { large: {}, medium: {}, small: {} },
    title: { large: {}, medium: {}, small: {} },
    body: { large: {}, medium: {}, small: {} },
    caption: {},
    overline: {},
    metric: { large: {}, medium: {}, small: {}, tiny: {} },
  },
}));

import { questionCategories, getCategoryMeta } from '../constants/dailyQuestionCategories';

describe('component module exports', () => {
  it('SnapshotCards exports', () => {
    const mod = require('../components/SnapshotCards');
    expect(mod.SnapshotCards).toBeDefined();
    expect(typeof mod.SnapshotCards).toBe('function');
  });

  it('DailyQuestionCard exports', () => {
    const mod = require('../components/DailyQuestionCard');
    expect(mod.DailyQuestionCard).toBeDefined();
    expect(typeof mod.DailyQuestionCard).toBe('function');
  });

  it('DailyCategoryChips exports', () => {
    const mod = require('../components/DailyCategoryChips');
    expect(mod.DailyCategoryChips).toBeDefined();
    expect(typeof mod.DailyCategoryChips).toBe('function');
  });

  it('DailyHeadlineCard exports', () => {
    const mod = require('../components/DailyHeadlineCard');
    expect(mod.DailyHeadlineCard).toBeDefined();
    expect(typeof mod.DailyHeadlineCard).toBe('function');
  });

  it('DailyNeedsMoreDataSection exports', () => {
    const mod = require('../components/DailyNeedsMoreDataSection');
    expect(mod.DailyNeedsMoreDataSection).toBeDefined();
    expect(typeof mod.DailyNeedsMoreDataSection).toBe('function');
  });
});

describe('questionCategories', () => {
  it('has exactly 6 categories', () => {
    expect(questionCategories).toHaveLength(6);
  });

  it('all categories have required fields', () => {
    for (const cat of questionCategories) {
      expect(cat.id).toBeDefined();
      expect(cat.label).toBeDefined();
      expect(cat.icon).toBeDefined();
      expect(cat.description).toBeDefined();
    }
  });

  it('getCategoryMeta returns correct category', () => {
    const macro = getCategoryMeta('macro_balance');
    expect(macro?.label).toBe('Macros & Calories');
    expect(macro?.icon).toBe('pie-chart-outline');
  });

  it('getCategoryMeta returns undefined for unknown category', () => {
    expect(getCategoryMeta('nonexistent')).toBeUndefined();
  });

  it('categories match expected IDs', () => {
    const ids = questionCategories.map((c) => c.id);
    expect(ids).toEqual([
      'macro_balance',
      'protein_focus',
      'meal_balance',
      'hydration',
      'trends',
      'nutrient_gaps',
    ]);
  });
});
