/**
 * Health Sync Orchestrator Tests
 *
 * Tests the app-open health sync flow including:
 * - Guard clauses (no service, not connected, concurrency lock)
 * - Success path (weight import + activity metrics read)
 * - Error handling and syncing flag reset
 */

import type { HealthSyncService } from '@/services/healthSyncService';

// ── Mock factories ──

const mockImportFromHealthKit = jest.fn().mockResolvedValue({ imported: false });

jest.mock('@/stores/weightStore', () => ({
  useWeightStore: {
    getState: () => ({
      importFromHealthKit: mockImportFromHealthKit,
    }),
  },
}));

const mockService: jest.Mocked<
  Pick<HealthSyncService, 'isConnected' | 'readActiveCalories' | 'readSteps' | 'getPlatformName'>
> = {
  isConnected: jest.fn(),
  readActiveCalories: jest.fn(),
  readSteps: jest.fn(),
  getPlatformName: jest.fn(),
};

const mockGetHealthSyncService = jest.fn<ReturnType<typeof import('@/services/healthSyncService').getHealthSyncService>, []>();

jest.mock('@/services/healthSyncService', () => ({
  getHealthSyncService: (...args: unknown[]) => mockGetHealthSyncService(...(args as [])),
}));

// ── Helpers ──

/**
 * Import `performAppOpenHealthSync` from an isolated module to reset
 * the private `syncing` variable for each test.
 */
function loadFreshModule() {
  let performAppOpenHealthSync: () => Promise<void>;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    performAppOpenHealthSync = require('@/services/healthSyncOrchestrator').performAppOpenHealthSync;
  });
  return performAppOpenHealthSync!;
}

function setupConnectedService() {
  mockService.isConnected.mockReturnValue(true);
  mockService.readActiveCalories.mockResolvedValue(350);
  mockService.readSteps.mockResolvedValue(8000);
  mockService.getPlatformName.mockReturnValue('apple_health');
  mockGetHealthSyncService.mockReturnValue(mockService as unknown as HealthSyncService);
}

// ── Tests ──

