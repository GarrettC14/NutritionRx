/**
 * useRouter Hook Tests
 *
 * Tests the guarded useRouter hook that wraps expo-router's useRouter
 * with a 500ms navigation cooldown to prevent double-tap navigation.
 *
 * Note: The hook uses a module-level `lastNavTime` variable that persists
 * across tests. We manage this by controlling Date.now() — each test
 * group advances the clock well past 500ms from any prior navigation so
 * the cooldown is never inherited between tests.
 */

import { renderHook } from '@testing-library/react-native';

// ---- Mock expo-router ----
const mockExpoRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn(),
  dismiss: jest.fn(),
  dismissAll: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => mockExpoRouter),
}));

import { useRouter } from '../useRouter';

describe('useRouter', () => {
  let dateNowSpy: jest.SpyInstance;
  // Each describe block uses its own time range so the module-level
  // lastNavTime from a prior test never bleeds over (always >500ms gap).
  let currentTime: number;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Ensure Date.now is restored if anything goes wrong
    if (dateNowSpy) dateNowSpy.mockRestore();
  });

  // ============================================================
  // Delegation Tests
  // ============================================================

  describe('delegation to expo-router', () => {
    beforeEach(() => {
      // Time range: 100_000+  (well past any prior lastNavTime)
      currentTime = 100_000;
      dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
    });

    afterEach(() => {
      dateNowSpy.mockRestore();
    });

    it('delegates push to expo-router', () => {
      currentTime = 100_000;
      const { result } = renderHook(() => useRouter());

      result.current.push('/home');

      expect(mockExpoRouter.push).toHaveBeenCalledWith('/home');
    });

    it('delegates replace to expo-router', () => {
      currentTime = 101_000;
      const { result } = renderHook(() => useRouter());

      result.current.replace('/settings');

      expect(mockExpoRouter.replace).toHaveBeenCalledWith('/settings');
    });

    it('delegates navigate to expo-router', () => {
      currentTime = 102_000;
      const { result } = renderHook(() => useRouter());

      result.current.navigate('/profile');

      expect(mockExpoRouter.navigate).toHaveBeenCalledWith('/profile');
    });

    it('passes through back unchanged', () => {
      currentTime = 103_000;
      const { result } = renderHook(() => useRouter());

      result.current.back();

      expect(mockExpoRouter.back).toHaveBeenCalled();
    });

    it('passes through canGoBack unchanged', () => {
      currentTime = 104_000;
      const { result } = renderHook(() => useRouter());

      const canGo = result.current.canGoBack();

      expect(mockExpoRouter.canGoBack).toHaveBeenCalled();
      expect(canGo).toBe(true);
    });
  });

  // ============================================================
  // Cooldown Tests
  // ============================================================

  describe('navigation cooldown', () => {
    beforeEach(() => {
      currentTime = 200_000;
      dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
    });

    afterEach(() => {
      dateNowSpy.mockRestore();
    });

    it('blocks push within 500ms cooldown', () => {
      currentTime = 200_000;
      const { result } = renderHook(() => useRouter());

      // First push - allowed
      result.current.push('/page1');
      expect(mockExpoRouter.push).toHaveBeenCalledTimes(1);

      // Second push at 200ms later - blocked
      currentTime = 200_200;
      result.current.push('/page2');
      expect(mockExpoRouter.push).toHaveBeenCalledTimes(1);
    });

    it('blocks replace within 500ms cooldown', () => {
      currentTime = 201_000;
      const { result } = renderHook(() => useRouter());

      result.current.replace('/page1');
      expect(mockExpoRouter.replace).toHaveBeenCalledTimes(1);

      currentTime = 201_300;
      result.current.replace('/page2');
      expect(mockExpoRouter.replace).toHaveBeenCalledTimes(1);
    });

    it('blocks navigate within 500ms cooldown', () => {
      currentTime = 202_000;
      const { result } = renderHook(() => useRouter());

      result.current.navigate('/page1');
      expect(mockExpoRouter.navigate).toHaveBeenCalledTimes(1);

      currentTime = 202_499;
      result.current.navigate('/page2');
      expect(mockExpoRouter.navigate).toHaveBeenCalledTimes(1);
    });

    it('allows navigation again after exactly 500ms', () => {
      currentTime = 203_000;
      const { result } = renderHook(() => useRouter());

      result.current.push('/page1');
      expect(mockExpoRouter.push).toHaveBeenCalledTimes(1);

      // Exactly 500ms later - allowed
      currentTime = 203_500;
      result.current.push('/page2');
      expect(mockExpoRouter.push).toHaveBeenCalledTimes(2);
      expect(mockExpoRouter.push).toHaveBeenLastCalledWith('/page2');
    });

    it('allows navigation well after cooldown', () => {
      currentTime = 204_000;
      const { result } = renderHook(() => useRouter());

      result.current.push('/page1');
      expect(mockExpoRouter.push).toHaveBeenCalledTimes(1);

      // 2 seconds later
      currentTime = 206_000;
      result.current.push('/page2');
      expect(mockExpoRouter.push).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================
  // Cross-method Cooldown Tests
  // ============================================================

  describe('cooldown shared across methods', () => {
    beforeEach(() => {
      currentTime = 300_000;
      dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
    });

    afterEach(() => {
      dateNowSpy.mockRestore();
    });

    it('push blocks subsequent replace within cooldown', () => {
      currentTime = 300_000;
      const { result } = renderHook(() => useRouter());

      result.current.push('/page1');
      expect(mockExpoRouter.push).toHaveBeenCalledTimes(1);

      currentTime = 300_200;
      result.current.replace('/page2');
      expect(mockExpoRouter.replace).toHaveBeenCalledTimes(0);
    });

    it('replace blocks subsequent navigate within cooldown', () => {
      currentTime = 301_000;
      const { result } = renderHook(() => useRouter());

      result.current.replace('/page1');
      expect(mockExpoRouter.replace).toHaveBeenCalledTimes(1);

      currentTime = 301_100;
      result.current.navigate('/page2');
      expect(mockExpoRouter.navigate).toHaveBeenCalledTimes(0);
    });

    it('navigate blocks subsequent push within cooldown', () => {
      currentTime = 302_000;
      const { result } = renderHook(() => useRouter());

      result.current.navigate('/page1');
      expect(mockExpoRouter.navigate).toHaveBeenCalledTimes(1);

      currentTime = 302_400;
      result.current.push('/page2');
      expect(mockExpoRouter.push).toHaveBeenCalledTimes(0);
    });

    it('cross-method cooldown resets properly after 500ms', () => {
      currentTime = 303_000;
      const { result } = renderHook(() => useRouter());

      // push at 303_000
      result.current.push('/page1');
      expect(mockExpoRouter.push).toHaveBeenCalledTimes(1);

      // navigate at 303_200 (blocked)
      currentTime = 303_200;
      result.current.navigate('/page2');
      expect(mockExpoRouter.navigate).toHaveBeenCalledTimes(0);

      // replace at 303_500 (allowed - 500ms after last successful nav at 303_000)
      currentTime = 303_500;
      result.current.replace('/page3');
      expect(mockExpoRouter.replace).toHaveBeenCalledTimes(1);
      expect(mockExpoRouter.replace).toHaveBeenCalledWith('/page3');
    });
  });
});
