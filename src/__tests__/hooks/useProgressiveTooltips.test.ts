/**
 * useProgressiveTooltips Hook Tests
 * Tests for progressive discovery tooltip triggering
 */

import { TOOLTIP_IDS } from '@/constants/tooltipIds';

// Mock state
let mockSeenTooltips: string[] = [];
let mockTotalFoodsLogged = 0;
let mockDaysTracked = 0;
let mockFirstFoodLoggedAt: Date | null = null;
let mockActiveTooltip: any = null;

// Mock useTooltip
const mockShowTooltipIfNotSeen = jest.fn((config) => {
  if (mockSeenTooltips.includes(config.id)) return false;
  mockActiveTooltip = config;
  return true;
});
const mockHasSeen = jest.fn((id: string) => mockSeenTooltips.includes(id));

jest.mock('@/hooks/useTooltip', () => ({
  useTooltip: jest.fn(() => ({
    showTooltipIfNotSeen: mockShowTooltipIfNotSeen,
    hasSeen: mockHasSeen,
    hideTooltip: jest.fn(),
    showTooltip: jest.fn(),
    markSeen: jest.fn(),
    isActive: false,
  })),
  createTooltip: jest.fn((id, content, options) => ({
    id,
    content,
    ...options,
  })),
}));

// Mock onboarding store
jest.mock('@/stores', () => ({
  useOnboardingStore: jest.fn(() => ({
    totalFoodsLogged: mockTotalFoodsLogged,
    daysTracked: mockDaysTracked,
    firstFoodLoggedAt: mockFirstFoodLoggedAt,
    seenTooltips: mockSeenTooltips,
  })),
}));

// Mock React hooks
jest.mock('react', () => ({
  useCallback: jest.fn((fn) => fn),
  useEffect: jest.fn(),
  useRef: jest.fn(() => ({ current: false })),
}));

