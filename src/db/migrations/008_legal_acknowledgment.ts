import { SQLiteDatabase } from 'expo-sqlite';

export async function migration008LegalAcknowledgment(db: SQLiteDatabase): Promise<void> {
  // Legal acknowledgment uses the existing user_settings key-value store
  // No schema changes needed - we just track these as settings:
  // - legal_acknowledged (boolean)
  // - legal_acknowledged_at (ISO timestamp)
  // - legal_acknowledged_version (string)

  // Record migration
  await db.execAsync(`
    INSERT INTO schema_version (version) VALUES (8);
  `);
}
