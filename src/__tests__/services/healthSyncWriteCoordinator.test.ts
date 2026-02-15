import { logHealthSync } from '@/repositories/healthSyncRepository';
import {
  getHealthSyncService,
  HealthSyncService,
} from '@/services/healthSyncService';
import {
  syncNutritionToHealthPlatform,
  syncWeightToHealthPlatform,
  syncWaterToHealthPlatform,
} from '@/services/healthSyncWriteCoordinator';

// ═══ Mocks ═══

jest.mock('@/services/healthSyncService', () => ({
  getHealthSyncService: jest.fn(),
}));

jest.mock('@/repositories/healthSyncRepository', () => ({
  logHealthSync: jest.fn().mockResolvedValue('mock-log-id'),
}));

const mockGetHealthSyncService = getHealthSyncService as jest.MockedFunction<
  typeof getHealthSyncService
>;
const mockLogHealthSync = logHealthSync as jest.MockedFunction<typeof logHealthSync>;

// ═══ Helpers ═══

function createMockService(overrides: Partial<HealthSyncService> = {}): HealthSyncService {
  return {
    isAvailable: jest.fn().mockResolvedValue(true),
    connect: jest.fn().mockResolvedValue({ granted: [], denied: [] }),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
    writeNutrition: jest.fn().mockResolvedValue({ success: true, externalId: 'ext-nutr-1' }),
    writeWeight: jest.fn().mockResolvedValue({ success: true, externalId: 'ext-wt-1' }),
    writeWater: jest.fn().mockResolvedValue({ success: true, externalId: 'ext-water-1' }),
    readWeightChanges: jest.fn().mockResolvedValue([]),
    readActiveCalories: jest.fn().mockResolvedValue(0),
    readSteps: jest.fn().mockResolvedValue(0),
    getLastSyncTime: jest.fn().mockResolvedValue(null),
    getPlatformName: jest.fn().mockReturnValue('apple_health'),
    ...overrides,
  };
}

// ═══ Test Data ═══

const NUTRITION_PARAMS = {
  calories: 520,
  protein: 35,
  carbs: 60,
  fat: 14,
  mealType: 'lunch',
  timestamp: '2026-02-15T12:30:00.000Z',
  localRecordId: 'local-nutr-1',
  localRecordType: 'log_entry' as const,
};

const WEIGHT_PARAMS = {
  weightKg: 82.5,
  timestamp: '2026-02-15T08:00:00.000Z',
  localRecordId: 'local-wt-1',
  localRecordType: 'weight_entry' as const,
};

const WATER_PARAMS = {
  milliliters: 500,
  timestamp: '2026-02-15T10:00:00.000Z',
  localRecordId: 'local-water-1',
  localRecordType: 'water_entry' as const,
};

// ═══ Tests ═══

beforeEach(() => {
  jest.clearAllMocks();
});

// ────────────────────────────────────────────
// syncNutritionToHealthPlatform
// ────────────────────────────────────────────