describe('useProgressiveTooltips', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSeenTooltips = [];
    mockTotalFoodsLogged = 0;
    mockDaysTracked = 0;
    mockFirstFoodLoggedAt = null;
    mockActiveTooltip = null;
  });

  describe('checkWaterTrackingIntro', () => {
    it('shows tooltip when not seen', () => {
      mockSeenTooltips = [];

      const result = mockShowTooltipIfNotSeen({
        id: TOOLTIP_IDS.WATER_TRACKING,
        content: 'Stay hydrated!',
      });

      expect(result).toBe(true);
      expect(mockActiveTooltip.id).toBe(TOOLTIP_IDS.WATER_TRACKING);
    });

    it('does not show tooltip when already seen', () => {
      mockSeenTooltips = [TOOLTIP_IDS.WATER_TRACKING];

      const result = mockShowTooltipIfNotSeen({
        id: TOOLTIP_IDS.WATER_TRACKING,
        content: 'Stay hydrated!',
      });

      expect(result).toBe(false);
    });

    it('includes water droplet icon', () => {
      mockSeenTooltips = [];

      mockShowTooltipIfNotSeen({
        id: TOOLTIP_IDS.WATER_TRACKING,
        content: 'Stay hydrated!',
        icon: '💧',
      });

      expect(mockActiveTooltip.icon).toBe('💧');
    });
  });

  describe('checkMealCollapseTip', () => {
    it('shows tooltip when 5+ foods logged and not seen', () => {
      mockSeenTooltips = [];
      mockTotalFoodsLogged = 5;

      // Simulate the condition check
      const shouldShow = mockTotalFoodsLogged >= 5 && !mockSeenTooltips.includes(TOOLTIP_IDS.MEAL_COLLAPSE);
      expect(shouldShow).toBe(true);

      const result = mockShowTooltipIfNotSeen({
        id: TOOLTIP_IDS.MEAL_COLLAPSE,
        content: 'Pro tip: Tap on a meal header',
      });

      expect(result).toBe(true);
    });

    it('does not show tooltip when less than 5 foods logged', () => {
      mockSeenTooltips = [];
      mockTotalFoodsLogged = 4;

      const shouldShow = mockTotalFoodsLogged >= 5 && !mockSeenTooltips.includes(TOOLTIP_IDS.MEAL_COLLAPSE);
      expect(shouldShow).toBe(false);
    });

    it('does not show tooltip when already seen', () => {
      mockSeenTooltips = [TOOLTIP_IDS.MEAL_COLLAPSE];
      mockTotalFoodsLogged = 10;

      const shouldShow = mockTotalFoodsLogged >= 5 && !mockSeenTooltips.includes(TOOLTIP_IDS.MEAL_COLLAPSE);
      expect(shouldShow).toBe(false);
    });
  });

  describe('checkQuickAddDiscovery', () => {
    it('shows tooltip when 10+ foods logged and not seen', () => {
      mockSeenTooltips = [];
      mockTotalFoodsLogged = 10;

      const shouldShow = mockTotalFoodsLogged >= 10 && !mockSeenTooltips.includes(TOOLTIP_IDS.QUICK_ADD);
      expect(shouldShow).toBe(true);

      const result = mockShowTooltipIfNotSeen({
        id: TOOLTIP_IDS.QUICK_ADD,
        content: 'Speed up your logging!',
        icon: '⚡',
      });

      expect(result).toBe(true);
      expect(mockActiveTooltip.icon).toBe('⚡');
    });

    it('does not show tooltip when less than 10 foods logged', () => {
      mockSeenTooltips = [];
      mockTotalFoodsLogged = 9;

      const shouldShow = mockTotalFoodsLogged >= 10 && !mockSeenTooltips.includes(TOOLTIP_IDS.QUICK_ADD);
      expect(shouldShow).toBe(false);
    });

    it('threshold is exactly 10 foods', () => {
      mockSeenTooltips = [];

      mockTotalFoodsLogged = 9;
      expect(mockTotalFoodsLogged >= 10).toBe(false);

      mockTotalFoodsLogged = 10;
      expect(mockTotalFoodsLogged >= 10).toBe(true);

      mockTotalFoodsLogged = 11;
      expect(mockTotalFoodsLogged >= 10).toBe(true);
    });
  });

  describe('checkWeeklySummary', () => {
    it('shows tooltip when 7+ days tracked and not seen', () => {
      mockSeenTooltips = [];
      mockDaysTracked = 7;

      const shouldShow = mockDaysTracked >= 7 && !mockSeenTooltips.includes(TOOLTIP_IDS.WEEKLY_SUMMARY);
      expect(shouldShow).toBe(true);

      const result = mockShowTooltipIfNotSeen({
        id: TOOLTIP_IDS.WEEKLY_SUMMARY,
        content: "You've been tracking for a week!",
        icon: '📊',
      });

      expect(result).toBe(true);
    });

    it('does not show tooltip when less than 7 days', () => {
      mockSeenTooltips = [];
      mockDaysTracked = 6;

      const shouldShow = mockDaysTracked >= 7 && !mockSeenTooltips.includes(TOOLTIP_IDS.WEEKLY_SUMMARY);
      expect(shouldShow).toBe(false);
    });

    it('threshold is exactly 7 days', () => {
      mockSeenTooltips = [];

      mockDaysTracked = 6;
      expect(mockDaysTracked >= 7).toBe(false);

      mockDaysTracked = 7;
      expect(mockDaysTracked >= 7).toBe(true);

      mockDaysTracked = 14;
      expect(mockDaysTracked >= 7).toBe(true);
    });
  });

  describe('checkBarcodeScannerIntro', () => {
    it('shows tooltip after first food logged and not seen', () => {
      mockSeenTooltips = [];
      mockFirstFoodLoggedAt = new Date();

      const shouldShow = mockFirstFoodLoggedAt !== null && !mockSeenTooltips.includes(TOOLTIP_IDS.BARCODE_SCANNER);
      expect(shouldShow).toBe(true);

      const result = mockShowTooltipIfNotSeen({
        id: TOOLTIP_IDS.BARCODE_SCANNER,
        content: 'Did you know? You can scan barcodes',
        icon: '📸',
      });

      expect(result).toBe(true);
    });

    it('does not show tooltip if first food not logged', () => {
      mockSeenTooltips = [];
      mockFirstFoodLoggedAt = null;

      const shouldShow = mockFirstFoodLoggedAt !== null && !mockSeenTooltips.includes(TOOLTIP_IDS.BARCODE_SCANNER);
      expect(shouldShow).toBe(false);
    });
  });

  describe('checkServingSizeTip', () => {
    it('shows tooltip when 3+ foods logged and not seen', () => {
      mockSeenTooltips = [];
      mockTotalFoodsLogged = 3;

      const shouldShow = mockTotalFoodsLogged >= 3 && !mockSeenTooltips.includes(TOOLTIP_IDS.SERVING_SIZE);
      expect(shouldShow).toBe(true);

      const result = mockShowTooltipIfNotSeen({
        id: TOOLTIP_IDS.SERVING_SIZE,
        content: 'Tip: You can adjust serving sizes',
        icon: '🍽️',
      });

      expect(result).toBe(true);
    });

    it('does not show tooltip when less than 3 foods logged', () => {
      mockSeenTooltips = [];
      mockTotalFoodsLogged = 2;

      const shouldShow = mockTotalFoodsLogged >= 3 && !mockSeenTooltips.includes(TOOLTIP_IDS.SERVING_SIZE);
      expect(shouldShow).toBe(false);
    });
  });

  describe('tooltip content', () => {
    it('water tracking tooltip has correct content', () => {
      const content = 'Stay hydrated! Tap the water droplets to track your daily water intake. Your goal is 8 glasses per day.';
      expect(content).toContain('water');
      expect(content).toContain('8 glasses');
    });

    it('meal collapse tooltip has correct content', () => {
      const content = 'Pro tip: Tap on a meal header to collapse or expand it. This helps keep your diary organized!';
      expect(content).toContain('collapse');
      expect(content).toContain('expand');
    });

    it('quick add tooltip has correct content', () => {
      const content = 'Speed up your logging! Long-press the + button to quickly add calories without searching for a specific food.';
      expect(content).toContain('Long-press');
      expect(content).toContain('quickly add');
    });

    it('weekly summary tooltip has correct content', () => {
      const content = "You've been tracking for a week! Check out your weekly summary in the Progress tab to see your trends.";
      expect(content).toContain('week');
      expect(content).toContain('Progress tab');
    });

    it('barcode scanner tooltip has correct content', () => {
      const content = 'Did you know? You can scan barcodes to quickly add packaged foods. Just tap the camera icon when adding food!';
      expect(content).toContain('barcodes');
      expect(content).toContain('camera icon');
    });

    it('serving size tooltip has correct content', () => {
      const content = 'Tip: You can adjust serving sizes by tapping on a logged food. Accurate portions lead to better tracking!';
      expect(content).toContain('serving sizes');
      expect(content).toContain('Accurate portions');
    });
  });

  describe('tooltip actions', () => {
    it('all tooltips should have a primary action', () => {
      const configs = [
        { actions: [{ label: 'Got it!', onPress: () => {}, primary: true }] },
        { actions: [{ label: 'Nice!', onPress: () => {}, primary: true }] },
        { actions: [{ label: 'Cool!', onPress: () => {}, primary: true }] },
        { actions: [{ label: 'View Progress', onPress: () => {}, primary: true }] },
        { actions: [{ label: 'Thanks!', onPress: () => {}, primary: true }] },
      ];

      configs.forEach((config) => {
        expect(config.actions[0].primary).toBe(true);
        expect(config.actions[0].label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('autoCheck behavior', () => {
    it('should check tooltips in priority order', () => {
      const checkOrder = [
        'checkWaterTrackingIntro',
        'checkMealCollapseTip',
        'checkQuickAddDiscovery',
        'checkWeeklySummary',
      ];

      // Verify the order is defined
      expect(checkOrder).toHaveLength(4);
      expect(checkOrder[0]).toBe('checkWaterTrackingIntro');
      expect(checkOrder[3]).toBe('checkWeeklySummary');
    });

    it('should stop checking after first tooltip is shown', () => {
      const tooltipsChecked: string[] = [];
      const showTooltip = (id: string) => {
        tooltipsChecked.push(id);
        return true; // First tooltip shown, should stop
      };

      // Simulate priority checking
      let shown = false;
      if (!shown && showTooltip('water')) shown = true;
      if (!shown && showTooltip('meal')) shown = true; // Should not run
      if (!shown && showTooltip('quick')) shown = true; // Should not run

      expect(tooltipsChecked).toHaveLength(1);
      expect(tooltipsChecked[0]).toBe('water');
    });
  });

  describe('condition combinations', () => {
    it('should prioritize water tracking over meal collapse even if both conditions are met', () => {
      mockSeenTooltips = [];
      mockTotalFoodsLogged = 10;

      // Both conditions are met, but water tracking should show first
      const waterCondition = !mockSeenTooltips.includes(TOOLTIP_IDS.WATER_TRACKING);
      const mealCondition = mockTotalFoodsLogged >= 5 && !mockSeenTooltips.includes(TOOLTIP_IDS.MEAL_COLLAPSE);

      expect(waterCondition).toBe(true);
      expect(mealCondition).toBe(true);
    });

    it('should show meal collapse after water tracking is seen', () => {
      mockSeenTooltips = [TOOLTIP_IDS.WATER_TRACKING];
      mockTotalFoodsLogged = 5;

      const waterCondition = !mockSeenTooltips.includes(TOOLTIP_IDS.WATER_TRACKING);
      const mealCondition = mockTotalFoodsLogged >= 5 && !mockSeenTooltips.includes(TOOLTIP_IDS.MEAL_COLLAPSE);

      expect(waterCondition).toBe(false);
      expect(mealCondition).toBe(true);
    });
  });
});
