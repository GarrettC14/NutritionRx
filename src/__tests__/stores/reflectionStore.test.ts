/**
 * Reflection Store Tests
 * Tests for weekly check-in logic, banner state, reflection submission with
 * transactional SQLite writes, and multi-store coordination.
 */

import { useReflectionStore, isCheckInDue } from '@/stores/reflectionStore';
import { reflectionRepository } from '@/repositories/reflectionRepository';
import { settingsRepository } from '@/repositories';
import { withTransaction } from '@/db/database';
import { recomputeEWMAFromDate } from '@/utils/trendWeight';
import { reviewPromptService } from '@/services/reviewPromptService';
import { useGoalStore } from '@/stores/goalStore';
import { useProfileStore } from '@/stores/profileStore';
import { useWeightStore } from '@/stores/weightStore';
import { useSettingsStore } from '@/stores/settingsStore';

// ---------- Mocks ----------

jest.mock('@/repositories/reflectionRepository', () => ({
  reflectionRepository: {
    getLastReflectionDate: jest.fn(),
    getLatest: jest.fn(),
  },
}));

jest.mock('@/repositories', () => ({
  settingsRepository: {
    get: jest.fn(),
    set: jest.fn(),
    setDailyGoals: jest.fn(),
  },
  weightRepository: {},
}));

jest.mock('@/db/database', () => ({
  withTransaction: jest.fn(),
}));

jest.mock('@/utils/trendWeight', () => ({
  recomputeEWMAFromDate: jest.fn(() => []),
}));

