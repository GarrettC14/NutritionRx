// Mock expo-file-system's new API (Paths, File, Directory)
jest.mock('expo-file-system', () => ({
  Paths: { document: '/mock/documents' },
  File: jest.fn().mockImplementation((...args: unknown[]) => {
    const uri = typeof args[0] === 'string' ? args[0] : `${args[0]}/${args[1]}`;
    return {
      uri,
      exists: true,
      write: jest.fn(),
      delete: jest.fn(),
    };
  }),
  Directory: jest.fn().mockImplementation(() => ({
    exists: true,
    create: jest.fn(),
  })),
}));

// Mock global fetch for image downloads
const mockFetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
});
global.fetch = mockFetch as any;

// Mock __DEV__
(global as any).__DEV__ = true;

import {
  seedProgressPhotos,
  seedPhotoComparisons,
  clearSeedProgressPhotos,
} from '../progressPhotoGenerator';

const createMockDb = () => ({
  runAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue([]),
});

describe('seedProgressPhotos', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('returns the number of photos downloaded', async () => {
    const db = createMockDb() as any;
    const result = await seedProgressPhotos(db, 3, false);
    expect(typeof result).toBe('number');
    // There are 12 photos in PHOTO_SCHEDULE
    expect(result).toBe(12);
  });

  it('calls fetch for each photo (full + thumbnail)', async () => {
    const db = createMockDb() as any;
    await seedProgressPhotos(db, 3, false);
    // 12 photos × 2 fetches each = 24
    expect(mockFetch).toHaveBeenCalledTimes(24);
  });

  it('inserts into progress_photos table', async () => {
    const db = createMockDb() as any;
    await seedProgressPhotos(db, 3, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    for (const call of insertCalls) {
      expect(call[0]).toContain('progress_photos');
    }
  });

  it('handles fetch failures gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    const result = await seedProgressPhotos(db, 3, false);
    // Should still complete, with 11 successful photos
    expect(result).toBe(11);
    spy.mockRestore();
  });

  it('uses seed-photo ID prefix', async () => {
    const db = createMockDb() as any;
    await seedProgressPhotos(db, 3, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    if (insertCalls.length > 0) {
      const values: unknown[] = insertCalls[0][1];
      const ids = values.filter((v) => typeof v === 'string' && (v as string).startsWith('seed-photo'));
      expect(ids.length).toBeGreaterThan(0);
    }
  });

  it('logs progress when verbose', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedProgressPhotos(db, 3, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Downloading'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted'));
    spy.mockRestore();
  });
});

describe('seedPhotoComparisons', () => {
  it('returns 0 when fewer than 2 photos exist', async () => {
    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([
        { id: 'p1', date: '2025-01-01' },
      ]),
    } as any;
    const result = await seedPhotoComparisons(db, false);
    expect(result).toBe(0);
  });

  it('creates comparisons when photos exist', async () => {
    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([
        { id: 'p1', date: '2025-01-01' },
        { id: 'p2', date: '2025-01-15' },
        { id: 'p3', date: '2025-02-01' },
        { id: 'p4', date: '2025-02-15' },
      ]),
    } as any;
    const result = await seedPhotoComparisons(db, false);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(4);
  });

  it('inserts into photo_comparisons table', async () => {
    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([
        { id: 'p1', date: '2025-01-01' },
        { id: 'p2', date: '2025-02-01' },
      ]),
    } as any;
    await seedPhotoComparisons(db, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    for (const call of insertCalls) {
      expect(call[0]).toContain('photo_comparisons');
    }
  });

  it('queries progress_photos ordered by date', async () => {
    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([]),
    } as any;
    await seedPhotoComparisons(db, false);
    const sql: string = db.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('progress_photos');
    expect(sql).toContain('ORDER BY date ASC');
  });
});

describe('clearSeedProgressPhotos', () => {
  it('queries for seeded photos and deletes them', async () => {
    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([
        { id: 'seed-photo-0', local_uri: '/mock/photo_0.jpg', thumbnail_uri: '/mock/thumb_0.jpg' },
        { id: 'seed-photo-1', local_uri: '/mock/photo_1.jpg', thumbnail_uri: null },
      ]),
    } as any;
    await clearSeedProgressPhotos(db, false);
    // Should query for seed photos
    expect(db.getAllAsync).toHaveBeenCalledTimes(1);
    const sql: string = db.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('seed-photo');
    // Should delete from both tables
    expect(db.runAsync).toHaveBeenCalledTimes(2);
  });

  it('handles empty photo list gracefully', async () => {
    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([]),
    } as any;
    await clearSeedProgressPhotos(db, false);
    // Should still call delete SQL even with 0 photos
    expect(db.runAsync).toHaveBeenCalledTimes(2);
  });

  it('logs when verbose', async () => {
    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([]),
    } as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await clearSeedProgressPhotos(db, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Cleared'));
    spy.mockRestore();
  });
});