describe('syncNutritionToHealthPlatform', () => {
  it('returns without calling anything when getHealthSyncService returns null', async () => {
    mockGetHealthSyncService.mockReturnValue(null);

    await syncNutritionToHealthPlatform(NUTRITION_PARAMS);

    expect(mockLogHealthSync).not.toHaveBeenCalled();
  });

  it('returns without calling anything when service is not connected', async () => {
    const service = createMockService({ isConnected: jest.fn().mockReturnValue(false) });
    mockGetHealthSyncService.mockReturnValue(service);

    await syncNutritionToHealthPlatform(NUTRITION_PARAMS);

    expect(service.writeNutrition).not.toHaveBeenCalled();
    expect(mockLogHealthSync).not.toHaveBeenCalled();
  });

  it('calls writeNutrition with the correct payload and logs success with externalId', async () => {
    const service = createMockService();
    mockGetHealthSyncService.mockReturnValue(service);

    await syncNutritionToHealthPlatform(NUTRITION_PARAMS);

    expect(service.writeNutrition).toHaveBeenCalledWith({
      calories: 520,
      protein: 35,
      carbs: 60,
      fat: 14,
      mealType: 'lunch',
      timestamp: '2026-02-15T12:30:00.000Z',
      localRecordId: 'local-nutr-1',
      localRecordType: 'log_entry',
    });

    expect(mockLogHealthSync).toHaveBeenCalledWith({
      platform: 'apple_health',
      direction: 'write',
      data_type: 'nutrition',
      local_record_id: 'local-nutr-1',
      local_record_type: 'log_entry',
      external_id: 'ext-nutr-1',
      status: 'success',
      error_message: null,
    });
  });

  it('logs error status when writeNutrition rejects', async () => {
    const service = createMockService({
      writeNutrition: jest.fn().mockRejectedValue(new Error('HealthKit write denied')),
    });
    mockGetHealthSyncService.mockReturnValue(service);

    await syncNutritionToHealthPlatform(NUTRITION_PARAMS);

    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        error_message: 'HealthKit write denied',
        external_id: null,
      })
    );
  });

  it('logs error status when writeNutrition returns a failure result', async () => {
    const service = createMockService({
      writeNutrition: jest.fn().mockResolvedValue({ success: false, error: 'quota exceeded' }),
    });
    mockGetHealthSyncService.mockReturnValue(service);

    await syncNutritionToHealthPlatform(NUTRITION_PARAMS);

    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        error_message: 'quota exceeded',
        external_id: null,
      })
    );
  });

  it('passes mealType through to the payload', async () => {
    const service = createMockService();
    mockGetHealthSyncService.mockReturnValue(service);

    await syncNutritionToHealthPlatform({ ...NUTRITION_PARAMS, mealType: 'dinner' });

    expect(service.writeNutrition).toHaveBeenCalledWith(
      expect.objectContaining({ mealType: 'dinner' })
    );
  });

  it('passes undefined mealType when not provided', async () => {
    const service = createMockService();
    mockGetHealthSyncService.mockReturnValue(service);
    const { mealType: _, ...paramsNoMeal } = NUTRITION_PARAMS;

    await syncNutritionToHealthPlatform(paramsNoMeal);

    expect(service.writeNutrition).toHaveBeenCalledWith(
      expect.objectContaining({ mealType: undefined })
    );
  });

  it('supports quick_add_entry as localRecordType', async () => {
    const service = createMockService();
    mockGetHealthSyncService.mockReturnValue(service);

    await syncNutritionToHealthPlatform({
      ...NUTRITION_PARAMS,
      localRecordType: 'quick_add_entry',
    });

    expect(service.writeNutrition).toHaveBeenCalledWith(
      expect.objectContaining({ localRecordType: 'quick_add_entry' })
    );
    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({ local_record_type: 'quick_add_entry' })
    );
  });
});

// ────────────────────────────────────────────
// syncWeightToHealthPlatform
// ────────────────────────────────────────────

