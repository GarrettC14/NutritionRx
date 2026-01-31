/**
 * Micronutrient Store Tests
 * Tests for micronutrient tracking state management
 */

const mockDb = {
  getFirstAsync: jest.fn(),
  getAllAsync: jest.fn(() => Promise.resolve([])),
  runAsync: jest.fn(),
};

jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

const MOCK_ALL_NUTRIENTS = [
  {
    id: 'vitamin_c',
    name: 'Vitamin C',
    shortName: 'Vit C',
    unit: 'mg',
    category: 'vitamins',
    subcategory: 'water_soluble_vitamins',
    isPremium: false,
  },
  {
    id: 'vitamin_d',
    name: 'Vitamin D',
    shortName: 'Vit D',
    unit: 'mcg',
    category: 'vitamins',
    subcategory: 'fat_soluble_vitamins',
    isPremium: false,
  },
  {
    id: 'zinc',
    name: 'Zinc',
    shortName: 'Zn',
    unit: 'mg',
    category: 'minerals',
    subcategory: 'trace_minerals',
    isPremium: true,
  },
];

const MOCK_FREE_NUTRIENTS = MOCK_ALL_NUTRIENTS.filter(n => !n.isPremium);

jest.mock('@/data/nutrients', () => ({
  ALL_NUTRIENTS: MOCK_ALL_NUTRIENTS,
  FREE_NUTRIENTS: MOCK_FREE_NUTRIENTS,
  NUTRIENT_BY_ID: MOCK_ALL_NUTRIENTS.reduce(
    (acc: Record<string, typeof MOCK_ALL_NUTRIENTS[0]>, n) => {
      acc[n.id] = n;
      return acc;
    },
    {}
  ),
}));

jest.mock('@/data/rdaTables', () => ({
  getRDA: jest.fn(),
  DEFAULT_ADULT_RDAS: {
    vitamin_c: { rda: 90, ul: 2000 },
    vitamin_d: { rda: 15, ul: 100 },
  },
}));

import { useMicronutrientStore } from '@/stores/micronutrientStore';
import { getRDA } from '@/data/rdaTables';

const mockGetRDA = getRDA as jest.MockedFunction<typeof getRDA>;