describe('performAppOpenHealthSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Guard: no service ──

  it('does nothing when getHealthSyncService returns null', async () => {
    mockGetHealthSyncService.mockReturnValue(null);
    const performAppOpenHealthSync = loadFreshModule();

    await performAppOpenHealthSync();

    expect(mockGetHealthSyncService).toHaveBeenCalled();
    expect(mockImportFromHealthKit).not.toHaveBeenCalled();
  });

  // ── Guard: not connected ──

  it('does nothing when the service is not connected', async () => {
    mockService.isConnected.mockReturnValue(false);
    mockGetHealthSyncService.mockReturnValue(mockService as unknown as HealthSyncService);
    const performAppOpenHealthSync = loadFreshModule();

    await performAppOpenHealthSync();

    expect(mockService.isConnected).toHaveBeenCalled();
    expect(mockImportFromHealthKit).not.toHaveBeenCalled();
  });

  // ── Guard: concurrent calls ──

  it('blocks a second call while the first is still in-flight (syncing guard)', async () => {
    setupConnectedService();

    // Make importFromHealthKit hang until we release it
    let resolveImport!: () => void;
    mockImportFromHealthKit.mockReturnValue(
      new Promise<{ imported: boolean }>((resolve) => {
        resolveImport = () => resolve({ imported: true });
      }),
    );

    const performAppOpenHealthSync = loadFreshModule();

    // First call starts and blocks on importFromHealthKit
    const first = performAppOpenHealthSync();

    // Second call should bail immediately because syncing = true
    const second = performAppOpenHealthSync();
    await second; // resolves instantly (guard early-return)

    // importFromHealthKit should only have been called once (by the first call)
    expect(mockImportFromHealthKit).toHaveBeenCalledTimes(1);

    // Release the first call
    resolveImport();
    await first;

    // Still only one invocation
    expect(mockImportFromHealthKit).toHaveBeenCalledTimes(1);
  });

  // ── Success path ──

  it('imports weight and reads activity metrics on success', async () => {
    setupConnectedService();
    mockImportFromHealthKit.mockResolvedValue({ imported: true, weight: 80 });
    const performAppOpenHealthSync = loadFreshModule();

    await performAppOpenHealthSync();

    expect(mockImportFromHealthKit).toHaveBeenCalledTimes(1);
    expect(mockService.readActiveCalories).toHaveBeenCalledTimes(1);
    expect(mockService.readSteps).toHaveBeenCalledTimes(1);

    // Verify the date range arguments are ISO strings for today
    const [startArg, endArg] = mockService.readActiveCalories.mock.calls[0];
    expect(typeof startArg).toBe('string');
    expect(typeof endArg).toBe('string');
    // Start should be midnight today (hours/minutes/seconds = 0)
    const startDate = new Date(startArg);
    expect(startDate.getHours()).toBe(0);
    expect(startDate.getMinutes()).toBe(0);
    expect(startDate.getSeconds()).toBe(0);

    // Steps should receive the same date range
    expect(mockService.readSteps).toHaveBeenCalledWith(startArg, endArg);
  });

  it('logs activity metrics in __DEV__ mode', async () => {
    setupConnectedService();
    mockImportFromHealthKit.mockResolvedValue({ imported: false });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const performAppOpenHealthSync = loadFreshModule();

    await performAppOpenHealthSync();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[HealthSync]'),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('apple_health'),
    );

    consoleSpy.mockRestore();
  });

  // ── Error handling ──

  it('does not crash when importFromHealthKit throws', async () => {
    setupConnectedService();
    mockImportFromHealthKit.mockRejectedValue(new Error('HealthKit unavailable'));
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const performAppOpenHealthSync = loadFreshModule();

    // Should not throw
    await expect(performAppOpenHealthSync()).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      '[HealthSyncOrchestrator] app-open sync failed',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('does not crash when readActiveCalories throws', async () => {
    setupConnectedService();
    mockService.readActiveCalories.mockRejectedValue(new Error('permission denied'));
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const performAppOpenHealthSync = loadFreshModule();

    await expect(performAppOpenHealthSync()).resolves.toBeUndefined();

    consoleSpy.mockRestore();
  });

  // ── Syncing flag reset ──

  it('resets the syncing flag after a successful sync so the next call works', async () => {
    setupConnectedService();
    mockImportFromHealthKit.mockResolvedValue({ imported: false });
    const performAppOpenHealthSync = loadFreshModule();

    await performAppOpenHealthSync();
    expect(mockImportFromHealthKit).toHaveBeenCalledTimes(1);

    // Second call should also work (syncing was reset in finally)
    await performAppOpenHealthSync();
    expect(mockImportFromHealthKit).toHaveBeenCalledTimes(2);
  });

  it('resets the syncing flag after a failed sync so the next call works', async () => {
    setupConnectedService();

    // First call: error
    mockImportFromHealthKit.mockRejectedValueOnce(new Error('boom'));
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const performAppOpenHealthSync = loadFreshModule();

    await performAppOpenHealthSync();
    expect(mockImportFromHealthKit).toHaveBeenCalledTimes(1);

    // Second call: should succeed (syncing flag was reset in finally)
    mockImportFromHealthKit.mockResolvedValueOnce({ imported: true, weight: 75 });
    await performAppOpenHealthSync();
    expect(mockImportFromHealthKit).toHaveBeenCalledTimes(2);

    consoleSpy.mockRestore();
  });

  // ── Syncing flag reset on guard early-return ──

  it('resets the syncing flag when service is null (early return in try block)', async () => {
    mockGetHealthSyncService.mockReturnValue(null);
    const performAppOpenHealthSync = loadFreshModule();

    await performAppOpenHealthSync();

    // Now switch to a connected service and call again - should work
    setupConnectedService();
    mockImportFromHealthKit.mockResolvedValue({ imported: false });

    await performAppOpenHealthSync();
    expect(mockImportFromHealthKit).toHaveBeenCalledTimes(1);
  });
});
