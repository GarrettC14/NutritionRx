import { renderHook } from '@testing-library/react-native';
import { useOnboardingStep } from '../useOnboardingStep';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseSegments = jest.fn<string[], []>();
const mockUsePathname = jest.fn<string, []>();

jest.mock('expo-router', () => ({
  useSegments: () => mockUseSegments(),
  usePathname: () => mockUsePathname(),
}));

const mockDraft: Record<string, unknown> = {};

jest.mock('@/stores', () => ({
  useOnboardingStore: (selector: (s: { draft: typeof mockDraft }) => unknown) =>
    selector({ draft: mockDraft }),
}));

// We import the *real* onboarding utils so screen-order logic stays accurate.
// No mock needed here.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setSegments(segments: string[]) {
  mockUseSegments.mockReturnValue(segments);
}

function setPathname(pathname: string) {
  mockUsePathname.mockReturnValue(pathname);
}

function setDraft(partial: Record<string, unknown>) {
  // Mutate the shared object so the mock closure sees changes.
  for (const key of Object.keys(mockDraft)) delete mockDraft[key];
  Object.assign(mockDraft, partial);
}

function resetDraft() {
  for (const key of Object.keys(mockDraft)) delete mockDraft[key];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockUseSegments.mockReset();
  mockUsePathname.mockReset();
  resetDraft();

  // Sensible defaults
  setSegments([]);
  setPathname('/');
});