describe('syncWeightToHealthPlatform', () => {
  it('returns without calling anything when getHealthSyncService returns null', async () => {
    mockGetHealthSyncService.mockReturnValue(null);

    await syncWeightToHealthPlatform(WEIGHT_PARAMS);

    expect(mockLogHealthSync).not.toHaveBeenCalled();
  });

  it('returns without calling anything when service is not connected', async () => {
    const service = createMockService({ isConnected: jest.fn().mockReturnValue(false) });
    mockGetHealthSyncService.mockReturnValue(service);

    await syncWeightToHealthPlatform(WEIGHT_PARAMS);

    expect(service.writeWeight).not.toHaveBeenCalled();
    expect(mockLogHealthSync).not.toHaveBeenCalled();
  });

  it('calls writeWeight with the correct payload and logs success', async () => {
    const service = createMockService();
    mockGetHealthSyncService.mockReturnValue(service);

    await syncWeightToHealthPlatform(WEIGHT_PARAMS);

    expect(service.writeWeight).toHaveBeenCalledWith({
      weightKg: 82.5,
      timestamp: '2026-02-15T08:00:00.000Z',
      localRecordId: 'local-wt-1',
      localRecordType: 'weight_entry',
    });

    expect(mockLogHealthSync).toHaveBeenCalledWith({
      platform: 'apple_health',
      direction: 'write',
      data_type: 'weight',
      local_record_id: 'local-wt-1',
      local_record_type: 'weight_entry',
      external_id: 'ext-wt-1',
      status: 'success',
      error_message: null,
    });
  });

  it('logs error status when writeWeight rejects', async () => {
    const service = createMockService({
      writeWeight: jest.fn().mockRejectedValue(new Error('permission denied')),
    });
    mockGetHealthSyncService.mockReturnValue(service);

    await syncWeightToHealthPlatform(WEIGHT_PARAMS);

    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        error_message: 'permission denied',
        external_id: null,
      })
    );
  });
});

// ────────────────────────────────────────────
// syncWaterToHealthPlatform
// ────────────────────────────────────────────

describe('syncWaterToHealthPlatform', () => {
  it('returns without calling anything when getHealthSyncService returns null', async () => {
    mockGetHealthSyncService.mockReturnValue(null);

    await syncWaterToHealthPlatform(WATER_PARAMS);

    expect(mockLogHealthSync).not.toHaveBeenCalled();
  });

  it('returns without calling anything when service is not connected', async () => {
    const service = createMockService({ isConnected: jest.fn().mockReturnValue(false) });
    mockGetHealthSyncService.mockReturnValue(service);

    await syncWaterToHealthPlatform(WATER_PARAMS);

    expect(service.writeWater).not.toHaveBeenCalled();
    expect(mockLogHealthSync).not.toHaveBeenCalled();
  });

  it('calls writeWater with the correct payload and logs success', async () => {
    const service = createMockService();
    mockGetHealthSyncService.mockReturnValue(service);

    await syncWaterToHealthPlatform(WATER_PARAMS);

    expect(service.writeWater).toHaveBeenCalledWith({
      milliliters: 500,
      timestamp: '2026-02-15T10:00:00.000Z',
      localRecordId: 'local-water-1',
      localRecordType: 'water_entry',
    });

    expect(mockLogHealthSync).toHaveBeenCalledWith({
      platform: 'apple_health',
      direction: 'write',
      data_type: 'water',
      local_record_id: 'local-water-1',
      local_record_type: 'water_entry',
      external_id: 'ext-water-1',
      status: 'success',
      error_message: null,
    });
  });

  it('logs error status when writeWater rejects', async () => {
    const service = createMockService({
      writeWater: jest.fn().mockRejectedValue(new Error('network timeout')),
    });
    mockGetHealthSyncService.mockReturnValue(service);

    await syncWaterToHealthPlatform(WATER_PARAMS);

    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        error_message: 'network timeout',
        external_id: null,
      })
    );
  });
});

// ────────────────────────────────────────────
// safeExecute behavior (tested indirectly)
// ────────────────────────────────────────────