describe('micronutrientStore', () => {
  beforeEach(() => {
    useMicronutrientStore.setState({
      profile: {
        gender: 'male',
        ageGroup: '19-30y',
        lifeStage: 'normal',
      },
      customTargets: new Map(),
      dailyIntake: null,
      contributors: [],
      isLoading: false,
      isLoaded: false,
      error: null,
      selectedDate: '2024-06-10',
      selectedCategory: 'all',
      showOnlyIssues: false,
    });
    jest.clearAllMocks();
  });

  // ============================================================
  // Initial State
  // ============================================================

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useMicronutrientStore.getState();

      expect(state.profile.gender).toBe('male');
      expect(state.profile.ageGroup).toBe('19-30y');
      expect(state.profile.lifeStage).toBe('normal');
      expect(state.customTargets).toBeInstanceOf(Map);
      expect(state.customTargets.size).toBe(0);
      expect(state.dailyIntake).toBeNull();
      expect(state.selectedCategory).toBe('all');
      expect(state.showOnlyIssues).toBe(false);
    });
  });

  // ============================================================
  // calculateStatus (tested through getStatusForIntake)
  // ============================================================

  describe('calculateStatus thresholds', () => {
    // Set up a known target so calculateStatus gets exercised with predictable values
    beforeEach(() => {
      mockGetRDA.mockReturnValue(null);
      // Use customTargets to give vitamin_c a target of 100 with no upper limit
      useMicronutrientStore.setState({
        customTargets: new Map([
          [
            'vitamin_c',
            { nutrientId: 'vitamin_c', targetAmount: 100, isCustom: true },
          ],
        ]),
      });
    });

    it('returns deficient when amount is 0 (0% of target)', () => {
      const status = useMicronutrientStore.getState().getStatusForIntake('vitamin_c', 0);
      expect(status).toBe('deficient');
    });

    it('returns deficient when amount is 49 (49% of 100)', () => {
      const status = useMicronutrientStore.getState().getStatusForIntake('vitamin_c', 49);
      expect(status).toBe('deficient');
    });

    it('returns low when amount is 50 (50% of 100)', () => {
      const status = useMicronutrientStore.getState().getStatusForIntake('vitamin_c', 50);
      expect(status).toBe('low');
    });

    it('returns low when amount is 74 (74% of 100)', () => {
      const status = useMicronutrientStore.getState().getStatusForIntake('vitamin_c', 74);
      expect(status).toBe('low');
    });

    it('returns adequate when amount is 75 (75% of 100)', () => {
      const status = useMicronutrientStore.getState().getStatusForIntake('vitamin_c', 75);
      expect(status).toBe('adequate');
    });

    it('returns adequate when amount is 99 (99% of 100)', () => {
      const status = useMicronutrientStore.getState().getStatusForIntake('vitamin_c', 99);
      expect(status).toBe('adequate');
    });

    it('returns optimal when amount is 100 (100% of 100)', () => {
      const status = useMicronutrientStore.getState().getStatusForIntake('vitamin_c', 100);
      expect(status).toBe('optimal');
    });

    it('returns optimal when amount is 150 (150% of 100)', () => {
      const status = useMicronutrientStore.getState().getStatusForIntake('vitamin_c', 150);
      expect(status).toBe('optimal');
    });

    it('returns high when amount is 151 (151% of 100)', () => {
      const status = useMicronutrientStore.getState().getStatusForIntake('vitamin_c', 151);
      expect(status).toBe('high');
    });

    it('returns high when amount is 200 (200% of 100)', () => {
      const status = useMicronutrientStore.getState().getStatusForIntake('vitamin_c', 200);
      expect(status).toBe('high');
    });

    it('returns excessive when amount is 201 (201% of 100)', () => {
      const status = useMicronutrientStore.getState().getStatusForIntake('vitamin_c', 201);
      expect(status).toBe('excessive');
    });

    it('returns excessive when amount exceeds upperLimit', () => {
      useMicronutrientStore.setState({
        customTargets: new Map([
          [
            'vitamin_c',
            { nutrientId: 'vitamin_c', targetAmount: 100, upperLimit: 40, isCustom: true },
          ],
        ]),
      });

      const status = useMicronutrientStore.getState().getStatusForIntake('vitamin_c', 50);
      expect(status).toBe('excessive');
    });

    it('returns adequate when no target found for nutrient', () => {
      mockGetRDA.mockReturnValue(null);
      useMicronutrientStore.setState({ customTargets: new Map() });

      // 'zinc' has no custom target and no DEFAULT_ADULT_RDAS entry
      const status = useMicronutrientStore.getState().getStatusForIntake('unknown_nutrient', 50);
      expect(status).toBe('adequate');
    });
  });

  // ============================================================
  // getTargetForNutrient
  // ============================================================

  describe('getTargetForNutrient', () => {
    it('returns custom target when one exists', () => {
      const customTarget = {
        nutrientId: 'vitamin_c',
        targetAmount: 200,
        upperLimit: 2000,
        isCustom: true as const,
      };
      useMicronutrientStore.setState({
        customTargets: new Map([['vitamin_c', customTarget]]),
      });

      const target = useMicronutrientStore.getState().getTargetForNutrient('vitamin_c');
      expect(target).toEqual(customTarget);
    });

    it('falls back to getRDA when no custom target', () => {
      mockGetRDA.mockReturnValue({
        nutrientId: 'vitamin_c',
        gender: 'male',
        ageGroup: '19-30y',
        lifeStage: 'normal',
        rda: 90,
        ul: 2000,
      });

      const target = useMicronutrientStore.getState().getTargetForNutrient('vitamin_c');

      expect(target).toEqual({
        nutrientId: 'vitamin_c',
        targetAmount: 90,
        upperLimit: 2000,
        isCustom: false,
      });
      expect(mockGetRDA).toHaveBeenCalledWith('vitamin_c', 'male', '19-30y', 'normal');
    });

    it('uses ai value from RDA when rda is undefined', () => {
      mockGetRDA.mockReturnValue({
        nutrientId: 'vitamin_d',
        gender: 'male',
        ageGroup: '19-30y',
        lifeStage: 'normal',
        rda: undefined as any,
        ai: 15,
        ul: 100,
      });

      const target = useMicronutrientStore.getState().getTargetForNutrient('vitamin_d');
      expect(target?.targetAmount).toBe(15);
    });

    it('falls back to DEFAULT_ADULT_RDAS when getRDA returns null', () => {
      mockGetRDA.mockReturnValue(null);

      const target = useMicronutrientStore.getState().getTargetForNutrient('vitamin_c');

      expect(target).toEqual({
        nutrientId: 'vitamin_c',
        targetAmount: 90,
        upperLimit: 2000,
        isCustom: false,
      });
    });

    it('returns null when no target source found', () => {
      mockGetRDA.mockReturnValue(null);

      const target = useMicronutrientStore.getState().getTargetForNutrient('unknown_nutrient');
      expect(target).toBeNull();
    });
  });

  // ============================================================
  // getVisibleNutrients
  // ============================================================

  describe('getVisibleNutrients', () => {
    it('returns ALL_NUTRIENTS for premium users', () => {
      const result = useMicronutrientStore.getState().getVisibleNutrients(true);
      expect(result).toHaveLength(3);
      expect(result.some(n => n.isPremium)).toBe(true);
    });

    it('returns FREE_NUTRIENTS for free users', () => {
      const result = useMicronutrientStore.getState().getVisibleNutrients(false);
      expect(result).toHaveLength(2);
      expect(result.every(n => !n.isPremium)).toBe(true);
    });
  });

  // ============================================================
  // loadProfile
  // ============================================================

  describe('loadProfile', () => {
    it('short-circuits if already loaded', async () => {
      useMicronutrientStore.setState({ isLoaded: true });

      await useMicronutrientStore.getState().loadProfile();

      expect(mockDb.getFirstAsync).not.toHaveBeenCalled();
    });

    it('loads profile from database', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({
        gender: 'female',
        age_group: '31-50y',
        life_stage: 'pregnant',
      });
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      await useMicronutrientStore.getState().loadProfile();

      const state = useMicronutrientStore.getState();
      expect(state.profile.gender).toBe('female');
      expect(state.profile.ageGroup).toBe('31-50y');
      expect(state.profile.lifeStage).toBe('pregnant');
      expect(state.isLoaded).toBe(true);
    });

    it('loads custom targets from database', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null);
      mockDb.getAllAsync.mockResolvedValueOnce([
        { nutrient_id: 'vitamin_c', target_amount: 200, upper_limit: 2000 },
        { nutrient_id: 'zinc', target_amount: 15, upper_limit: null },
      ]);

      await useMicronutrientStore.getState().loadProfile();

      const { customTargets } = useMicronutrientStore.getState();
      expect(customTargets.size).toBe(2);
      expect(customTargets.get('vitamin_c')?.targetAmount).toBe(200);
      expect(customTargets.get('zinc')?.upperLimit).toBeUndefined();
    });

    it('sets error on failure', async () => {
      mockDb.getFirstAsync.mockRejectedValueOnce(new Error('DB error'));

      await useMicronutrientStore.getState().loadProfile();

      const state = useMicronutrientStore.getState();
      expect(state.error).toBe('DB error');
      expect(state.isLoaded).toBe(true);
    });
  });

  // ============================================================
  // updateProfile
  // ============================================================

  describe('updateProfile', () => {
    it('updates profile in state and database', async () => {
      await useMicronutrientStore.getState().updateProfile({ gender: 'female' });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE nutrient_settings'),
        ['female', '19-30y', 'normal']
      );
      expect(useMicronutrientStore.getState().profile.gender).toBe('female');
    });

    it('merges partial updates with existing profile', async () => {
      useMicronutrientStore.setState({
        profile: { gender: 'female', ageGroup: '31-50y', lifeStage: 'pregnant' },
      });

      await useMicronutrientStore.getState().updateProfile({ ageGroup: '51-70y' });

      const { profile } = useMicronutrientStore.getState();
      expect(profile.gender).toBe('female');
      expect(profile.ageGroup).toBe('51-70y');
      expect(profile.lifeStage).toBe('pregnant');
    });
  });

  // ============================================================
  // View Settings
  // ============================================================

  describe('setSelectedDate', () => {
    it('sets selectedDate and triggers loadDailyIntake', () => {
      // loadDailyIntake calls db.getAllAsync
      mockDb.getAllAsync.mockResolvedValue([]);

      useMicronutrientStore.getState().setSelectedDate('2024-07-01');

      expect(useMicronutrientStore.getState().selectedDate).toBe('2024-07-01');
    });
  });

  describe('setSelectedCategory', () => {
    it('sets selectedCategory', () => {
      useMicronutrientStore.getState().setSelectedCategory('vitamins');
      expect(useMicronutrientStore.getState().selectedCategory).toBe('vitamins');
    });

    it('can be set to all', () => {
      useMicronutrientStore.setState({ selectedCategory: 'minerals' });
      useMicronutrientStore.getState().setSelectedCategory('all');
      expect(useMicronutrientStore.getState().selectedCategory).toBe('all');
    });
  });

  describe('setShowOnlyIssues', () => {
    it('sets showOnlyIssues to true', () => {
      useMicronutrientStore.getState().setShowOnlyIssues(true);
      expect(useMicronutrientStore.getState().showOnlyIssues).toBe(true);
    });

    it('sets showOnlyIssues to false', () => {
      useMicronutrientStore.setState({ showOnlyIssues: true });
      useMicronutrientStore.getState().setShowOnlyIssues(false);
      expect(useMicronutrientStore.getState().showOnlyIssues).toBe(false);
    });
  });

  // ============================================================
  // setCustomTarget / removeCustomTarget
  // ============================================================

  describe('setCustomTarget', () => {
    it('adds a custom target and persists to DB', async () => {
      await useMicronutrientStore.getState().setCustomTarget('vitamin_c', {
        targetAmount: 200,
        upperLimit: 2000,
      });

      const { customTargets } = useMicronutrientStore.getState();
      expect(customTargets.has('vitamin_c')).toBe(true);
      expect(customTargets.get('vitamin_c')?.targetAmount).toBe(200);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE'),
        ['vitamin_c', 200, 2000]
      );
    });
  });

  describe('removeCustomTarget', () => {
    it('removes a custom target from state and DB', async () => {
      useMicronutrientStore.setState({
        customTargets: new Map([
          ['vitamin_c', { nutrientId: 'vitamin_c', targetAmount: 200, isCustom: true as const }],
        ]),
      });

      await useMicronutrientStore.getState().removeCustomTarget('vitamin_c');

      expect(useMicronutrientStore.getState().customTargets.has('vitamin_c')).toBe(false);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM custom_nutrient_targets'),
        ['vitamin_c']
      );
    });
  });
});