jest.mock('@/services/reviewPromptService', () => ({
  reviewPromptService: {
    onReflectionCompleted: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@/stores/goalStore', () => ({
  useGoalStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@/stores/profileStore', () => ({
  useProfileStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@/stores/weightStore', () => ({
  useWeightStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@/stores/settingsStore', () => ({
  useSettingsStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@/constants/defaults', () => ({
  ACTIVITY_MULTIPLIERS: {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  },
}));

// ---------- Helpers ----------

const mockReflectionRepo = reflectionRepository as jest.Mocked<typeof reflectionRepository>;
const mockSettingsRepo = settingsRepository as jest.Mocked<typeof settingsRepository>;
const mockWithTransaction = withTransaction as jest.Mock;
const mockRecomputeEWMA = recomputeEWMAFromDate as jest.Mock;
const mockReviewPrompt = reviewPromptService as jest.Mocked<typeof reviewPromptService>;
const mockGoalStore = useGoalStore as unknown as { getState: jest.Mock };
const mockProfileStore = useProfileStore as unknown as { getState: jest.Mock };
const mockWeightStore = useWeightStore as unknown as { getState: jest.Mock };
const mockSettingsStore = useSettingsStore as unknown as { getState: jest.Mock };

/** Default goal fixture */
const makeGoal = (overrides?: Record<string, unknown>) => ({
  id: 'goal-1',
  type: 'lose' as const,
  targetWeightKg: 75,
  targetRatePercent: 0.75,
  startDate: '2025-01-01',
  startWeightKg: 85,
  initialTdeeEstimate: 2500,
  initialTargetCalories: 2000,
  initialProteinG: 150,
  initialCarbsG: 200,
  initialFatG: 67,
  currentTdeeEstimate: 2500,
  currentTargetCalories: 2000,
  currentProteinG: 150,
  currentCarbsG: 200,
  currentFatG: 67,
  planningMode: 'rate' as const,
  eatingStyle: 'flexible' as const,
  proteinPriority: 'standard' as const,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/** Default profile fixture */
const makeProfile = (overrides?: Record<string, unknown>) => ({
  id: 'profile-1',
  sex: 'male' as const,
  dateOfBirth: new Date('1990-06-15'),
  heightCm: 180,
  activityLevel: 'moderately_active' as const,
  experienceLevel: 'intermediate' as const,
  eatingStyle: 'flexible' as const,
  proteinPriority: 'standard' as const,
  hasCompletedOnboarding: true,
  onboardingSkipped: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/** Reset the Zustand store to initial state between tests */
function resetStore() {
  useReflectionStore.setState({
    lastReflectionDate: null,
    daysSinceLastReflection: null,
    shouldShowBanner: false,
    bannerDismissCount: 0,
    isInitialized: false,
    isReflecting: false,
    inputWeightKg: null,
    selectedSentiment: null,
    previewCalories: null,
    previewProteinG: null,
    previewCarbsG: null,
    previewFatG: null,
    hasChanges: false,
    isSubmitting: false,
    submitError: null,
  });
}

/** Configure all mock stores with reasonable defaults */
function setupDefaultMocks() {
  const goal = makeGoal();
  const profile = makeProfile();

  mockGoalStore.getState.mockReturnValue({
    activeGoal: goal,
    currentWeightKg: 82,
    calculateBMR: jest.fn((w, h, a, s) => {
      // Mifflin-St Jeor style stub
      return s === 'male' ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
    }),
    calculateTDEE: jest.fn((bmr, _al) => bmr * 1.55),
    calculateTargetCalories: jest.fn((_tdee, _type, _rate, _sex, _w) => 2010),
    calculateMacros: jest.fn((_cal, _w) => ({ protein: 155, carbs: 195, fat: 65 })),
    loadActiveGoal: jest.fn().mockResolvedValue(undefined),
  });

  mockProfileStore.getState.mockReturnValue({ profile });

  mockWeightStore.getState.mockReturnValue({
    loadLatest: jest.fn().mockResolvedValue(undefined),
    loadTrendWeight: jest.fn().mockResolvedValue(undefined),
  });

  mockSettingsStore.getState.mockReturnValue({
    settings: { checkInDay: 1 }, // Monday
    loadSettings: jest.fn().mockResolvedValue(undefined),
  });

  mockReflectionRepo.getLastReflectionDate.mockResolvedValue(null);
  mockReflectionRepo.getLatest.mockResolvedValue(null);
  mockSettingsRepo.get.mockResolvedValue(0);
  mockSettingsRepo.set.mockResolvedValue(undefined);
  mockSettingsRepo.setDailyGoals.mockResolvedValue(undefined);
  mockWithTransaction.mockImplementation(async (cb: (db: unknown) => Promise<void>) => {
    const mockDb = {
      getFirstAsync: jest.fn().mockResolvedValue(null),
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    };
    return cb(mockDb);
  });
  mockRecomputeEWMA.mockReturnValue([]);
  mockReviewPrompt.onReflectionCompleted.mockResolvedValue(undefined);
}

// ---------- Tests ----------

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
  setupDefaultMocks();
});

// =====================================================================
// isCheckInDue (pure function)
// =====================================================================
describe('isCheckInDue', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns true when lastReflectionDate is null', () => {
    expect(isCheckInDue(1, null)).toBe(true);
  });

  it('returns true when lastReflectionDate is before the most recent check-in day', () => {
    // Wednesday 2025-02-12, checkInDay=1 (Monday) -> most recent Monday = 2025-02-10
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 1, 12, 10, 0, 0)); // Wed Feb 12 2025

    // Last reflection was Sun Feb 9 — before Monday Feb 10
    expect(isCheckInDue(1, '2025-02-09T12:00:00.000Z')).toBe(true);
    jest.useRealTimers();
  });

  it('returns false when lastReflectionDate is on the most recent check-in day', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 1, 12, 10, 0, 0)); // Wed Feb 12 2025

    // Last reflection was Monday Feb 10 at noon — on the check-in day
    expect(isCheckInDue(1, '2025-02-10T12:00:00.000Z')).toBe(false);
    jest.useRealTimers();
  });

  it('returns false when lastReflectionDate is after the most recent check-in day', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 1, 12, 10, 0, 0)); // Wed Feb 12 2025

    // Last reflection was Tue Feb 11 — after Monday Feb 10
    expect(isCheckInDue(1, '2025-02-11T18:00:00.000Z')).toBe(false);
    jest.useRealTimers();
  });

  it('returns true when today IS the check-in day and no reflection yet', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 1, 10, 8, 0, 0)); // Mon Feb 10 2025

    // daysSinceCheckIn = 0, lastCheckIn = today midnight
    // Last reflection was last week (Feb 3)
    expect(isCheckInDue(1, '2025-02-03T14:00:00.000Z')).toBe(true);
    jest.useRealTimers();
  });

  it('returns false when today IS the check-in day and reflection was already done today', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 1, 10, 14, 0, 0)); // Mon Feb 10 2025 at 2pm

    // Last reflection was today at 9am
    expect(isCheckInDue(1, '2025-02-10T09:00:00.000Z')).toBe(false);
    jest.useRealTimers();
  });

  it('works with checkInDay=0 (Sunday)', () => {
    jest.useFakeTimers();
    // Tuesday Feb 11 2025
    jest.setSystemTime(new Date(2025, 1, 11, 10, 0, 0));

    // Most recent Sunday = Feb 9. Last reflection was Feb 8 (Sat) -> before Sunday -> due
    expect(isCheckInDue(0, '2025-02-08T12:00:00.000Z')).toBe(true);

    // Last reflection was Feb 9 (Sun) -> on check-in day -> not due
    expect(isCheckInDue(0, '2025-02-09T12:00:00.000Z')).toBe(false);
    jest.useRealTimers();
  });

  it('works with checkInDay=5 (Friday)', () => {
    jest.useFakeTimers();
    // Saturday Feb 15 2025
    jest.setSystemTime(new Date(2025, 1, 15, 10, 0, 0));

    // Most recent Friday = Feb 14. Last reflection was Feb 13 (Thu) -> due
    expect(isCheckInDue(5, '2025-02-13T12:00:00.000Z')).toBe(true);

    // Last reflection was Feb 14 (Fri) -> not due
    expect(isCheckInDue(5, '2025-02-14T12:00:00.000Z')).toBe(false);
    jest.useRealTimers();
  });

  it('works with checkInDay=6 (Saturday) when today is Saturday', () => {
    jest.useFakeTimers();
    // Saturday Feb 15 2025
    jest.setSystemTime(new Date(2025, 1, 15, 10, 0, 0));

    // daysSinceCheckIn = 0 -> lastCheckIn = today midnight
    // Last reflection was last Saturday Feb 8 -> before today -> due
    expect(isCheckInDue(6, '2025-02-08T12:00:00.000Z')).toBe(true);

    // Last reflection was today -> not due
    expect(isCheckInDue(6, '2025-02-15T08:00:00.000Z')).toBe(false);
    jest.useRealTimers();
  });
});

