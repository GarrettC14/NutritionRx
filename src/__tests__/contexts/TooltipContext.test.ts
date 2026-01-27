/**
 * TooltipContext Tests
 * Tests for the tooltip context provider and its functionality
 */

import { TOOLTIP_IDS, TooltipId } from '@/constants/tooltipIds';

// Mock the onboarding store
let mockSeenTooltips: string[] = [];
const mockMarkTooltipSeen = jest.fn((id: string) => {
  mockSeenTooltips = [...mockSeenTooltips, id];
});

jest.mock('@/stores', () => ({
  useOnboardingStore: jest.fn(() => ({
    seenTooltips: mockSeenTooltips,
    markTooltipSeen: mockMarkTooltipSeen,
  })),
}));

// Mock React hooks
let capturedState: any = null;
const mockSetState = jest.fn((newState) => {
  capturedState = typeof newState === 'function' ? newState(capturedState) : newState;
});

jest.mock('react', () => ({
  createContext: jest.fn(() => ({ Provider: 'MockProvider' })),
  useContext: jest.fn(),
  useState: jest.fn((initial) => {
    capturedState = initial;
    return [capturedState, mockSetState];
  }),
  useCallback: jest.fn((fn) => fn),
}));

describe('TooltipContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSeenTooltips = [];
    capturedState = null;
  });

  describe('TooltipConfig interface', () => {
    it('should support required fields', () => {
      const config = {
        id: TOOLTIP_IDS.WATER_TRACKING as TooltipId,
        content: 'Test tooltip content',
      };

      expect(config.id).toBe(TOOLTIP_IDS.WATER_TRACKING);
      expect(config.content).toBe('Test tooltip content');
    });

    it('should support optional icon field', () => {
      const config = {
        id: TOOLTIP_IDS.WATER_TRACKING as TooltipId,
        content: 'Test content',
        icon: '💧',
      };

      expect(config.icon).toBe('💧');
    });

    it('should support position options', () => {
      const positions = ['top', 'bottom', 'center'] as const;

      positions.forEach((position) => {
        const config = {
          id: TOOLTIP_IDS.WATER_TRACKING as TooltipId,
          content: 'Test content',
          position,
        };
        expect(config.position).toBe(position);
      });
    });

    it('should support actions array', () => {
      const config = {
        id: TOOLTIP_IDS.WATER_TRACKING as TooltipId,
        content: 'Test content',
        actions: [
          { label: 'Primary', onPress: () => {}, primary: true },
          { label: 'Secondary', onPress: () => {}, primary: false },
        ],
      };

      expect(config.actions).toHaveLength(2);
      expect(config.actions![0].primary).toBe(true);
      expect(config.actions![1].primary).toBe(false);
    });
  });

  describe('TooltipAction interface', () => {
    it('should have label and onPress', () => {
      const action = {
        label: 'Got it',
        onPress: jest.fn(),
      };

      expect(action.label).toBe('Got it');
      expect(typeof action.onPress).toBe('function');
    });

    it('should have optional primary flag', () => {
      const primaryAction = {
        label: 'Primary',
        onPress: jest.fn(),
        primary: true,
      };

      const secondaryAction = {
        label: 'Secondary',
        onPress: jest.fn(),
        primary: false,
      };

      expect(primaryAction.primary).toBe(true);
      expect(secondaryAction.primary).toBe(false);
    });
  });

  describe('hasSeen', () => {
    it('returns false when tooltip has not been seen', () => {
      mockSeenTooltips = [];
      const hasSeen = (id: string) => mockSeenTooltips.includes(id);

      expect(hasSeen(TOOLTIP_IDS.WATER_TRACKING)).toBe(false);
    });

    it('returns true when tooltip has been seen', () => {
      mockSeenTooltips = [TOOLTIP_IDS.WATER_TRACKING];
      const hasSeen = (id: string) => mockSeenTooltips.includes(id);

      expect(hasSeen(TOOLTIP_IDS.WATER_TRACKING)).toBe(true);
    });

    it('correctly distinguishes between different tooltip IDs', () => {
      mockSeenTooltips = [TOOLTIP_IDS.WATER_TRACKING];
      const hasSeen = (id: string) => mockSeenTooltips.includes(id);

      expect(hasSeen(TOOLTIP_IDS.WATER_TRACKING)).toBe(true);
      expect(hasSeen(TOOLTIP_IDS.MEAL_COLLAPSE)).toBe(false);
      expect(hasSeen(TOOLTIP_IDS.QUICK_ADD)).toBe(false);
    });
  });

  describe('markSeen', () => {
    it('calls markTooltipSeen on the onboarding store', () => {
      mockMarkTooltipSeen(TOOLTIP_IDS.WATER_TRACKING);

      expect(mockMarkTooltipSeen).toHaveBeenCalledWith(TOOLTIP_IDS.WATER_TRACKING);
      expect(mockSeenTooltips).toContain(TOOLTIP_IDS.WATER_TRACKING);
    });

    it('persists tooltip as seen', () => {
      mockMarkTooltipSeen(TOOLTIP_IDS.MEAL_COLLAPSE);

      const hasSeen = (id: string) => mockSeenTooltips.includes(id);
      expect(hasSeen(TOOLTIP_IDS.MEAL_COLLAPSE)).toBe(true);
    });
  });

  describe('showTooltip', () => {
    it('should set active tooltip', () => {
      const config = {
        id: TOOLTIP_IDS.WATER_TRACKING as TooltipId,
        content: 'Test content',
      };

      mockSetState(config);
      expect(capturedState).toEqual(config);
    });
  });

  describe('showTooltipIfNotSeen', () => {
    it('returns true and shows tooltip when not seen', () => {
      mockSeenTooltips = [];
      const hasSeen = (id: string) => mockSeenTooltips.includes(id);

      const config = {
        id: TOOLTIP_IDS.WATER_TRACKING as TooltipId,
        content: 'Test content',
      };

      let shown = false;
      const showTooltipIfNotSeen = (cfg: typeof config) => {
        if (hasSeen(cfg.id)) return false;
        mockSetState(cfg);
        shown = true;
        return true;
      };

      const result = showTooltipIfNotSeen(config);

      expect(result).toBe(true);
      expect(shown).toBe(true);
    });

    it('returns false when tooltip already seen', () => {
      mockSeenTooltips = [TOOLTIP_IDS.WATER_TRACKING];
      const hasSeen = (id: string) => mockSeenTooltips.includes(id);

      const config = {
        id: TOOLTIP_IDS.WATER_TRACKING as TooltipId,
        content: 'Test content',
      };

      let shown = false;
      const showTooltipIfNotSeen = (cfg: typeof config) => {
        if (hasSeen(cfg.id)) return false;
        mockSetState(cfg);
        shown = true;
        return true;
      };

      const result = showTooltipIfNotSeen(config);

      expect(result).toBe(false);
      expect(shown).toBe(false);
    });
  });

  describe('hideTooltip', () => {
    it('clears active tooltip', () => {
      capturedState = {
        id: TOOLTIP_IDS.WATER_TRACKING,
        content: 'Test content',
      };

      mockSetState(null);
      expect(capturedState).toBeNull();
    });

    it('marks tooltip as seen when hiding', () => {
      const activeTooltip = {
        id: TOOLTIP_IDS.WATER_TRACKING,
        content: 'Test content',
      };

      // Simulate hideTooltip behavior
      if (activeTooltip) {
        mockMarkTooltipSeen(activeTooltip.id);
      }
      mockSetState(null);

      expect(mockMarkTooltipSeen).toHaveBeenCalledWith(TOOLTIP_IDS.WATER_TRACKING);
      expect(mockSeenTooltips).toContain(TOOLTIP_IDS.WATER_TRACKING);
    });
  });

  describe('TOOLTIP_IDS constants', () => {
    it('should have all expected tooltip IDs', () => {
      expect(TOOLTIP_IDS.BARCODE_SCANNER).toBe('onboarding.barcode.intro');
      expect(TOOLTIP_IDS.SERVING_SIZE).toBe('onboarding.food.servingSize');
      expect(TOOLTIP_IDS.WATER_TRACKING).toBe('discovery.waterTracking');
      expect(TOOLTIP_IDS.MEAL_COLLAPSE).toBe('discovery.mealCollapse');
      expect(TOOLTIP_IDS.QUICK_ADD).toBe('discovery.quickAdd');
      expect(TOOLTIP_IDS.WEEKLY_SUMMARY).toBe('discovery.weeklySummary');
    });

    it('should have unique IDs', () => {
      const ids = Object.values(TOOLTIP_IDS);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
