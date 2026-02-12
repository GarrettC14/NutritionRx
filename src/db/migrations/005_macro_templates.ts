import { SQLiteDatabase } from 'expo-sqlite';

/**
 * Migration 005: Add Macro Template Support
 *
 * Adds eating_style and protein_priority fields to user_profile and goals tables.
 * These enable customizable macro distribution based on user preferences.
 *
 * Eating Styles:
 * - flexible: 50/50 carb/fat split (balanced)
 * - carb_focused: 65/35 carb/fat split (performance)
 * - fat_focused: 35/65 carb/fat split, 150g carb cap
 * - very_low_carb: 10/90 carb/fat split, 50g carb cap (keto)
 *
 * Protein Priority:
 * - standard: 0.6g per lb (general health)
 * - active: 0.75g per lb (regular exercise)
 * - athletic: 0.9g per lb (muscle building)
 * - maximum: 1.0g per lb (serious athletes)
 */
export async function migration005MacroTemplates(db: SQLiteDatabase): Promise<void> {
  // Add eating_style and protein_priority to user_profile
  await db.execAsync(`
    ALTER TABLE user_profile ADD COLUMN eating_style TEXT DEFAULT 'flexible';
  `);

  await db.execAsync(`
    ALTER TABLE user_profile ADD COLUMN protein_priority TEXT DEFAULT 'active';
  `);

  // Add eating_style and protein_priority to goals table
  // These store the template used when the goal was created for historical accuracy
  await db.execAsync(`
    ALTER TABLE goals ADD COLUMN eating_style TEXT DEFAULT 'flexible';
  `);

  await db.execAsync(`
    ALTER TABLE goals ADD COLUMN protein_priority TEXT DEFAULT 'active';
  `);

  // Record migration
  await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', [5]);

  if (__DEV__) console.log('Migration 005: Added macro template fields (eating_style, protein_priority)');
}