// =====================================================================
// initialize
// =====================================================================
describe('initialize', () => {
  it('sets lastReflectionDate, daysSinceLastReflection, bannerDismissCount, isInitialized', async () => {
    mockReflectionRepo.getLastReflectionDate.mockResolvedValue('2025-02-01T12:00:00.000Z');
    mockSettingsRepo.get.mockResolvedValue(3);

    await useReflectionStore.getState().initialize();
    const state = useReflectionStore.getState();

    expect(state.lastReflectionDate).toBe('2025-02-01T12:00:00.000Z');
    expect(state.daysSinceLastReflection).toBeGreaterThanOrEqual(0);
    expect(state.bannerDismissCount).toBe(3);
    expect(state.isInitialized).toBe(true);
  });

  it('sets shouldShowBanner=true when hasActiveGoal, hasAnyWeight, and isCheckInDue', async () => {
    // No last reflection -> isCheckInDue returns true
    mockReflectionRepo.getLastReflectionDate.mockResolvedValue(null);

    await useReflectionStore.getState().initialize();
    const state = useReflectionStore.getState();

    expect(state.shouldShowBanner).toBe(true);
  });

  it('sets shouldShowBanner=false when no active goal', async () => {
    mockGoalStore.getState.mockReturnValue({
      ...mockGoalStore.getState(),
      activeGoal: null,
      currentWeightKg: 82,
    });

    await useReflectionStore.getState().initialize();
    expect(useReflectionStore.getState().shouldShowBanner).toBe(false);
  });

  it('sets shouldShowBanner=false when goal.isActive is false', async () => {
    mockGoalStore.getState.mockReturnValue({
      ...mockGoalStore.getState(),
      activeGoal: makeGoal({ isActive: false }),
      currentWeightKg: 82,
    });

    await useReflectionStore.getState().initialize();
    expect(useReflectionStore.getState().shouldShowBanner).toBe(false);
  });

  it('sets shouldShowBanner=false when no weight data', async () => {
    mockGoalStore.getState.mockReturnValue({
      ...mockGoalStore.getState(),
      activeGoal: makeGoal(),
      currentWeightKg: null,
    });

    await useReflectionStore.getState().initialize();
    expect(useReflectionStore.getState().shouldShowBanner).toBe(false);
  });

  it('sets shouldShowBanner=false when check-in is not due', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 1, 12, 10, 0, 0)); // Wed Feb 12

    // Last reflection was Tue Feb 11 (after Monday check-in day)
    mockReflectionRepo.getLastReflectionDate.mockResolvedValue('2025-02-11T18:00:00.000Z');

    await useReflectionStore.getState().initialize();
    expect(useReflectionStore.getState().shouldShowBanner).toBe(false);

    jest.useRealTimers();
  });

  it('computes daysSinceLastReflection correctly', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 1, 12, 12, 0, 0)); // Feb 12 noon

    // Last reflection was Feb 5 noon -> 7 days ago
    mockReflectionRepo.getLastReflectionDate.mockResolvedValue('2025-02-05T12:00:00.000Z');

    await useReflectionStore.getState().initialize();
    expect(useReflectionStore.getState().daysSinceLastReflection).toBe(7);

    jest.useRealTimers();
  });

  it('sets daysSinceLastReflection to null when no last date', async () => {
    mockReflectionRepo.getLastReflectionDate.mockResolvedValue(null);

    await useReflectionStore.getState().initialize();
    expect(useReflectionStore.getState().daysSinceLastReflection).toBeNull();
  });

  it('handles errors gracefully and still sets isInitialized=true', async () => {
    mockReflectionRepo.getLastReflectionDate.mockRejectedValue(new Error('DB error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await useReflectionStore.getState().initialize();
    const state = useReflectionStore.getState();

    expect(state.isInitialized).toBe(true);
    // Other state should remain at defaults
    expect(state.lastReflectionDate).toBeNull();
    expect(state.shouldShowBanner).toBe(false);

    consoleSpy.mockRestore();
  });
});

