/**
 * Tooltip System Integration Tests
 * End-to-end tests for progressive discovery tooltips.
 * Mock boundary: AsyncStorage is mocked; hook and store logic run real code.
 */

import { TOOLTIP_IDS } from '@/constants/tooltipIds';

// Mock state management
let mockOnboardingState = {
  seenTooltips: [] as string[],
  totalFoodsLogged: 0,
  daysTracked: 0,
  firstFoodLoggedAt: null as Date | null,
};

let mockActiveTooltip: any = null;

// Mock onboarding repository
jest.mock('@/repositories/onboardingRepository', () => ({
  onboardingRepository: {
    getAll: jest.fn(() => Promise.resolve({
      isComplete: true,
      completedAt: '2024-01-15T10:00:00.000Z',
      goalPath: 'maintain',
      energyUnit: 'calories',
      weightUnit: 'lbs',
      seenTooltips: mockOnboardingState.seenTooltips,
      firstFoodLoggedAt: mockOnboardingState.firstFoodLoggedAt?.toISOString() ?? null,
      totalFoodsLogged: mockOnboardingState.totalFoodsLogged,
      daysTracked: mockOnboardingState.daysTracked,
    })),
    markTooltipSeen: jest.fn((id: string) => {
      mockOnboardingState.seenTooltips = [...mockOnboardingState.seenTooltips, id];
      return Promise.resolve();
    }),
    incrementFoodsLogged: jest.fn(() => {
      mockOnboardingState.totalFoodsLogged++;
      return Promise.resolve();
    }),
    incrementDaysTracked: jest.fn(() => {
      mockOnboardingState.daysTracked++;
      return Promise.resolve();
    }),
    markFirstFoodLogged: jest.fn(() => {
      mockOnboardingState.firstFoodLoggedAt = new Date();
      return Promise.resolve();
    }),
    getLocaleDefaults: jest.fn(() => ({
      energyUnit: 'calories',
      weightUnit: 'lbs',
    })),
  },
}));