describe('safeExecute error handling', () => {
  it('extracts message from Error instances', async () => {
    const service = createMockService({
      writeNutrition: jest.fn().mockRejectedValue(new Error('specific error msg')),
    });
    mockGetHealthSyncService.mockReturnValue(service);

    await syncNutritionToHealthPlatform(NUTRITION_PARAMS);

    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({ error_message: 'specific error msg' })
    );
  });

  it('uses fallback prefix message for non-Error throws', async () => {
    const service = createMockService({
      writeNutrition: jest.fn().mockRejectedValue('some string error'),
    });
    mockGetHealthSyncService.mockReturnValue(service);

    await syncNutritionToHealthPlatform(NUTRITION_PARAMS);

    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({ error_message: 'nutrition sync failed' })
    );
  });

  it('uses "weight" prefix for non-Error throws in weight sync', async () => {
    const service = createMockService({
      writeWeight: jest.fn().mockRejectedValue(42),
    });
    mockGetHealthSyncService.mockReturnValue(service);

    await syncWeightToHealthPlatform(WEIGHT_PARAMS);

    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({ error_message: 'weight sync failed' })
    );
  });

  it('uses "water" prefix for non-Error throws in water sync', async () => {
    const service = createMockService({
      writeWater: jest.fn().mockRejectedValue(null),
    });
    mockGetHealthSyncService.mockReturnValue(service);

    await syncWaterToHealthPlatform(WATER_PARAMS);

    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({ error_message: 'water sync failed' })
    );
  });
});

// ────────────────────────────────────────────
// logHealthSync argument verification
// ────────────────────────────────────────────

describe('logHealthSync argument shape', () => {
  it('uses getPlatformName() for the platform field', async () => {
    const service = createMockService({
      getPlatformName: jest.fn().mockReturnValue('health_connect'),
    });
    mockGetHealthSyncService.mockReturnValue(service);

    await syncNutritionToHealthPlatform(NUTRITION_PARAMS);

    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'health_connect' })
    );
  });

  it('always uses direction "write" for nutrition sync', async () => {
    const service = createMockService();
    mockGetHealthSyncService.mockReturnValue(service);

    await syncNutritionToHealthPlatform(NUTRITION_PARAMS);

    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'write' })
    );
  });

  it('always uses direction "write" for weight sync', async () => {
    const service = createMockService();
    mockGetHealthSyncService.mockReturnValue(service);

    await syncWeightToHealthPlatform(WEIGHT_PARAMS);

    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'write' })
    );
  });

  it('always uses direction "write" for water sync', async () => {
    const service = createMockService();
    mockGetHealthSyncService.mockReturnValue(service);

    await syncWaterToHealthPlatform(WATER_PARAMS);

    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'write' })
    );
  });

  it('sets data_type to "nutrition" for nutrition sync', async () => {
    const service = createMockService();
    mockGetHealthSyncService.mockReturnValue(service);

    await syncNutritionToHealthPlatform(NUTRITION_PARAMS);

    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({ data_type: 'nutrition' })
    );
  });

  it('sets data_type to "weight" for weight sync', async () => {
    const service = createMockService();
    mockGetHealthSyncService.mockReturnValue(service);

    await syncWeightToHealthPlatform(WEIGHT_PARAMS);

    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({ data_type: 'weight' })
    );
  });

  it('sets data_type to "water" for water sync', async () => {
    const service = createMockService();
    mockGetHealthSyncService.mockReturnValue(service);

    await syncWaterToHealthPlatform(WATER_PARAMS);

    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({ data_type: 'water' })
    );
  });

  it('maps externalId from result to external_id in log', async () => {
    const service = createMockService({
      writeWeight: jest.fn().mockResolvedValue({ success: true, externalId: 'hk-sample-99' }),
    });
    mockGetHealthSyncService.mockReturnValue(service);

    await syncWeightToHealthPlatform(WEIGHT_PARAMS);

    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({ external_id: 'hk-sample-99' })
    );
  });

  it('sets external_id to null when externalId is absent from result', async () => {
    const service = createMockService({
      writeWater: jest.fn().mockResolvedValue({ success: true }),
    });
    mockGetHealthSyncService.mockReturnValue(service);

    await syncWaterToHealthPlatform(WATER_PARAMS);

    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({ external_id: null })
    );
  });

  it('sets error_message to null on success', async () => {
    const service = createMockService();
    mockGetHealthSyncService.mockReturnValue(service);

    await syncNutritionToHealthPlatform(NUTRITION_PARAMS);

    expect(mockLogHealthSync).toHaveBeenCalledWith(
      expect.objectContaining({ error_message: null })
    );
  });
});