// =====================================================================
// dismissBanner
// =====================================================================
describe('dismissBanner', () => {
  it('increments bannerDismissCount and persists via settingsRepository', async () => {
    useReflectionStore.setState({ bannerDismissCount: 2 });

    await useReflectionStore.getState().dismissBanner();

    expect(useReflectionStore.getState().bannerDismissCount).toBe(3);
    expect(mockSettingsRepo.set).toHaveBeenCalledWith('reflection_banner_dismiss_count', 3);
  });

  it('increments from zero', async () => {
    await useReflectionStore.getState().dismissBanner();

    expect(useReflectionStore.getState().bannerDismissCount).toBe(1);
    expect(mockSettingsRepo.set).toHaveBeenCalledWith('reflection_banner_dismiss_count', 1);
  });

  it('handles errors gracefully', async () => {
    mockSettingsRepo.set.mockRejectedValue(new Error('write failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    // Should not throw
    await useReflectionStore.getState().dismissBanner();

    consoleSpy.mockRestore();
  });
});

// =====================================================================
// startReflection
// =====================================================================
describe('startReflection', () => {
  it('sets isReflecting=true and resets in-progress state', () => {
    // Pre-set some dirty state
    useReflectionStore.setState({
      isReflecting: false,
      selectedSentiment: 'positive',
      previewCalories: 1800,
      hasChanges: true,
      submitError: 'old error',
    });

    useReflectionStore.getState().startReflection();
    const state = useReflectionStore.getState();

    expect(state.isReflecting).toBe(true);
    expect(state.selectedSentiment).toBeNull();
    expect(state.previewCalories).not.toBe(1800); // overwritten by setInputWeight
    expect(state.hasChanges).toBeDefined(); // computed by setInputWeight
    expect(state.isSubmitting).toBe(false);
    expect(state.submitError).toBeNull();
  });

  it('pre-fills inputWeightKg from goalStore.currentWeightKg', () => {
    mockGoalStore.getState.mockReturnValue({
      ...mockGoalStore.getState(),
      currentWeightKg: 78.5,
      activeGoal: makeGoal(),
      calculateBMR: jest.fn(() => 1700),
      calculateTDEE: jest.fn(() => 2635),
      calculateTargetCalories: jest.fn(() => 2000),
      calculateMacros: jest.fn(() => ({ protein: 150, carbs: 200, fat: 65 })),
    });

    useReflectionStore.getState().startReflection();
    expect(useReflectionStore.getState().inputWeightKg).toBe(78.5);
  });

  it('handles null currentWeightKg (no weight data)', () => {
    mockGoalStore.getState.mockReturnValue({
      ...mockGoalStore.getState(),
      currentWeightKg: null,
    });

    useReflectionStore.getState().startReflection();
    const state = useReflectionStore.getState();

    expect(state.inputWeightKg).toBeNull();
    expect(state.previewCalories).toBeNull();
  });

  it('calls setInputWeight to compute preview when weight is available', () => {
    const calculateMacros = jest.fn(() => ({ protein: 160, carbs: 180, fat: 60 }));
    mockGoalStore.getState.mockReturnValue({
      ...mockGoalStore.getState(),
      currentWeightKg: 80,
      activeGoal: makeGoal({ currentTargetCalories: 2000 }),
      calculateBMR: jest.fn(() => 1800),
      calculateTDEE: jest.fn(() => 2790),
      calculateTargetCalories: jest.fn(() => 2200),
      calculateMacros,
    });

    useReflectionStore.getState().startReflection();

    // setInputWeight should have been called, so preview should be populated
    expect(useReflectionStore.getState().previewCalories).not.toBeNull();
    expect(calculateMacros).toHaveBeenCalled();
  });
});

// =====================================================================
// setInputWeight
// =====================================================================
describe('setInputWeight', () => {
  it('computes preview calories and macros via goalStore methods', () => {
    const goal = makeGoal({ currentTargetCalories: 2000, currentProteinG: 150, currentCarbsG: 200, currentFatG: 67 });
    const calculateBMR = jest.fn(() => 1750);
    const calculateTDEE = jest.fn(() => 2712);
    const calculateTargetCalories = jest.fn(() => 2150); // raw, will be rounded to 2150
    const calculateMacros = jest.fn(() => ({ protein: 160, carbs: 210, fat: 68 }));

    mockGoalStore.getState.mockReturnValue({
      activeGoal: goal,
      currentWeightKg: 82,
      calculateBMR,
      calculateTDEE,
      calculateTargetCalories,
      calculateMacros,
      loadActiveGoal: jest.fn(),
    });

    useReflectionStore.getState().setInputWeight(81);

    expect(calculateBMR).toHaveBeenCalled();
    expect(calculateTDEE).toHaveBeenCalled();
    expect(calculateTargetCalories).toHaveBeenCalled();
    expect(calculateMacros).toHaveBeenCalled();
    expect(useReflectionStore.getState().inputWeightKg).toBe(81);
  });

  it('applies SMOOTHING_THRESHOLD: keeps previous targets when calorie diff <= 25', () => {
    const goal = makeGoal({
      currentTargetCalories: 2000,
      currentProteinG: 150,
      currentCarbsG: 200,
      currentFatG: 67,
    });

    mockGoalStore.getState.mockReturnValue({
      activeGoal: goal,
      currentWeightKg: 82,
      calculateBMR: jest.fn(() => 1750),
      calculateTDEE: jest.fn(() => 2712),
      calculateTargetCalories: jest.fn(() => 2002), // rounds to 2000 -> diff = 0
      calculateMacros: jest.fn(() => ({ protein: 151, carbs: 201, fat: 67 })),
      loadActiveGoal: jest.fn(),
    });

    useReflectionStore.getState().setInputWeight(81.5);
    const state = useReflectionStore.getState();

    expect(state.hasChanges).toBe(false);
    expect(state.previewCalories).toBe(2000); // kept previous
    expect(state.previewProteinG).toBe(150); // kept previous
    expect(state.previewCarbsG).toBe(200);
    expect(state.previewFatG).toBe(67);
  });

  it('applies SMOOTHING_THRESHOLD: uses new targets when calorie diff > 25', () => {
    const goal = makeGoal({
      currentTargetCalories: 2000,
      currentProteinG: 150,
      currentCarbsG: 200,
      currentFatG: 67,
    });

    mockGoalStore.getState.mockReturnValue({
      activeGoal: goal,
      currentWeightKg: 82,
      calculateBMR: jest.fn(() => 1850),
      calculateTDEE: jest.fn(() => 2867),
      calculateTargetCalories: jest.fn(() => 2103), // rounds to 2100 -> diff = 100 > 25
      calculateMacros: jest.fn(() => ({ protein: 165, carbs: 220, fat: 70 })),
      loadActiveGoal: jest.fn(),
    });

    useReflectionStore.getState().setInputWeight(84);
    const state = useReflectionStore.getState();

    expect(state.hasChanges).toBe(true);
    expect(state.previewCalories).toBe(2100);
    expect(state.previewProteinG).toBe(165);
    expect(state.previewCarbsG).toBe(220);
    expect(state.previewFatG).toBe(70);
  });

  it('returns early and just sets inputWeightKg if no active goal', () => {
    mockGoalStore.getState.mockReturnValue({
      activeGoal: null,
      currentWeightKg: 80,
      calculateBMR: jest.fn(),
      calculateTDEE: jest.fn(),
      calculateTargetCalories: jest.fn(),
      calculateMacros: jest.fn(),
      loadActiveGoal: jest.fn(),
    });

    useReflectionStore.getState().setInputWeight(79);
    const state = useReflectionStore.getState();

    expect(state.inputWeightKg).toBe(79);
    expect(state.previewCalories).toBeNull();
    expect(state.hasChanges).toBe(false);
  });

  it('returns early if profile is missing required fields', () => {
    mockProfileStore.getState.mockReturnValue({
      profile: makeProfile({ sex: undefined }),
    });

    useReflectionStore.getState().setInputWeight(79);
    const state = useReflectionStore.getState();

    expect(state.inputWeightKg).toBe(79);
    expect(state.previewCalories).toBeNull();
  });

  it('returns early if profile has no heightCm', () => {
    mockProfileStore.getState.mockReturnValue({
      profile: makeProfile({ heightCm: undefined }),
    });

    useReflectionStore.getState().setInputWeight(79);
    expect(useReflectionStore.getState().previewCalories).toBeNull();
  });

  it('returns early if profile has no dateOfBirth', () => {
    mockProfileStore.getState.mockReturnValue({
      profile: makeProfile({ dateOfBirth: undefined }),
    });

    useReflectionStore.getState().setInputWeight(79);
    expect(useReflectionStore.getState().previewCalories).toBeNull();
  });

  it('defaults activityLevel to moderately_active when not set', () => {
    const calculateTDEE = jest.fn(() => 2700);
    mockGoalStore.getState.mockReturnValue({
      ...mockGoalStore.getState(),
      calculateBMR: jest.fn(() => 1800),
      calculateTDEE,
      calculateTargetCalories: jest.fn(() => 2100),
      calculateMacros: jest.fn(() => ({ protein: 160, carbs: 210, fat: 68 })),
    });
    mockProfileStore.getState.mockReturnValue({
      profile: makeProfile({ activityLevel: undefined }),
    });

    useReflectionStore.getState().setInputWeight(80);

    // calculateTDEE should be called with bmr and 'moderately_active'
    expect(calculateTDEE).toHaveBeenCalledWith(expect.any(Number), 'moderately_active');
  });
});

// =====================================================================
// setSentiment
// =====================================================================
describe('setSentiment', () => {
  it('sets selectedSentiment to the provided value', () => {
    useReflectionStore.getState().setSentiment('positive');
    expect(useReflectionStore.getState().selectedSentiment).toBe('positive');
  });

  it('sets selectedSentiment to neutral', () => {
    useReflectionStore.getState().setSentiment('neutral');
    expect(useReflectionStore.getState().selectedSentiment).toBe('neutral');
  });

  it('sets selectedSentiment to negative', () => {
    useReflectionStore.getState().setSentiment('negative');
    expect(useReflectionStore.getState().selectedSentiment).toBe('negative');
  });

  it('sets selectedSentiment to null', () => {
    useReflectionStore.setState({ selectedSentiment: 'positive' });
    useReflectionStore.getState().setSentiment(null);
    expect(useReflectionStore.getState().selectedSentiment).toBeNull();
  });
});

// =====================================================================
// submitReflection
// =====================================================================
describe('submitReflection', () => {
  beforeEach(() => {
    // Start in a reflecting state with input weight
    useReflectionStore.setState({
      isReflecting: true,
      inputWeightKg: 81,
      selectedSentiment: 'positive',
      previewCalories: 2100,
      previewProteinG: 165,
      previewCarbsG: 220,
      previewFatG: 70,
      hasChanges: true,
      isSubmitting: false,
      submitError: null,
    });
  });

  it('returns early if no inputWeightKg', async () => {
    useReflectionStore.setState({ inputWeightKg: null });

    await useReflectionStore.getState().submitReflection();

    expect(mockWithTransaction).not.toHaveBeenCalled();
    expect(useReflectionStore.getState().isSubmitting).toBe(false);
  });

  it('sets isSubmitting=true during submission', async () => {
    let capturedIsSubmitting = false;
    mockWithTransaction.mockImplementation(async (cb: (db: unknown) => Promise<void>) => {
      capturedIsSubmitting = useReflectionStore.getState().isSubmitting;
      const mockDb = {
        getFirstAsync: jest.fn().mockResolvedValue(null),
        getAllAsync: jest.fn().mockResolvedValue([]),
        runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
      };
      return cb(mockDb);
    });

    await useReflectionStore.getState().submitReflection();

    expect(capturedIsSubmitting).toBe(true);
  });

  it('calls withTransaction with a transaction function', async () => {
    await useReflectionStore.getState().submitReflection();

    expect(mockWithTransaction).toHaveBeenCalledTimes(1);
    expect(mockWithTransaction).toHaveBeenCalledWith(expect.any(Function));
  });

  it('happy path: full submission with changes', async () => {
    const mockDb = {
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce(null) // no existing weight entry
        .mockResolvedValueOnce({ trend_weight_kg: 80.5 }), // today's trend weight
      getAllAsync: jest.fn().mockResolvedValue([
        { id: 'we1', date: '2025-02-10', weight_kg: 81, trend_weight_kg: 80.5 },
      ]),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    };
    mockWithTransaction.mockImplementation(async (cb: (db: unknown) => Promise<void>) => cb(mockDb));

    const goalStore = mockGoalStore.getState();
    const weightStore = mockWeightStore.getState();
    const settingsStore = mockSettingsStore.getState();

    await useReflectionStore.getState().submitReflection();

    // Transaction should have run SQL operations
    expect(mockDb.runAsync).toHaveBeenCalled();

    // After success: reloads stores
    expect(goalStore.loadActiveGoal).toHaveBeenCalled();
    expect(weightStore.loadLatest).toHaveBeenCalled();
    expect(weightStore.loadTrendWeight).toHaveBeenCalled();

    // Since hasChanges=true, should update settings
    expect(mockSettingsRepo.setDailyGoals).toHaveBeenCalledWith({
      calories: 2100,
      protein: 165,
      carbs: 220,
      fat: 70,
    });
    expect(settingsStore.loadSettings).toHaveBeenCalled();

    // Review prompt service called
    expect(mockReviewPrompt.onReflectionCompleted).toHaveBeenCalledWith('positive');

    // State reset
    const state = useReflectionStore.getState();
    expect(state.isReflecting).toBe(false);
    expect(state.isSubmitting).toBe(false);
    expect(state.submitError).toBeNull();
    expect(state.shouldShowBanner).toBe(false);
    expect(state.bannerDismissCount).toBe(0);
    expect(state.daysSinceLastReflection).toBe(0);
    expect(state.lastReflectionDate).toBeTruthy();
  });

  it('happy path: submission without changes skips setDailyGoals', async () => {
    useReflectionStore.setState({ hasChanges: false });

    const mockDb = {
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ trend_weight_kg: 81 }),
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    };
    mockWithTransaction.mockImplementation(async (cb: (db: unknown) => Promise<void>) => cb(mockDb));

    await useReflectionStore.getState().submitReflection();

    expect(mockSettingsRepo.setDailyGoals).not.toHaveBeenCalled();
  });

  it('updates existing weight entry if one exists for today', async () => {
    const mockDb = {
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce({ id: 'existing-we-1' }) // existing weight entry
        .mockResolvedValueOnce({ trend_weight_kg: 81 }),
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    };
    mockWithTransaction.mockImplementation(async (cb: (db: unknown) => Promise<void>) => cb(mockDb));

    await useReflectionStore.getState().submitReflection();

    // Should have called UPDATE, not INSERT for the weight entry
    const runCalls = mockDb.runAsync.mock.calls;
    const updateCall = runCalls.find((call: unknown[]) =>
      typeof call[0] === 'string' && call[0].includes('UPDATE weight_entries SET weight_kg')
    );
    expect(updateCall).toBeDefined();
  });

  it('inserts new weight entry if none exists for today', async () => {
    const mockDb = {
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce(null) // no existing entry
        .mockResolvedValueOnce({ trend_weight_kg: 81 }),
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    };
    mockWithTransaction.mockImplementation(async (cb: (db: unknown) => Promise<void>) => cb(mockDb));

    await useReflectionStore.getState().submitReflection();

    const runCalls = mockDb.runAsync.mock.calls;
    const insertCall = runCalls.find((call: unknown[]) =>
      typeof call[0] === 'string' && call[0].includes('INSERT INTO weight_entries')
    );
    expect(insertCall).toBeDefined();
  });

  it('calls recomputeEWMAFromDate with all weight entries', async () => {
    const allRows = [
      { id: 'we1', date: '2025-02-09', weight_kg: 82, trend_weight_kg: 81.5 },
      { id: 'we2', date: '2025-02-10', weight_kg: 81, trend_weight_kg: 81.2 },
    ];
    const mockDb = {
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ trend_weight_kg: 81.2 }),
      getAllAsync: jest.fn().mockResolvedValue(allRows),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    };
    mockWithTransaction.mockImplementation(async (cb: (db: unknown) => Promise<void>) => cb(mockDb));

    await useReflectionStore.getState().submitReflection();

    expect(mockRecomputeEWMA).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'we1', weightKg: 82 }),
        expect.objectContaining({ id: 'we2', weightKg: 81 }),
      ]),
      expect.any(String) // today's date
    );
  });

  it('writes trend weight updates back to DB', async () => {
    mockRecomputeEWMA.mockReturnValue([
      { id: 'we1', trendWeightKg: 81.3 },
      { id: 'we2', trendWeightKg: 81.1 },
    ]);

    const mockDb = {
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ trend_weight_kg: 81.1 }),
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    };
    mockWithTransaction.mockImplementation(async (cb: (db: unknown) => Promise<void>) => cb(mockDb));

    await useReflectionStore.getState().submitReflection();

    // Two trend weight UPDATEs
    const trendCalls = mockDb.runAsync.mock.calls.filter((call: unknown[]) =>
      typeof call[0] === 'string' && call[0].includes('UPDATE weight_entries SET trend_weight_kg')
    );
    expect(trendCalls).toHaveLength(2);
  });

  it('saves reflection record in the transaction', async () => {
    const mockDb = {
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ trend_weight_kg: 81 }),
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    };
    mockWithTransaction.mockImplementation(async (cb: (db: unknown) => Promise<void>) => cb(mockDb));

    await useReflectionStore.getState().submitReflection();

    const runCalls = mockDb.runAsync.mock.calls;
    const reflectionInsert = runCalls.find((call: unknown[]) =>
      typeof call[0] === 'string' && call[0].includes('INSERT INTO reflections')
    );
    expect(reflectionInsert).toBeDefined();
  });

  it('resets banner dismiss count in the transaction', async () => {
    const mockDb = {
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ trend_weight_kg: 81 }),
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    };
    mockWithTransaction.mockImplementation(async (cb: (db: unknown) => Promise<void>) => cb(mockDb));

    await useReflectionStore.getState().submitReflection();

    const runCalls = mockDb.runAsync.mock.calls;
    const bannerReset = runCalls.find((call: unknown[]) =>
      typeof call[0] === 'string' && call[0].includes('reflection_banner_dismiss_count')
    );
    expect(bannerReset).toBeDefined();
  });

  it('computes weight change from previous reflection', async () => {
    mockReflectionRepo.getLatest.mockResolvedValue({
      id: 1,
      reflectedAt: '2025-02-03T12:00:00.000Z',
      weightKg: 83,
      weightTrendKg: 82.5,
      sentiment: 'neutral',
      previousCalories: 2000,
      previousProteinG: 150,
      previousCarbsG: 200,
      previousFatG: 67,
      newCalories: 2000,
      newProteinG: 150,
      newCarbsG: 200,
      newFatG: 67,
      weightChangeKg: null,
      createdAt: '2025-02-03T12:00:00.000Z',
    });

    const mockDb = {
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ trend_weight_kg: 81 }),
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    };
    mockWithTransaction.mockImplementation(async (cb: (db: unknown) => Promise<void>) => cb(mockDb));

    await useReflectionStore.getState().submitReflection();

    // The reflection INSERT should contain the weightChangeKg (81 - 83 = -2)
    const runCalls = mockDb.runAsync.mock.calls;
    const reflectionInsert = runCalls.find((call: unknown[]) =>
      typeof call[0] === 'string' && call[0].includes('INSERT INTO reflections')
    );
    expect(reflectionInsert).toBeDefined();
    // weightChangeKg is the last parameter
    const params = reflectionInsert![1] as unknown[];
    expect(params[params.length - 1]).toBe(-2); // 81 - 83
  });

  it('on error: sets submitError and clears isSubmitting', async () => {
    mockWithTransaction.mockRejectedValue(new Error('Transaction failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await useReflectionStore.getState().submitReflection();
    const state = useReflectionStore.getState();

    expect(state.isSubmitting).toBe(false);
    expect(state.submitError).toBe('Something went wrong — please try again.');

    consoleSpy.mockRestore();
  });

  it('on error: does not reset reflection state', async () => {
    mockWithTransaction.mockRejectedValue(new Error('Transaction failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await useReflectionStore.getState().submitReflection();

    // isReflecting should still be true (not reset since the error path does not reset it)
    expect(useReflectionStore.getState().isReflecting).toBe(true);

    consoleSpy.mockRestore();
  });

  it('throws and sets error when missing goal data', async () => {
    mockGoalStore.getState.mockReturnValue({
      ...mockGoalStore.getState(),
      activeGoal: null,
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await useReflectionStore.getState().submitReflection();
    const state = useReflectionStore.getState();

    expect(state.isSubmitting).toBe(false);
    expect(state.submitError).toBe('Something went wrong — please try again.');

    consoleSpy.mockRestore();
  });

  it('throws and sets error when missing profile data', async () => {
    mockProfileStore.getState.mockReturnValue({
      profile: makeProfile({ sex: undefined }),
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await useReflectionStore.getState().submitReflection();
    const state = useReflectionStore.getState();

    expect(state.isSubmitting).toBe(false);
    expect(state.submitError).toBe('Something went wrong — please try again.');

    consoleSpy.mockRestore();
  });

  it('handles null trend weight (falls back to inputWeightKg for calculations)', async () => {
    const mockDb = {
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce(null) // no existing weight entry
        .mockResolvedValueOnce({ trend_weight_kg: null }), // no trend weight
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    };
    mockWithTransaction.mockImplementation(async (cb: (db: unknown) => Promise<void>) => cb(mockDb));

    const goalState = mockGoalStore.getState();

    await useReflectionStore.getState().submitReflection();

    // calculateBMR should have been called with inputWeightKg (81) since trendWeightKg is null
    expect(goalState.calculateBMR).toHaveBeenCalledWith(81, expect.any(Number), expect.any(Number), 'male');
  });

  it('uses trend weight when available for calculations', async () => {
    const mockDb = {
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ trend_weight_kg: 80.3 }), // trend weight available
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    };
    mockWithTransaction.mockImplementation(async (cb: (db: unknown) => Promise<void>) => cb(mockDb));

    const goalState = mockGoalStore.getState();

    await useReflectionStore.getState().submitReflection();

    // calculateBMR should have been called with trend weight (80.3)
    expect(goalState.calculateBMR).toHaveBeenCalledWith(80.3, expect.any(Number), expect.any(Number), 'male');
  });

  it('review prompt service errors are swallowed silently', async () => {
    mockReviewPrompt.onReflectionCompleted.mockRejectedValue(new Error('review service error'));

    const mockDb = {
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ trend_weight_kg: 81 }),
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    };
    mockWithTransaction.mockImplementation(async (cb: (db: unknown) => Promise<void>) => cb(mockDb));

    // Should not throw
    await useReflectionStore.getState().submitReflection();

    const state = useReflectionStore.getState();
    expect(state.submitError).toBeNull();
    expect(state.isReflecting).toBe(false);
  });
});

// =====================================================================
// cancelReflection
// =====================================================================
describe('cancelReflection', () => {
  it('resets all in-progress state to defaults', () => {
    useReflectionStore.setState({
      isReflecting: true,
      inputWeightKg: 81,
      selectedSentiment: 'positive',
      previewCalories: 2100,
      previewProteinG: 165,
      previewCarbsG: 220,
      previewFatG: 70,
      hasChanges: true,
      isSubmitting: true,
      submitError: 'some error',
    });

    useReflectionStore.getState().cancelReflection();
    const state = useReflectionStore.getState();

    expect(state.isReflecting).toBe(false);
    expect(state.inputWeightKg).toBeNull();
    expect(state.selectedSentiment).toBeNull();
    expect(state.previewCalories).toBeNull();
    expect(state.previewProteinG).toBeNull();
    expect(state.previewCarbsG).toBeNull();
    expect(state.previewFatG).toBeNull();
    expect(state.hasChanges).toBe(false);
    expect(state.isSubmitting).toBe(false);
    expect(state.submitError).toBeNull();
  });

  it('does not affect persisted state', () => {
    useReflectionStore.setState({
      lastReflectionDate: '2025-02-10T12:00:00.000Z',
      daysSinceLastReflection: 3,
      shouldShowBanner: true,
      bannerDismissCount: 2,
      isInitialized: true,
      // In-progress state
      isReflecting: true,
      inputWeightKg: 81,
    });

    useReflectionStore.getState().cancelReflection();
    const state = useReflectionStore.getState();

    // Persisted state unchanged
    expect(state.lastReflectionDate).toBe('2025-02-10T12:00:00.000Z');
    expect(state.daysSinceLastReflection).toBe(3);
    expect(state.shouldShowBanner).toBe(true);
    expect(state.bannerDismissCount).toBe(2);
    expect(state.isInitialized).toBe(true);

    // In-progress state reset
    expect(state.isReflecting).toBe(false);
    expect(state.inputWeightKg).toBeNull();
  });
});
