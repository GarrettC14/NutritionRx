import { useEffect, useState } from 'react';
import { SQLiteDatabase } from 'expo-sqlite';
import { initDatabase, getDatabase } from '@/db/database';

interface UseDatabaseResult {
  db: SQLiteDatabase | null;
  isReady: boolean;
  error: Error | null;
}

export function useDatabase(): UseDatabaseResult {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [db, setDb] = useState<SQLiteDatabase | null>(null);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const database = await initDatabase();
        if (isMounted) {
          setDb(database);
          setIsReady(true);
        }
      } catch (e) {
        if (isMounted) {
          setError(e instanceof Error ? e : new Error('Failed to initialize database'));
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  return { db, isReady, error };
}

// Hook for using an already-initialized database
export function useDatabaseSync(): SQLiteDatabase {
  return getDatabase();
}