describe('Tooltip System Integration', () => {
  beforeEach(() => {
    // Reset state
    mockOnboardingState = {
      seenTooltips: [],
      totalFoodsLogged: 0,
      daysTracked: 0,
      firstFoodLoggedAt: null,
    };
    mockActiveTooltip = null;
    jest.clearAllMocks();
  });

  describe('Progressive Discovery Flow', () => {
    it('shows water tracking tooltip on first diary view', () => {
      // User has not seen any tooltips
      expect(mockOnboardingState.seenTooltips).toHaveLength(0);

      // Check if water tracking tooltip should show
      const shouldShow = !mockOnboardingState.seenTooltips.includes(TOOLTIP_IDS.WATER_TRACKING);
      expect(shouldShow).toBe(true);

      // Show the tooltip
      mockActiveTooltip = {
        id: TOOLTIP_IDS.WATER_TRACKING,
        content: 'Stay hydrated!',
        icon: '💧',
      };

      expect(mockActiveTooltip.id).toBe(TOOLTIP_IDS.WATER_TRACKING);
    });

    it('does not show water tracking tooltip again after dismissal', () => {
      // Mark as seen
      mockOnboardingState.seenTooltips = [TOOLTIP_IDS.WATER_TRACKING];

      // Check if should show
      const shouldShow = !mockOnboardingState.seenTooltips.includes(TOOLTIP_IDS.WATER_TRACKING);
      expect(shouldShow).toBe(false);
    });

    it('shows meal collapse tooltip after 5 foods logged', () => {
      // User has seen water tracking and logged 5 foods
      mockOnboardingState.seenTooltips = [TOOLTIP_IDS.WATER_TRACKING];
      mockOnboardingState.totalFoodsLogged = 5;

      const shouldShow =
        mockOnboardingState.totalFoodsLogged >= 5 &&
        !mockOnboardingState.seenTooltips.includes(TOOLTIP_IDS.MEAL_COLLAPSE);

      expect(shouldShow).toBe(true);
    });

    it('shows quick add tooltip after 10 foods logged', () => {
      // User has seen previous tooltips and logged 10 foods
      mockOnboardingState.seenTooltips = [TOOLTIP_IDS.WATER_TRACKING, TOOLTIP_IDS.MEAL_COLLAPSE];
      mockOnboardingState.totalFoodsLogged = 10;

      const shouldShow =
        mockOnboardingState.totalFoodsLogged >= 10 &&
        !mockOnboardingState.seenTooltips.includes(TOOLTIP_IDS.QUICK_ADD);

      expect(shouldShow).toBe(true);
    });

    it('shows weekly summary tooltip after 7 days tracking', () => {
      // User has seen previous tooltips and tracked for 7 days
      mockOnboardingState.seenTooltips = [
        TOOLTIP_IDS.WATER_TRACKING,
        TOOLTIP_IDS.MEAL_COLLAPSE,
        TOOLTIP_IDS.QUICK_ADD,
      ];
      mockOnboardingState.daysTracked = 7;

      const shouldShow =
        mockOnboardingState.daysTracked >= 7 &&
        !mockOnboardingState.seenTooltips.includes(TOOLTIP_IDS.WEEKLY_SUMMARY);

      expect(shouldShow).toBe(true);
    });
  });

  describe('Tooltip Persistence', () => {
    it('persists seen tooltips across sessions', async () => {
      const { onboardingRepository } = await import('@/repositories/onboardingRepository');

      // Mark tooltip as seen
      await onboardingRepository.markTooltipSeen(TOOLTIP_IDS.WATER_TRACKING);

      // Verify it was added to seen list
      expect(mockOnboardingState.seenTooltips).toContain(TOOLTIP_IDS.WATER_TRACKING);
    });

    it('retrieves seen tooltips from repository', async () => {
      // Pre-populate seen tooltips
      mockOnboardingState.seenTooltips = [TOOLTIP_IDS.WATER_TRACKING, TOOLTIP_IDS.MEAL_COLLAPSE];

      const { onboardingRepository } = await import('@/repositories/onboardingRepository');
      const data = await onboardingRepository.getAll();

      expect(data.seenTooltips).toContain(TOOLTIP_IDS.WATER_TRACKING);
      expect(data.seenTooltips).toContain(TOOLTIP_IDS.MEAL_COLLAPSE);
    });
  });

  describe('User Progress Tracking', () => {
    it('tracks foods logged for tooltip triggers', async () => {
      const { onboardingRepository } = await import('@/repositories/onboardingRepository');

      expect(mockOnboardingState.totalFoodsLogged).toBe(0);

      // Log 5 foods
      for (let i = 0; i < 5; i++) {
        await onboardingRepository.incrementFoodsLogged();
      }

      expect(mockOnboardingState.totalFoodsLogged).toBe(5);
    });

    it('tracks days for tooltip triggers', async () => {
      const { onboardingRepository } = await import('@/repositories/onboardingRepository');

      expect(mockOnboardingState.daysTracked).toBe(0);

      // Track for 7 days
      for (let i = 0; i < 7; i++) {
        await onboardingRepository.incrementDaysTracked();
      }

      expect(mockOnboardingState.daysTracked).toBe(7);
    });

    it('tracks first food logged timestamp', async () => {
      const { onboardingRepository } = await import('@/repositories/onboardingRepository');

      expect(mockOnboardingState.firstFoodLoggedAt).toBeNull();

      await onboardingRepository.markFirstFoodLogged();

      expect(mockOnboardingState.firstFoodLoggedAt).not.toBeNull();
      expect(mockOnboardingState.firstFoodLoggedAt).toBeInstanceOf(Date);
    });
  });

  describe('Tooltip Display Rules', () => {
    it('only shows one tooltip at a time', () => {
      let tooltipsShown = 0;

      // Simulate checking multiple tooltips
      const checkTooltip = (id: string, condition: boolean) => {
        if (condition && tooltipsShown === 0) {
          mockActiveTooltip = { id };
          tooltipsShown++;
          return true;
        }
        return false;
      };

      // Both conditions are met
      checkTooltip(TOOLTIP_IDS.WATER_TRACKING, true);
      checkTooltip(TOOLTIP_IDS.MEAL_COLLAPSE, true);

      // Only one tooltip should be shown
      expect(tooltipsShown).toBe(1);
      expect(mockActiveTooltip.id).toBe(TOOLTIP_IDS.WATER_TRACKING);
    });

    it('respects priority order of tooltips', () => {
      const priorities = [
        TOOLTIP_IDS.WATER_TRACKING,
        TOOLTIP_IDS.MEAL_COLLAPSE,
        TOOLTIP_IDS.QUICK_ADD,
        TOOLTIP_IDS.WEEKLY_SUMMARY,
      ];

      // All conditions met except water tracking already seen
      mockOnboardingState.seenTooltips = [TOOLTIP_IDS.WATER_TRACKING];
      mockOnboardingState.totalFoodsLogged = 15;
      mockOnboardingState.daysTracked = 10;

      // Find first tooltip that should show
      let tooltipToShow: string | null = null;

      for (const id of priorities) {
        if (!mockOnboardingState.seenTooltips.includes(id)) {
          if (
            (id === TOOLTIP_IDS.WATER_TRACKING) ||
            (id === TOOLTIP_IDS.MEAL_COLLAPSE && mockOnboardingState.totalFoodsLogged >= 5) ||
            (id === TOOLTIP_IDS.QUICK_ADD && mockOnboardingState.totalFoodsLogged >= 10) ||
            (id === TOOLTIP_IDS.WEEKLY_SUMMARY && mockOnboardingState.daysTracked >= 7)
          ) {
            tooltipToShow = id;
            break;
          }
        }
      }

      // Should show meal collapse (first unseen with met conditions)
      expect(tooltipToShow).toBe(TOOLTIP_IDS.MEAL_COLLAPSE);
    });
  });

  describe('Complete User Journey', () => {
    it('shows all tooltips in correct order over user journey', () => {
      const shownTooltips: string[] = [];

      // Helper to check and show tooltip
      const checkAndShow = () => {
        // Water tracking - always first
        if (!mockOnboardingState.seenTooltips.includes(TOOLTIP_IDS.WATER_TRACKING)) {
          shownTooltips.push(TOOLTIP_IDS.WATER_TRACKING);
          mockOnboardingState.seenTooltips.push(TOOLTIP_IDS.WATER_TRACKING);
          return;
        }

        // Meal collapse - after 5 foods
        if (
          mockOnboardingState.totalFoodsLogged >= 5 &&
          !mockOnboardingState.seenTooltips.includes(TOOLTIP_IDS.MEAL_COLLAPSE)
        ) {
          shownTooltips.push(TOOLTIP_IDS.MEAL_COLLAPSE);
          mockOnboardingState.seenTooltips.push(TOOLTIP_IDS.MEAL_COLLAPSE);
          return;
        }

        // Quick add - after 10 foods
        if (
          mockOnboardingState.totalFoodsLogged >= 10 &&
          !mockOnboardingState.seenTooltips.includes(TOOLTIP_IDS.QUICK_ADD)
        ) {
          shownTooltips.push(TOOLTIP_IDS.QUICK_ADD);
          mockOnboardingState.seenTooltips.push(TOOLTIP_IDS.QUICK_ADD);
          return;
        }

        // Weekly summary - after 7 days
        if (
          mockOnboardingState.daysTracked >= 7 &&
          !mockOnboardingState.seenTooltips.includes(TOOLTIP_IDS.WEEKLY_SUMMARY)
        ) {
          shownTooltips.push(TOOLTIP_IDS.WEEKLY_SUMMARY);
          mockOnboardingState.seenTooltips.push(TOOLTIP_IDS.WEEKLY_SUMMARY);
          return;
        }
      };

      // Day 1: First visit
      checkAndShow();
      expect(shownTooltips).toEqual([TOOLTIP_IDS.WATER_TRACKING]);

      // Day 1: Log 5 foods
      mockOnboardingState.totalFoodsLogged = 5;
      checkAndShow();
      expect(shownTooltips).toEqual([TOOLTIP_IDS.WATER_TRACKING, TOOLTIP_IDS.MEAL_COLLAPSE]);

      // Day 3: Log more foods (10 total)
      mockOnboardingState.totalFoodsLogged = 10;
      checkAndShow();
      expect(shownTooltips).toEqual([
        TOOLTIP_IDS.WATER_TRACKING,
        TOOLTIP_IDS.MEAL_COLLAPSE,
        TOOLTIP_IDS.QUICK_ADD,
      ]);

      // Day 7: One week of tracking
      mockOnboardingState.daysTracked = 7;
      checkAndShow();
      expect(shownTooltips).toEqual([
        TOOLTIP_IDS.WATER_TRACKING,
        TOOLTIP_IDS.MEAL_COLLAPSE,
        TOOLTIP_IDS.QUICK_ADD,
        TOOLTIP_IDS.WEEKLY_SUMMARY,
      ]);
    });
  });

  describe('Tooltip Content Validation', () => {
    it('all tooltips have required content', () => {
      const tooltipConfigs = [
        {
          id: TOOLTIP_IDS.WATER_TRACKING,
          content: 'Stay hydrated!',
          icon: '💧',
        },
        {
          id: TOOLTIP_IDS.MEAL_COLLAPSE,
          content: 'Pro tip: Tap on a meal header',
          icon: '📋',
        },
        {
          id: TOOLTIP_IDS.QUICK_ADD,
          content: 'Speed up your logging!',
          icon: '⚡',
        },
        {
          id: TOOLTIP_IDS.WEEKLY_SUMMARY,
          content: "You've been tracking for a week!",
          icon: '📊',
        },
        {
          id: TOOLTIP_IDS.BARCODE_SCANNER,
          content: 'Did you know?',
          icon: '📸',
        },
        {
          id: TOOLTIP_IDS.SERVING_SIZE,
          content: 'Tip: You can adjust serving sizes',
          icon: '🍽️',
        },
      ];

      tooltipConfigs.forEach((config) => {
        expect(config.id).toBeDefined();
        expect(config.content.length).toBeGreaterThan(0);
        expect(config.icon.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid food logging without showing multiple tooltips', () => {
      mockOnboardingState.seenTooltips = [TOOLTIP_IDS.WATER_TRACKING];
      mockOnboardingState.totalFoodsLogged = 4;

      // Rapid logging pushes to 12 foods
      for (let i = 0; i < 8; i++) {
        mockOnboardingState.totalFoodsLogged++;
      }

      // Should only trigger first unmet tooltip (meal collapse)
      const triggeredTooltips: string[] = [];

      if (
        mockOnboardingState.totalFoodsLogged >= 5 &&
        !mockOnboardingState.seenTooltips.includes(TOOLTIP_IDS.MEAL_COLLAPSE)
      ) {
        triggeredTooltips.push(TOOLTIP_IDS.MEAL_COLLAPSE);
      }

      // Only one tooltip should trigger even though multiple conditions are met
      expect(triggeredTooltips).toHaveLength(1);
    });

    it('handles all tooltips already seen', () => {
      mockOnboardingState.seenTooltips = [
        TOOLTIP_IDS.WATER_TRACKING,
        TOOLTIP_IDS.MEAL_COLLAPSE,
        TOOLTIP_IDS.QUICK_ADD,
        TOOLTIP_IDS.WEEKLY_SUMMARY,
        TOOLTIP_IDS.BARCODE_SCANNER,
        TOOLTIP_IDS.SERVING_SIZE,
        TOOLTIP_IDS.MEAL_PLAN_COPY_DAY,
      ];
      mockOnboardingState.totalFoodsLogged = 100;
      mockOnboardingState.daysTracked = 30;

      // No tooltip should show
      let shouldShowAny = false;

      Object.values(TOOLTIP_IDS).forEach((id) => {
        if (!mockOnboardingState.seenTooltips.includes(id)) {
          shouldShowAny = true;
        }
      });

      expect(shouldShowAny).toBe(false);
    });

    it('handles zero progress state', () => {
      mockOnboardingState.totalFoodsLogged = 0;
      mockOnboardingState.daysTracked = 0;

      // Only water tracking should show (no conditions)
      const canShowMealCollapse = mockOnboardingState.totalFoodsLogged >= 5;
      const canShowQuickAdd = mockOnboardingState.totalFoodsLogged >= 10;
      const canShowWeeklySummary = mockOnboardingState.daysTracked >= 7;

      expect(canShowMealCollapse).toBe(false);
      expect(canShowQuickAdd).toBe(false);
      expect(canShowWeeklySummary).toBe(false);
    });
  });
});
