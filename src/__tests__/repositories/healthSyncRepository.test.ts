/**
 * Health Sync Repository Tests
 * Tests for health sync log data access (Apple Health / Health Connect)
 */

import {
  logHealthSync,
  getLastSyncTimestamp,
  hasExternalId,
} from '@/repositories/healthSyncRepository';

// Mock the database module
const mockGetFirstAsync = jest.fn();
const mockRunAsync = jest.fn();

const mockDb = {
  getFirstAsync: mockGetFirstAsync,
  runAsync: mockRunAsync,
};

jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

jest.mock('@/utils/generateId', () => ({
  generateId: jest.fn(() => 'test-uuid-health'),
}));

describe('healthSyncRepository', () => {
  beforeEach(() => {
    mockGetFirstAsync.mockReset();
    mockRunAsync.mockReset();
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2025-02-15T12:00:00.000Z');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('logHealthSync', () => {
    it('inserts a row with all params provided', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      await logHealthSync({
        platform: 'apple_health',
        direction: 'read',
        data_type: 'body_weight',
        local_record_id: 'local-123',
        local_record_type: 'weight',
        external_id: 'ext-456',
        status: 'success',
        error_message: null,
      });

      expect(mockRunAsync).toHaveBeenCalledTimes(1);
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO health_sync_log'),
        [
          'test-uuid-health',
          'apple_health',
          'read',
          'body_weight',
          'local-123',
          'weight',
          'ext-456',
          'success',
          null,
          '2025-02-15T12:00:00.000Z',
          '2025-02-15T12:00:00.000Z',
        ]
      );
    });

    it('inserts a row with optional params null/undefined', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      await logHealthSync({
        platform: 'health_connect',
        direction: 'write',
        data_type: 'nutrition',
        status: 'error',
        error_message: 'Timeout',
      });

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO health_sync_log'),
        [
          'test-uuid-health',
          'health_connect',
          'write',
          'nutrition',
          null,
          null,
          null,
          'error',
          'Timeout',
          '2025-02-15T12:00:00.000Z',
          '2025-02-15T12:00:00.000Z',
        ]
      );
    });

    it('returns the generated id', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      const id = await logHealthSync({
        platform: 'apple_health',
        direction: 'import',
        data_type: 'body_weight',
        status: 'skipped_duplicate',
      });

      expect(id).toBe('test-uuid-health');
    });
  });

  describe('getLastSyncTimestamp', () => {
    it('queries with dataType when provided (3-param query)', async () => {
      mockGetFirstAsync.mockResolvedValue({ last: '2025-02-14T10:00:00.000Z' });

      const result = await getLastSyncTimestamp('apple_health', 'read', 'body_weight');

      expect(result).toBe('2025-02-14T10:00:00.000Z');
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('data_type = ?'),
        ['apple_health', 'read', 'body_weight']
      );
    });

    it('queries without dataType when omitted (2-param query)', async () => {
      mockGetFirstAsync.mockResolvedValue({ last: '2025-02-13T08:00:00.000Z' });

      const result = await getLastSyncTimestamp('health_connect', 'write');

      expect(result).toBe('2025-02-13T08:00:00.000Z');
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.not.stringContaining('data_type = ?'),
        ['health_connect', 'write']
      );
    });

    it('returns null when no results found', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await getLastSyncTimestamp('apple_health', 'read', 'body_weight');

      expect(result).toBeNull();
    });

    it('returns null when result.last is null', async () => {
      mockGetFirstAsync.mockResolvedValue({ last: null });

      const result = await getLastSyncTimestamp('apple_health', 'read');

      expect(result).toBeNull();
    });
  });

  describe('hasExternalId', () => {
    it('returns true when a matching record exists', async () => {
      mockGetFirstAsync.mockResolvedValue({ id: 'some-id' });

      const result = await hasExternalId('apple_health', 'body_weight', 'ext-789');

      expect(result).toBe(true);
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE platform = ? AND data_type = ? AND external_id = ?'),
        ['apple_health', 'body_weight', 'ext-789']
      );
    });

    it('returns false when no matching record exists', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await hasExternalId('health_connect', 'nutrition', 'ext-000');

      expect(result).toBe(false);
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE platform = ? AND data_type = ? AND external_id = ?'),
        ['health_connect', 'nutrition', 'ext-000']
      );
    });
  });
});
