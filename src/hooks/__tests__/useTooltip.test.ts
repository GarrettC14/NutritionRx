/**
 * useTooltip & createTooltip Tests
 *
 * Tests that the hook correctly delegates to useTooltipContext,
 * derives isActive from activeTooltip, and that createTooltip
 * builds configs with correct defaults and overrides.
 */

import { renderHook } from '@testing-library/react-native';

// ---- Mock state ----

const mockShowTooltip = jest.fn();
const mockShowTooltipIfNotSeen = jest.fn();
const mockHideTooltip = jest.fn();
const mockHasSeen = jest.fn();
const mockMarkSeen = jest.fn();

let mockActiveTooltip: { id: string; content: string } | null = null;

jest.mock('@/contexts/TooltipContext', () => ({
  useTooltipContext: jest.fn(() => ({
    activeTooltip: mockActiveTooltip,
    showTooltip: mockShowTooltip,
    showTooltipIfNotSeen: mockShowTooltipIfNotSeen,
    hideTooltip: mockHideTooltip,
    hasSeen: mockHasSeen,
    markSeen: mockMarkSeen,
  })),
}));

// Import after mocks are defined
import { useTooltip, createTooltip } from '@/hooks/useTooltip';

describe('useTooltip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveTooltip = null;
  });

  // ============================================================
  // Delegation to context
  // ============================================================

  describe('context delegation', () => {
    it('delegates showTooltip to context', () => {
      const { result } = renderHook(() => useTooltip());
      const config = { id: 'discovery.quickAdd' as any, content: 'test' };

      result.current.showTooltip(config);

      expect(mockShowTooltip).toHaveBeenCalledTimes(1);
      expect(mockShowTooltip).toHaveBeenCalledWith(config);
    });

    it('delegates showTooltipIfNotSeen to context', () => {
      const { result } = renderHook(() => useTooltip());
      const config = { id: 'discovery.quickAdd' as any, content: 'test' };

      result.current.showTooltipIfNotSeen(config);

      expect(mockShowTooltipIfNotSeen).toHaveBeenCalledTimes(1);
      expect(mockShowTooltipIfNotSeen).toHaveBeenCalledWith(config);
    });

    it('delegates hideTooltip to context', () => {
      const { result } = renderHook(() => useTooltip());

      result.current.hideTooltip();

      expect(mockHideTooltip).toHaveBeenCalledTimes(1);
    });

    it('delegates hasSeen to context', () => {
      mockHasSeen.mockReturnValue(true);
      const { result } = renderHook(() => useTooltip());

      const seen = result.current.hasSeen('discovery.quickAdd' as any);

      expect(mockHasSeen).toHaveBeenCalledWith('discovery.quickAdd');
      expect(seen).toBe(true);
    });

    it('delegates markSeen to context', () => {
      const { result } = renderHook(() => useTooltip());

      result.current.markSeen('discovery.quickAdd' as any);

      expect(mockMarkSeen).toHaveBeenCalledTimes(1);
      expect(mockMarkSeen).toHaveBeenCalledWith('discovery.quickAdd');
    });
  });

  // ============================================================
  // isActive derivation
  // ============================================================

  describe('isActive', () => {
    it('returns isActive=true when activeTooltip is a non-null object', () => {
      mockActiveTooltip = { id: 'discovery.quickAdd', content: 'tip' };
      const { result } = renderHook(() => useTooltip());

      expect(result.current.isActive).toBe(true);
    });

    it('returns isActive=false when activeTooltip is null', () => {
      mockActiveTooltip = null;
      const { result } = renderHook(() => useTooltip());

      expect(result.current.isActive).toBe(false);
    });
  });
});

// ============================================================
// createTooltip
// ============================================================

describe('createTooltip', () => {
  it('creates a tooltip config with default position of center', () => {
    const config = createTooltip('discovery.quickAdd' as any, 'Quick add tip');

    expect(config).toEqual({
      id: 'discovery.quickAdd',
      content: 'Quick add tip',
      icon: undefined,
      position: 'center',
      actions: undefined,
    });
  });

  it('creates a tooltip config with custom icon', () => {
    const config = createTooltip('discovery.quickAdd' as any, 'tip', {
      icon: 'star-outline',
    });

    expect(config.icon).toBe('star-outline');
    expect(config.position).toBe('center');
  });

  it('creates a tooltip config with custom position', () => {
    const config = createTooltip('discovery.quickAdd' as any, 'tip', {
      position: 'top',
    });

    expect(config.position).toBe('top');
  });

  it('creates a tooltip config with bottom position', () => {
    const config = createTooltip('discovery.quickAdd' as any, 'tip', {
      position: 'bottom',
    });

    expect(config.position).toBe('bottom');
  });

  it('creates a tooltip config with actions', () => {
    const mockAction = { label: 'Got it', onPress: jest.fn(), primary: true };
    const config = createTooltip('discovery.quickAdd' as any, 'tip', {
      actions: [mockAction],
    });

    expect(config.actions).toEqual([mockAction]);
  });

  it('creates a tooltip config with all options', () => {
    const mockAction = { label: 'Dismiss', onPress: jest.fn() };
    const config = createTooltip('discovery.quickAdd' as any, 'Full config', {
      icon: 'bulb-outline',
      position: 'top',
      actions: [mockAction],
    });

    expect(config).toEqual({
      id: 'discovery.quickAdd',
      content: 'Full config',
      icon: 'bulb-outline',
      position: 'top',
      actions: [mockAction],
    });
  });
});
