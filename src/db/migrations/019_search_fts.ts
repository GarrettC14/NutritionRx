import { SQLiteDatabase } from 'expo-sqlite';

export async function migration019SearchFts(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    -- FTS5 virtual table for food_items substring search
    CREATE VIRTUAL TABLE IF NOT EXISTS food_items_fts USING fts5(
      name,
      brand,
      content='food_items',
      content_rowid='rowid'
    );

    -- Populate FTS index from existing food_items
    INSERT INTO food_items_fts (rowid, name, brand)
    SELECT rowid, name, COALESCE(brand, '') FROM food_items;

    -- Triggers to keep FTS in sync with food_items
    CREATE TRIGGER IF NOT EXISTS food_items_fts_insert AFTER INSERT ON food_items BEGIN
      INSERT INTO food_items_fts (rowid, name, brand) VALUES (NEW.rowid, NEW.name, COALESCE(NEW.brand, ''));
    END;

    CREATE TRIGGER IF NOT EXISTS food_items_fts_delete AFTER DELETE ON food_items BEGIN
      INSERT INTO food_items_fts (food_items_fts, rowid, name, brand) VALUES ('delete', OLD.rowid, OLD.name, COALESCE(OLD.brand, ''));
    END;

    CREATE TRIGGER IF NOT EXISTS food_items_fts_update AFTER UPDATE ON food_items BEGIN
      INSERT INTO food_items_fts (food_items_fts, rowid, name, brand) VALUES ('delete', OLD.rowid, OLD.name, COALESCE(OLD.brand, ''));
      INSERT INTO food_items_fts (rowid, name, brand) VALUES (NEW.rowid, NEW.name, COALESCE(NEW.brand, ''));
    END;

    INSERT INTO schema_version (version) VALUES (19);
  `);
}
