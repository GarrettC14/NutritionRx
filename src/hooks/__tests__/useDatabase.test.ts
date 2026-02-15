import { renderHook, waitFor } from '@testing-library/react-native';
import { SQLiteDatabase } from 'expo-sqlite';
import { useDatabase, useDatabaseSync } from '../useDatabase';
import { initDatabase, getDatabase } from '@/db/database';

jest.mock('@/db/database');

const mockInitDatabase = initDatabase as jest.MockedFunction<typeof initDatabase>;
const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

const mockDb = {
  execAsync: jest.fn(),
  runAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  getAllAsync: jest.fn(),
  withTransactionAsync: jest.fn(),
} as unknown as SQLiteDatabase;

describe('useDatabase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial state before init resolves', () => {
    // initDatabase never resolves during this test
    mockInitDatabase.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useDatabase());

    expect(result.current.db).toBeNull();
    expect(result.current.isReady).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets db and isReady after successful init', async () => {
    mockInitDatabase.mockResolvedValue(mockDb);

    const { result } = renderHook(() => useDatabase());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.db).toBe(mockDb);
    expect(result.current.error).toBeNull();
  });

  it('sets error when initDatabase rejects with an Error instance', async () => {
    const dbError = new Error('Connection failed');
    mockInitDatabase.mockRejectedValue(dbError);

    const { result } = renderHook(() => useDatabase());

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error).toBe(dbError);
    expect(result.current.error!.message).toBe('Connection failed');
    expect(result.current.db).toBeNull();
    expect(result.current.isReady).toBe(false);
  });

  it('wraps non-Error thrown values in Error with default message', async () => {
    mockInitDatabase.mockRejectedValue('some string error');

    const { result } = renderHook(() => useDatabase());

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe('Failed to initialize database');
    expect(result.current.db).toBeNull();
    expect(result.current.isReady).toBe(false);
  });

  it('does not update state after unmount (no memory leak)', async () => {
    // Use a deferred promise so we can control when initDatabase resolves
    let resolveInit!: (value: SQLiteDatabase) => void;
    mockInitDatabase.mockReturnValue(
      new Promise<SQLiteDatabase>((resolve) => {
        resolveInit = resolve;
      })
    );

    const { result, unmount } = renderHook(() => useDatabase());

    // Verify initial state
    expect(result.current.db).toBeNull();
    expect(result.current.isReady).toBe(false);

    // Unmount the hook before init resolves
    unmount();

    // Now resolve the promise after unmount
    resolveInit(mockDb);

    // Give any potential state updates time to flush
    await new Promise((resolve) => setTimeout(resolve, 50));

    // State should remain in initial values since component unmounted
    // The isMounted flag prevents setState calls after unmount
    expect(result.current.db).toBeNull();
    expect(result.current.isReady).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('calls initDatabase exactly once', async () => {
    mockInitDatabase.mockResolvedValue(mockDb);

    renderHook(() => useDatabase());

    await waitFor(() => {
      expect(mockInitDatabase).toHaveBeenCalled();
    });

    expect(mockInitDatabase).toHaveBeenCalledTimes(1);
  });
});

describe('useDatabaseSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the result of getDatabase()', () => {
    mockGetDatabase.mockReturnValue(mockDb);

    const { result } = renderHook(() => useDatabaseSync());

    expect(mockGetDatabase).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(mockDb);
  });

  it('throws when getDatabase() throws', () => {
    mockGetDatabase.mockImplementation(() => {
      throw new Error('Database not initialized. Call initDatabase() first.');
    });

    expect(() => {
      renderHook(() => useDatabaseSync());
    }).toThrow('Database not initialized. Call initDatabase() first.');
  });
});
