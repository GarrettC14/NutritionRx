import { SQLiteDatabase } from 'expo-sqlite';

/**
 * Migration 015: Add timeline planning fields to goals
 *
 * Adds planning_mode and target_date columns to the goals table
 * to support deadline-based planning as an alternative to rate-based planning.
 */
export async function migration015GoalTimeline(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    -- Add planning mode column (defaults to 'rate' for backwards compatibility)
    ALTER TABLE goals ADD COLUMN planning_mode TEXT DEFAULT 'rate';

    -- Add target date column for timeline-based planning
    ALTER TABLE goals ADD COLUMN target_date TEXT;

    -- Record schema version
    INSERT INTO schema_version (version, applied_at) VALUES (15, datetime('now'));
  `);
}