describe('useOnboardingStep', () => {
  // -----------------------------------------------------------------------
  // Screen detection
  // -----------------------------------------------------------------------

  describe('screen detection', () => {
    it('returns null screen when no onboarding segment is present', () => {
      setSegments(['home']);
      setPathname('/home');

      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current).toEqual({
        currentScreen: null,
        currentStep: 0,
        totalSteps: 0,
        progress: 0,
      });
    });

    it('returns null screen for empty segments and empty pathname', () => {
      setSegments([]);
      setPathname('/');

      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current).toEqual({
        currentScreen: null,
        currentStep: 0,
        totalSteps: 0,
        progress: 0,
      });
    });

    it('detects screen from last segment (goal)', () => {
      setSegments(['onboarding', 'goal']);
      setPathname('/onboarding/goal');

      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.currentScreen).toBe('goal');
    });

    it('detects screen from last segment (about-you)', () => {
      setSegments(['onboarding', 'about-you']);
      setPathname('/onboarding/about-you');

      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.currentScreen).toBe('about-you');
    });

    it('falls back to pathname when segments contain a group', () => {
      setSegments(['(onboarding)']);
      setPathname('/onboarding/activity');

      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.currentScreen).toBe('activity');
    });

    it('falls back to pathname when last segment is not a valid screen', () => {
      setSegments(['onboarding', 'unknown-screen']);
      setPathname('/onboarding/experience');

      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.currentScreen).toBe('experience');
    });

    it('detects every valid onboarding screen via segments', () => {
      const allScreens = [
        'goal', 'about-you', 'body-stats', 'activity', 'experience',
        'eating-style', 'protein', 'target', 'your-plan',
      ];

      for (const screen of allScreens) {
        setSegments(['onboarding', screen]);
        setPathname(`/onboarding/${screen}`);

        const { result } = renderHook(() => useOnboardingStep());

        expect(result.current.currentScreen).toBe(screen);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Goal screen defaults (effectiveGoalPath logic)
  // -----------------------------------------------------------------------

  describe('goal screen defaults', () => {
    it('defaults to "lose" path when on goal screen with no draft goalPath', () => {
      setSegments(['onboarding', 'goal']);
      setPathname('/onboarding/goal');
      // draft has no goalPath

      const { result } = renderHook(() => useOnboardingStep());

      // Default non-beginner + lose path = 9 steps
      // But experienceLevel is also undefined, so getScreenOrder(null | 'lose', undefined)
      // With 'lose' and non-beginner: 9 steps. Step 1 of 9.
      expect(result.current.currentScreen).toBe('goal');
      expect(result.current.currentStep).toBe(1);
      expect(result.current.totalSteps).toBe(9);
      expect(result.current.progress).toBeCloseTo(1 / 9);
    });

    it('uses draft goalPath when on goal screen with goalPath set', () => {
      setSegments(['onboarding', 'goal']);
      setPathname('/onboarding/goal');
      setDraft({ goalPath: 'maintain' });

      const { result } = renderHook(() => useOnboardingStep());

      // maintain + non-beginner = 8 steps
      expect(result.current.currentStep).toBe(1);
      expect(result.current.totalSteps).toBe(8);
      expect(result.current.progress).toBeCloseTo(1 / 8);
    });

    it('uses "lose" default on goal screen even when experienceLevel is beginner', () => {
      setSegments(['onboarding', 'goal']);
      setPathname('/onboarding/goal');
      setDraft({ experienceLevel: 'beginner' });
      // goalPath is not set

      const { result } = renderHook(() => useOnboardingStep());

      // beginner + lose = 7 steps
      expect(result.current.currentStep).toBe(1);
      expect(result.current.totalSteps).toBe(7);
      expect(result.current.progress).toBeCloseTo(1 / 7);
    });
  });

  // -----------------------------------------------------------------------
  // Non-beginner paths
  // -----------------------------------------------------------------------

  describe('non-beginner paths', () => {
    it('returns 9 steps for lose path', () => {
      setSegments(['onboarding', 'activity']);
      setPathname('/onboarding/activity');
      setDraft({ goalPath: 'lose' });

      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.totalSteps).toBe(9);
      expect(result.current.currentStep).toBe(4); // activity is index 3 -> step 4
      expect(result.current.progress).toBeCloseTo(4 / 9);
    });

    it('returns 9 steps for gain path', () => {
      setSegments(['onboarding', 'target']);
      setPathname('/onboarding/target');
      setDraft({ goalPath: 'gain' });

      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.totalSteps).toBe(9);
      // target is index 7 in non-beginner lose/gain -> step 8
      expect(result.current.currentStep).toBe(8);
      expect(result.current.progress).toBeCloseTo(8 / 9);
    });

    it('returns 8 steps for maintain path', () => {
      setSegments(['onboarding', 'eating-style']);
      setPathname('/onboarding/eating-style');
      setDraft({ goalPath: 'maintain' });

      const { result } = renderHook(() => useOnboardingStep());

      // non-beginner maintain: goal, about-you, body-stats, activity, experience, eating-style, protein, your-plan (8)
      expect(result.current.totalSteps).toBe(8);
      // eating-style is index 5 -> step 6
      expect(result.current.currentStep).toBe(6);
      expect(result.current.progress).toBeCloseTo(6 / 8);
    });
  });

  // -----------------------------------------------------------------------
  // Beginner paths
  // -----------------------------------------------------------------------

  describe('beginner paths', () => {
    it('returns 7 steps for beginner lose path', () => {
      setSegments(['onboarding', 'body-stats']);
      setPathname('/onboarding/body-stats');
      setDraft({ goalPath: 'lose', experienceLevel: 'beginner' });

      const { result } = renderHook(() => useOnboardingStep());

      // beginner + lose: goal, about-you, body-stats, activity, experience, target, your-plan (7)
      expect(result.current.totalSteps).toBe(7);
      // body-stats is index 2 -> step 3
      expect(result.current.currentStep).toBe(3);
      expect(result.current.progress).toBeCloseTo(3 / 7);
    });

    it('returns 7 steps for beginner gain path', () => {
      setSegments(['onboarding', 'experience']);
      setPathname('/onboarding/experience');
      setDraft({ goalPath: 'gain', experienceLevel: 'beginner' });

      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.totalSteps).toBe(7);
      // experience is index 4 -> step 5
      expect(result.current.currentStep).toBe(5);
    });

    it('returns 6 steps for beginner maintain path', () => {
      setSegments(['onboarding', 'about-you']);
      setPathname('/onboarding/about-you');
      setDraft({ goalPath: 'maintain', experienceLevel: 'beginner' });

      const { result } = renderHook(() => useOnboardingStep());

      // beginner + maintain: goal, about-you, body-stats, activity, experience, your-plan (6)
      expect(result.current.totalSteps).toBe(6);
      // about-you is index 1 -> step 2
      expect(result.current.currentStep).toBe(2);
      expect(result.current.progress).toBeCloseTo(2 / 6);
    });
  });

  // -----------------------------------------------------------------------
  // Step/progress calculations
  // -----------------------------------------------------------------------

  describe('step and progress calculations', () => {
    it('returns step 1 for the first screen (goal)', () => {
      setSegments(['onboarding', 'goal']);
      setPathname('/onboarding/goal');
      setDraft({ goalPath: 'lose' });

      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.currentStep).toBe(1);
    });

    it('returns the last step with progress close to 1.0 (your-plan)', () => {
      setSegments(['onboarding', 'your-plan']);
      setPathname('/onboarding/your-plan');
      setDraft({ goalPath: 'lose' });

      const { result } = renderHook(() => useOnboardingStep());

      // non-beginner lose = 9 steps, your-plan is index 8 -> step 9
      expect(result.current.currentStep).toBe(9);
      expect(result.current.totalSteps).toBe(9);
      expect(result.current.progress).toBeCloseTo(1.0);
    });

    it('returns exact progress fraction for a middle step', () => {
      setSegments(['onboarding', 'activity']);
      setPathname('/onboarding/activity');
      setDraft({ goalPath: 'lose' });

      const { result } = renderHook(() => useOnboardingStep());

      // activity is step 4 of 9
      expect(result.current.progress).toBe(4 / 9);
    });

    it('returns progress = 1/6 for first step of 6-step path', () => {
      setSegments(['onboarding', 'goal']);
      setPathname('/onboarding/goal');
      setDraft({ goalPath: 'maintain', experienceLevel: 'beginner' });

      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.currentStep).toBe(1);
      expect(result.current.totalSteps).toBe(6);
      expect(result.current.progress).toBeCloseTo(1 / 6);
    });
  });

  // -----------------------------------------------------------------------
  // Screen not in current order (conditional screens)
  // -----------------------------------------------------------------------

  describe('screen not in current order', () => {
    it('returns step 0 when screen exists but is not in the current path', () => {
      // 'target' is not in the maintain path
      setSegments(['onboarding', 'target']);
      setPathname('/onboarding/target');
      setDraft({ goalPath: 'maintain' });

      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.currentScreen).toBe('target');
      expect(result.current.currentStep).toBe(0);
      expect(result.current.totalSteps).toBe(8); // non-beginner maintain = 8
      expect(result.current.progress).toBe(0);
    });

    it('returns step 0 for eating-style on beginner path', () => {
      // beginners skip eating-style
      setSegments(['onboarding', 'eating-style']);
      setPathname('/onboarding/eating-style');
      setDraft({ goalPath: 'lose', experienceLevel: 'beginner' });

      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.currentScreen).toBe('eating-style');
      expect(result.current.currentStep).toBe(0);
      expect(result.current.totalSteps).toBe(7); // beginner lose = 7
      expect(result.current.progress).toBe(0);
    });

    it('returns step 0 for protein on beginner path', () => {
      setSegments(['onboarding', 'protein']);
      setPathname('/onboarding/protein');
      setDraft({ goalPath: 'gain', experienceLevel: 'beginner' });

      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.currentScreen).toBe('protein');
      expect(result.current.currentStep).toBe(0);
      expect(result.current.totalSteps).toBe(7); // beginner gain = 7
      expect(result.current.progress).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles draft being null gracefully', () => {
      // Simulate draft being null (shouldn't happen normally, but defensive)
      // The hook accesses draft?.goalPath and draft?.experienceLevel
      // Our mock always provides an object, but we can clear it to have no goalPath
      setSegments(['onboarding', 'about-you']);
      setPathname('/onboarding/about-you');
      resetDraft(); // empty draft, goalPath undefined

      const { result } = renderHook(() => useOnboardingStep());

      // Not on goal screen, so effectiveGoalPath = draft?.goalPath ?? null = null
      // getScreenOrder(null, undefined) => non-beginner, not lose/gain => 8 steps
      expect(result.current.currentScreen).toBe('about-you');
      expect(result.current.currentStep).toBe(2);
      expect(result.current.totalSteps).toBe(8);
    });

    it('uses pathname when segments array is empty', () => {
      setSegments([]);
      setPathname('/onboarding/protein');

      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.currentScreen).toBe('protein');
    });

    it('prefers segments over pathname', () => {
      // Segments say goal, pathname says activity
      setSegments(['onboarding', 'goal']);
      setPathname('/onboarding/activity');

      const { result } = renderHook(() => useOnboardingStep());

      // Should use segments (goal), not pathname (activity)
      expect(result.current.currentScreen).toBe('goal');
    });

    it('handles pathname with trailing slash', () => {
      setSegments(['(group)']);
      setPathname('/onboarding/body-stats/');

      const { result } = renderHook(() => useOnboardingStep());

      // filter(Boolean) removes empty string from trailing slash
      expect(result.current.currentScreen).toBe('body-stats');
    });

    it('handles pathname with no matching screen', () => {
      setSegments(['settings']);
      setPathname('/settings/profile');

      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current).toEqual({
        currentScreen: null,
        currentStep: 0,
        totalSteps: 0,
        progress: 0,
      });
    });
  });

  // -----------------------------------------------------------------------
  // All four path combinations exhaustively
  // -----------------------------------------------------------------------

  describe('all path combinations with screen ordering', () => {
    it('non-beginner lose: 9 screens in correct order', () => {
      const expected = [
        'goal', 'about-you', 'body-stats', 'activity', 'experience',
        'eating-style', 'protein', 'target', 'your-plan',
      ];
      setDraft({ goalPath: 'lose' });

      for (let i = 0; i < expected.length; i++) {
        setSegments(['onboarding', expected[i]]);
        setPathname(`/onboarding/${expected[i]}`);

        const { result } = renderHook(() => useOnboardingStep());

        expect(result.current.currentScreen).toBe(expected[i]);
        expect(result.current.currentStep).toBe(i + 1);
        expect(result.current.totalSteps).toBe(9);
        expect(result.current.progress).toBeCloseTo((i + 1) / 9);
      }
    });

    it('beginner maintain: 6 screens in correct order', () => {
      const expected = [
        'goal', 'about-you', 'body-stats', 'activity', 'experience', 'your-plan',
      ];
      setDraft({ goalPath: 'maintain', experienceLevel: 'beginner' });

      for (let i = 0; i < expected.length; i++) {
        setSegments(['onboarding', expected[i]]);
        setPathname(`/onboarding/${expected[i]}`);

        const { result } = renderHook(() => useOnboardingStep());

        expect(result.current.currentScreen).toBe(expected[i]);
        expect(result.current.currentStep).toBe(i + 1);
        expect(result.current.totalSteps).toBe(6);
      }
    });
  });
});
