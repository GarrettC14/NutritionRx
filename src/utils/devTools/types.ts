export interface SeedOptions {
  clearExisting: boolean;
  includeEdgeCases: boolean;
  monthsOfHistory: number; // 1-24, default 6
  verboseLogging: boolean;
}

export interface SeedProgress {
  currentEntity: string; // "Food Log Entries"
  currentCount: number;
  totalCount: number;
  phase: string; // "Clearing..." | "Seeding..." | "Complete"
  startedAt: number;
}

export interface SeedResult {
  success: boolean;
  duration: number;
  counts: Record<string, number>;
  errors: string[];
  warnings: string[];
}

export const DEFAULT_SEED_OPTIONS: SeedOptions = {
  clearExisting: true,
  includeEdgeCases: false,
  monthsOfHistory: 6,
  verboseLogging: false,
};
