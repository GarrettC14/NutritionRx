# NutritionRx Database Schema Map

> Auto-generated from migrations 001-013. Schema version: **13**

## Table of Contents

- [Summary](#summary)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Tables by Migration](#tables-by-migration)
  - [001 - Initial Schema](#migration-001-initial-schema)
  - [002 - Goals & User Profile](#migration-002-goals--user-profile)
  - [003 - Health Sync & Backup](#migration-003-health-sync--backup)
  - [004 - Seed Foods (data only)](#migration-004-seed-foods)
  - [005 - Macro Templates](#migration-005-macro-templates)
  - [006 - Seed Mock Data (data only)](#migration-006-seed-mock-data)
  - [007 - Favorite Foods](#migration-007-favorite-foods)
  - [008 - Legal Acknowledgment (data only)](#migration-008-legal-acknowledgment)
  - [009 - Restaurant & USDA Foods (data only)](#migration-009-restaurant--usda-foods)
  - [010 - Water Tracking](#migration-010-water-tracking)
  - [011 - Restaurants](#migration-011-restaurants)
  - [012 - Planning Features](#migration-012-planning-features)
  - [013 - Micronutrients & Photos](#migration-013-micronutrients--photos)
- [Enums & Constrained Values](#enums--constrained-values)
- [Foreign Key Map](#foreign-key-map)
- [Singleton Tables](#singleton-tables)

---

## Summary

| Metric | Count |
|--------|-------|
| Total tables | 33 |
| Regular tables | 32 |
| Virtual tables (FTS) | 1 |
| Total columns | ~200 |
| Foreign keys | 12 |
| Indexes | 35+ |
| Schema migrations | 13 |

### Tables by Category

| Category | Tables | Count |
|----------|--------|-------|
| Food & Nutrition Core | food_items, log_entries, quick_add_entries | 3 |
| Goals & Progress | goals, weekly_reflections, weight_entries, daily_metabolism | 4 |
| User Profile & Settings | user_profile, user_settings | 2 |
| Favorites | favorite_foods | 1 |
| Restaurants | restaurants, menu_categories, restaurant_foods, restaurant_foods_fts, food_variants, restaurant_food_logs, user_restaurant_usage | 7 |
| Water & Fasting | water_log, fasting_config, fasting_sessions | 3 |
| Macro Cycling | macro_cycle_config, macro_cycle_overrides | 2 |
| Meal Planning | meal_plan_settings, planned_meals | 2 |
| Micronutrients | nutrient_settings, custom_nutrient_targets, food_item_nutrients, daily_nutrient_intake, nutrient_contributors | 5 |
| Progress Photos | progress_photos, photo_comparisons | 2 |
| Health Sync & Backup | health_sync_log, backup_metadata | 2 |
| System | schema_version | 1 |

---

## Entity Relationship Diagram

```
schema_version (system)

user_profile (singleton)
user_settings (key-value store)

food_items ──┬── log_entries ──── nutrient_contributors
             ├── favorite_foods
             └── food_item_nutrients

log_entries ← nutrient_contributors

goals ──── weekly_reflections

weight_entries (standalone)
daily_metabolism (standalone)
quick_add_entries (standalone)
water_log (standalone)

restaurants ──┬── menu_categories
              ├── restaurant_foods ──┬── food_variants
              │                      └── restaurant_food_logs
              └── user_restaurant_usage

restaurant_food_logs ← food_variants (optional)

fasting_config (singleton)
fasting_sessions (standalone)

macro_cycle_config (singleton)
macro_cycle_overrides (standalone)

meal_plan_settings (singleton)
planned_meals (standalone)

nutrient_settings (singleton)
custom_nutrient_targets (standalone)
daily_nutrient_intake (standalone)

progress_photos ──── photo_comparisons (photo1_id, photo2_id)

health_sync_log (standalone)
backup_metadata (standalone)
```

---

## Tables by Migration

### Migration 001: Initial Schema

#### `schema_version`
System table tracking applied migrations.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| version | INTEGER | PRIMARY KEY | — | Migration version number |
| applied_at | TEXT | NOT NULL | `datetime('now')` | When migration was applied |

#### `food_items`
Central food database containing seed, user-created, restaurant, and USDA foods.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Prefixed: `seed-`, `user-`, `restaurant-`, `usda-` |
| name | TEXT | NOT NULL | — | Food name |
| brand | TEXT | — | NULL | Brand name |
| barcode | TEXT | — | NULL | UPC/EAN barcode |
| calories | REAL | NOT NULL | — | Per serving |
| protein | REAL | NOT NULL | 0 | Grams per serving |
| carbs | REAL | NOT NULL | 0 | Grams per serving |
| fat | REAL | NOT NULL | 0 | Grams per serving |
| fiber | REAL | — | NULL | Grams per serving |
| sugar | REAL | — | NULL | Grams per serving |
| sodium | REAL | — | NULL | Milligrams per serving |
| serving_size | REAL | NOT NULL | — | Numeric serving amount |
| serving_unit | TEXT | NOT NULL | — | Unit label (g, oz, cup, etc.) |
| serving_size_grams | REAL | — | NULL | Gram equivalent |
| source | TEXT | NOT NULL | — | Data origin: `seed`, `user`, `openfoodfacts`, `usda`, `restaurant` |
| source_id | TEXT | — | NULL | External ID from source |
| is_verified | INTEGER | — | 0 | Verified flag (0/1) |
| is_user_created | INTEGER | — | 0 | User-created flag (0/1) |
| last_used_at | TEXT | — | NULL | ISO datetime of last use |
| usage_count | INTEGER | — | 0 | Times logged |
| created_at | TEXT | NOT NULL | — | ISO datetime |
| updated_at | TEXT | NOT NULL | — | ISO datetime |

**Indexes:**
- `idx_food_items_barcode` ON (barcode)
- `idx_food_items_name` ON (name COLLATE NOCASE)
- `idx_food_items_recent` ON (last_used_at DESC)
- `idx_food_items_source` ON (source)

#### `log_entries`
Individual food log entries linked to food items.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique entry ID |
| food_item_id | TEXT | NOT NULL, FK → food_items(id) | — | Reference to food item |
| date | TEXT | NOT NULL | — | YYYY-MM-DD |
| meal_type | TEXT | NOT NULL | — | `breakfast`, `lunch`, `dinner`, `snack` |
| servings | REAL | NOT NULL | — | Number of servings |
| calories | REAL | NOT NULL | — | Calculated: food.calories × servings |
| protein | REAL | NOT NULL | — | Calculated |
| carbs | REAL | NOT NULL | — | Calculated |
| fat | REAL | NOT NULL | — | Calculated |
| notes | TEXT | — | NULL | Optional notes |
| created_at | TEXT | NOT NULL | — | ISO datetime |
| updated_at | TEXT | NOT NULL | — | ISO datetime |

**Foreign Keys:** food_item_id → food_items(id) ON DELETE CASCADE
**Indexes:**
- `idx_log_entries_date` ON (date)
- `idx_log_entries_date_meal` ON (date, meal_type)
- `idx_log_entries_food` ON (food_item_id)

#### `quick_add_entries`
Quick-add entries with manual calorie/macro input (no food item reference).

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique entry ID |
| date | TEXT | NOT NULL | — | YYYY-MM-DD |
| meal_type | TEXT | NOT NULL | — | `breakfast`, `lunch`, `dinner`, `snack` |
| calories | REAL | NOT NULL | — | Manual calorie entry |
| protein | REAL | — | NULL | Optional |
| carbs | REAL | — | NULL | Optional |
| fat | REAL | — | NULL | Optional |
| description | TEXT | — | NULL | Optional description |
| created_at | TEXT | NOT NULL | — | ISO datetime |
| updated_at | TEXT | NOT NULL | — | ISO datetime |

**Indexes:**
- `idx_quick_add_date` ON (date)

#### `weight_entries`
Daily weight tracking.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique entry ID |
| date | TEXT | NOT NULL, UNIQUE | — | YYYY-MM-DD (one entry per day) |
| weight_kg | REAL | NOT NULL | — | Weight in kilograms |
| notes | TEXT | — | NULL | Optional notes |
| created_at | TEXT | NOT NULL | — | ISO datetime |
| updated_at | TEXT | NOT NULL | — | ISO datetime |

**Indexes:**
- `idx_weight_entries_date` ON (date DESC)

#### `user_settings`
Key-value settings store.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| key | TEXT | PRIMARY KEY | — | Setting name |
| value | TEXT | NOT NULL | — | Setting value (stringified) |
| updated_at | TEXT | NOT NULL | — | ISO datetime |

**Default Keys:**
| Key | Default Value | Description |
|-----|---------------|-------------|
| `weight_unit` | `'lbs'` | Display unit: `lbs` or `kg` |
| `theme` | `'dark'` | App theme: `dark` or `light` |
| `daily_calorie_goal` | `'2000'` | Daily calorie target |
| `daily_protein_goal` | `'150'` | Daily protein target (g) |
| `daily_carbs_goal` | `'200'` | Daily carbs target (g) |
| `daily_fat_goal` | `'65'` | Daily fat target (g) |
| `has_seen_onboarding` | `'0'` | Onboarding completion flag |

---

### Migration 002: Goals & User Profile

#### `user_profile`
Singleton user profile (one row, id='singleton').

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | `'singleton'` | Always 'singleton' |
| sex | TEXT | — | NULL | `male` or `female` |
| date_of_birth | TEXT | — | NULL | YYYY-MM-DD |
| height_cm | REAL | — | NULL | Height in centimeters |
| activity_level | TEXT | — | NULL | Activity level enum |
| has_completed_onboarding | INTEGER | — | 0 | Onboarding flag (0/1) |
| onboarding_skipped | INTEGER | — | 0 | Skipped flag (0/1) |
| created_at | TEXT | NOT NULL | — | ISO datetime |
| updated_at | TEXT | NOT NULL | — | ISO datetime |

*Additional columns added in migration 005:*
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| eating_style | TEXT | `'flexible'` | Macro distribution style |
| protein_priority | TEXT | `'active'` | Protein target level |

#### `goals`
Weight management goals with calculated macro targets.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique goal ID |
| type | TEXT | NOT NULL | — | `lose`, `gain`, `maintain` |
| target_weight_kg | REAL | — | NULL | Goal weight |
| target_rate_percent | REAL | — | NULL | Weekly rate as % body weight |
| start_date | TEXT | NOT NULL | — | YYYY-MM-DD |
| start_weight_kg | REAL | NOT NULL | — | Starting weight |
| initial_tdee_estimate | REAL | NOT NULL | — | Initial TDEE from onboarding |
| initial_target_calories | REAL | NOT NULL | — | Initial calorie target |
| initial_protein_g | REAL | NOT NULL | — | Initial protein target |
| initial_carbs_g | REAL | NOT NULL | — | Initial carbs target |
| initial_fat_g | REAL | NOT NULL | — | Initial fat target |
| current_tdee_estimate | REAL | NOT NULL | — | Updated by weekly reflections |
| current_target_calories | REAL | NOT NULL | — | Current calorie target |
| current_protein_g | REAL | NOT NULL | — | Current protein target |
| current_carbs_g | REAL | NOT NULL | — | Current carbs target |
| current_fat_g | REAL | NOT NULL | — | Current fat target |
| is_active | INTEGER | — | 1 | Active goal flag (0/1) |
| completed_at | TEXT | — | NULL | Completion timestamp |
| created_at | TEXT | NOT NULL | — | ISO datetime |
| updated_at | TEXT | NOT NULL | — | ISO datetime |

*Additional columns added in migration 005:*
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| eating_style | TEXT | `'flexible'` | Macro template used |
| protein_priority | TEXT | `'active'` | Protein level used |

**Indexes:**
- `idx_goals_active` ON (is_active)
- `idx_goals_start_date` ON (start_date)

#### `weekly_reflections`
Weekly progress check-ins linked to goals.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique ID |
| goal_id | TEXT | NOT NULL, FK → goals(id) | — | Parent goal |
| week_number | INTEGER | NOT NULL | — | Week counter within goal |
| week_start_date | TEXT | NOT NULL | — | YYYY-MM-DD |
| week_end_date | TEXT | NOT NULL | — | YYYY-MM-DD |
| avg_calorie_intake | REAL | — | NULL | Average daily calories for week |
| days_logged | INTEGER | — | NULL | Number of days with food logs |
| days_weighed | INTEGER | — | NULL | Number of days with weight |
| start_trend_weight_kg | REAL | — | NULL | Trend weight at week start |
| end_trend_weight_kg | REAL | — | NULL | Trend weight at week end |
| weight_change_kg | REAL | — | NULL | Net change |
| calculated_daily_burn | REAL | — | NULL | Calculated TDEE from data |
| previous_tdee_estimate | REAL | — | NULL | TDEE before reflection |
| previous_target_calories | REAL | — | NULL | Calorie target before reflection |
| new_tdee_estimate | REAL | — | NULL | Updated TDEE |
| new_target_calories | REAL | — | NULL | Updated calorie target |
| new_protein_g | REAL | — | NULL | Updated protein |
| new_carbs_g | REAL | — | NULL | Updated carbs |
| new_fat_g | REAL | — | NULL | Updated fat |
| was_accepted | INTEGER | — | NULL | Whether user accepted recommendations |
| user_notes | TEXT | — | NULL | User comments |
| data_quality | TEXT | — | NULL | `high`, `moderate`, `low` |
| created_at | TEXT | NOT NULL | — | ISO datetime |

**Foreign Keys:** goal_id → goals(id) ON DELETE CASCADE
**Indexes:**
- `idx_reflections_goal` ON (goal_id)
- `idx_reflections_week` ON (week_start_date)

#### `daily_metabolism`
Daily metabolism estimates derived from weight + calorie data.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique ID |
| date | TEXT | NOT NULL, UNIQUE | — | YYYY-MM-DD |
| trend_weight_kg | REAL | — | NULL | Smoothed weight trend |
| calorie_intake | REAL | — | NULL | Total calories for day |
| estimated_daily_burn | REAL | — | NULL | Estimated TDEE |
| data_quality | TEXT | — | NULL | `high`, `moderate`, `low` |
| created_at | TEXT | NOT NULL | — | ISO datetime |
| updated_at | TEXT | NOT NULL | — | ISO datetime |

**Indexes:**
- `idx_metabolism_date` ON (date DESC)

---

### Migration 003: Health Sync & Backup

#### `health_sync_log`
Records of HealthKit/Health Connect sync operations.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique sync ID |
| platform | TEXT | NOT NULL | — | `healthkit`, `health_connect` |
| direction | TEXT | NOT NULL | — | `import`, `export` |
| data_type | TEXT | NOT NULL | — | `weight`, `calories`, `nutrition` |
| local_record_id | TEXT | — | NULL | Reference to local record |
| local_record_type | TEXT | — | NULL | Table name of local record |
| external_id | TEXT | — | NULL | External platform record ID |
| status | TEXT | NOT NULL | — | `success`, `error`, `pending` |
| error_message | TEXT | — | NULL | Error details if failed |
| synced_at | TEXT | NOT NULL | — | When sync occurred |
| created_at | TEXT | NOT NULL | — | ISO datetime |

**Indexes:**
- `idx_sync_status` ON (status)
- `idx_sync_local` ON (local_record_id, local_record_type)

#### `backup_metadata`
Metadata about user data backups.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique backup ID |
| filename | TEXT | NOT NULL | — | Backup filename |
| file_size_bytes | INTEGER | — | NULL | File size |
| records_count | INTEGER | — | NULL | Total records exported |
| date_range_start | TEXT | — | NULL | Earliest date in backup |
| date_range_end | TEXT | — | NULL | Latest date in backup |
| created_at | TEXT | NOT NULL | — | ISO datetime |

---

### Migration 004: Seed Foods

**Data-only migration.** Inserts 150 common food items (IDs `seed-001` through `seed-150`) into `food_items` with complete nutrition data.

---

### Migration 005: Macro Templates

**Column additions only.** Adds `eating_style` and `protein_priority` to both `user_profile` and `goals` tables. See those table definitions above for column details.

---

### Migration 006: Seed Mock Data

**Data-only migration.** Populates test data:
- User profile (completed onboarding, male, 178cm, moderately active)
- 45 days of weight entries (~88kg → ~83kg)
- Active weight loss goal with macro targets
- 14 days of food log entries using meal templates
- 4 quick add entries
- 5 weekly reflections
- 30 days of daily metabolism data
- Updated user settings with macro goals

---

### Migration 007: Favorite Foods

#### `favorite_foods`
User's bookmarked food items.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique favorite ID |
| food_id | TEXT | NOT NULL, UNIQUE, FK → food_items(id) | — | Reference to food item |
| default_serving_size | REAL | — | NULL | Preferred serving size |
| default_serving_unit | TEXT | — | NULL | Preferred serving unit |
| sort_order | INTEGER | NOT NULL | 0 | Display order |
| created_at | TEXT | NOT NULL | — | ISO datetime |

**Foreign Keys:** food_id → food_items(id) ON DELETE CASCADE
**Indexes:**
- `idx_favorite_foods_food_id` ON (food_id)
- `idx_favorite_foods_sort_order` ON (sort_order)

---

### Migration 008: Legal Acknowledgment

**Data-only migration.** Uses existing `user_settings` key-value store:
- `legal_acknowledged` — `'0'` or `'1'`
- `legal_acknowledged_at` — ISO timestamp
- `legal_acknowledged_version` — Version string

---

### Migration 009: Restaurant & USDA Foods

**Data-only migration.** Bulk-inserts restaurant chain menu items and USDA food database items into `food_items` table.

---

### Migration 010: Water Tracking

#### `water_log`
Daily water intake tracking.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique entry ID |
| date | TEXT | NOT NULL, UNIQUE | — | YYYY-MM-DD (one per day) |
| glasses | INTEGER | NOT NULL | 0 | Number of glasses |
| notes | TEXT | — | NULL | Optional notes |
| created_at | TEXT | NOT NULL | CURRENT_TIMESTAMP | ISO datetime |
| updated_at | TEXT | NOT NULL | CURRENT_TIMESTAMP | ISO datetime |

**Indexes:**
- `idx_water_log_date` ON (date)

---

### Migration 011: Restaurants

#### `restaurants`
Restaurant chains with bundled menu data.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique restaurant ID |
| name | TEXT | NOT NULL | — | Restaurant name |
| slug | TEXT | NOT NULL, UNIQUE | — | URL-friendly slug |
| logo_asset_path | TEXT | — | NULL | Path to logo asset |
| last_updated | TEXT | NOT NULL | — | Last data update |
| source | TEXT | NOT NULL, CHECK IN ('bundled','api','community') | — | Data source |
| item_count | INTEGER | — | 0 | Number of menu items |
| is_verified | INTEGER | — | 0 | Verified flag |
| created_at | TEXT | — | CURRENT_TIMESTAMP | ISO datetime |

**Indexes:**
- `idx_restaurants_slug` ON (slug)
- `idx_restaurants_name` ON (name)

#### `menu_categories`
Restaurant menu categories.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique category ID |
| restaurant_id | TEXT | NOT NULL, FK → restaurants(id) | — | Parent restaurant |
| name | TEXT | NOT NULL | — | Category name |
| display_order | INTEGER | — | 0 | Sort order |
| icon_name | TEXT | — | NULL | Icon identifier |

**Unique:** (restaurant_id, name)
**Foreign Keys:** restaurant_id → restaurants(id) ON DELETE CASCADE
**Indexes:**
- `idx_categories_restaurant` ON (restaurant_id)

#### `restaurant_foods`
Individual menu items.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique food ID |
| restaurant_id | TEXT | NOT NULL, FK → restaurants(id) | — | Parent restaurant |
| category_id | TEXT | FK → menu_categories(id) | NULL | Menu category |
| name | TEXT | NOT NULL | — | Item name |
| description | TEXT | — | NULL | Item description |
| image_url | TEXT | — | NULL | Image URL |
| calories | INTEGER | NOT NULL | — | Calories |
| protein | REAL | NOT NULL | — | Protein (g) |
| carbohydrates | REAL | NOT NULL | — | Carbs (g) |
| fat | REAL | NOT NULL | — | Fat (g) |
| fiber | REAL | — | NULL | Fiber (g) |
| sugar | REAL | — | NULL | Sugar (g) |
| sodium | REAL | — | NULL | Sodium (mg) |
| saturated_fat | REAL | — | NULL | Saturated fat (g) |
| serving_size | TEXT | NOT NULL | — | Serving description |
| serving_grams | REAL | — | NULL | Gram equivalent |
| source | TEXT | NOT NULL | — | Data source |
| source_id | TEXT | — | NULL | External ID |
| last_verified | TEXT | — | NULL | Verification date |
| is_verified | INTEGER | — | 0 | Verified flag |
| popularity_score | INTEGER | — | 0 | Popularity ranking |
| created_at | TEXT | — | CURRENT_TIMESTAMP | ISO datetime |
| updated_at | TEXT | — | CURRENT_TIMESTAMP | ISO datetime |

**Foreign Keys:**
- restaurant_id → restaurants(id) ON DELETE CASCADE
- category_id → menu_categories(id) ON DELETE SET NULL

**Indexes:**
- `idx_foods_restaurant` ON (restaurant_id)
- `idx_foods_category` ON (category_id)
- `idx_foods_name` ON (name)
- `idx_foods_popularity` ON (popularity_score DESC)

#### `restaurant_foods_fts`
Full-text search virtual table for restaurant foods.

```sql
CREATE VIRTUAL TABLE restaurant_foods_fts USING fts5(
  name,
  restaurant_name,
  content='restaurant_foods',
  content_rowid='rowid'
);
```

#### `food_variants`
Menu item customizations/variants (sizes, modifications).

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique variant ID |
| restaurant_food_id | TEXT | NOT NULL, FK → restaurant_foods(id) | — | Parent food item |
| name | TEXT | NOT NULL | — | Variant name |
| calories_delta | INTEGER | — | 0 | Calorie adjustment |
| protein_delta | REAL | — | 0 | Protein adjustment |
| carbohydrates_delta | REAL | — | 0 | Carb adjustment |
| fat_delta | REAL | — | 0 | Fat adjustment |

**Foreign Keys:** restaurant_food_id → restaurant_foods(id) ON DELETE CASCADE
**Indexes:**
- `idx_variants_food` ON (restaurant_food_id)

#### `restaurant_food_logs`
User's logged restaurant food entries.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique log ID |
| restaurant_food_id | TEXT | NOT NULL, FK → restaurant_foods(id) | — | Menu item reference |
| restaurant_name | TEXT | NOT NULL | — | Denormalized restaurant name |
| food_name | TEXT | NOT NULL | — | Denormalized food name |
| variant_id | TEXT | FK → food_variants(id) | NULL | Optional variant |
| logged_at | TEXT | NOT NULL | — | ISO datetime |
| date | TEXT | NOT NULL | — | YYYY-MM-DD |
| meal | TEXT | NOT NULL, CHECK IN ('breakfast','lunch','dinner','snack') | — | Meal type |
| quantity | REAL | — | 1 | Number of servings |
| notes | TEXT | — | NULL | Optional notes |
| calories | INTEGER | NOT NULL | — | Snapshot of calories |
| protein | REAL | NOT NULL | — | Snapshot of protein |
| carbohydrates | REAL | NOT NULL | — | Snapshot of carbs |
| fat | REAL | NOT NULL | — | Snapshot of fat |
| created_at | TEXT | — | CURRENT_TIMESTAMP | ISO datetime |

**Foreign Keys:**
- restaurant_food_id → restaurant_foods(id)
- variant_id → food_variants(id)

**Indexes:**
- `idx_restaurant_logs_date` ON (date)
- `idx_restaurant_logs_restaurant` ON (restaurant_food_id)

#### `user_restaurant_usage`
Tracks user's frequently visited restaurants.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| restaurant_id | TEXT | PRIMARY KEY, FK → restaurants(id) | — | Restaurant reference |
| last_used | TEXT | NOT NULL | — | Last visit timestamp |
| use_count | INTEGER | — | 1 | Visit count |

**Foreign Keys:** restaurant_id → restaurants(id) ON DELETE CASCADE

---

### Migration 012: Planning Features

#### `macro_cycle_config`
Singleton configuration for macro cycling (training/rest day targets).

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | INTEGER | PRIMARY KEY | 1 | Always 1 (singleton) |
| enabled | INTEGER | NOT NULL | 0 | Feature toggle (0/1) |
| pattern_type | TEXT | NOT NULL | `'training_rest'` | Cycling pattern |
| marked_days | TEXT | NOT NULL | `'[]'` | JSON array of marked day indices |
| day_targets | TEXT | NOT NULL | `'{}'` | JSON object of per-day targets |
| created_at | TEXT | NOT NULL | CURRENT_TIMESTAMP | ISO datetime |
| last_modified | TEXT | NOT NULL | CURRENT_TIMESTAMP | ISO datetime |

#### `macro_cycle_overrides`
Manual per-day macro overrides.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique override ID |
| date | TEXT | NOT NULL, UNIQUE | — | YYYY-MM-DD |
| calories | INTEGER | NOT NULL | — | Calorie target |
| protein | INTEGER | NOT NULL | — | Protein target (g) |
| carbs | INTEGER | NOT NULL | — | Carbs target (g) |
| fat | INTEGER | NOT NULL | — | Fat target (g) |
| created_at | TEXT | NOT NULL | CURRENT_TIMESTAMP | ISO datetime |

**Indexes:**
- `idx_macro_cycle_overrides_date` ON (date)

#### `fasting_config`
Singleton fasting timer configuration.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | INTEGER | PRIMARY KEY | 1 | Always 1 (singleton) |
| enabled | INTEGER | NOT NULL | 0 | Feature toggle (0/1) |
| protocol | TEXT | NOT NULL | `'16:8'` | Fasting protocol |
| custom_fast_hours | INTEGER | — | NULL | Custom hours (if protocol is custom) |
| typical_eat_start | TEXT | NOT NULL | `'12:00'` | Eating window start (HH:MM) |
| typical_eat_end | TEXT | NOT NULL | `'20:00'` | Eating window end (HH:MM) |
| notify_window_opens | INTEGER | NOT NULL | 1 | Notification flag |
| notify_window_closes_soon | INTEGER | NOT NULL | 1 | Notification flag |
| notify_closes_reminder_mins | INTEGER | NOT NULL | 30 | Minutes before close |
| notify_fast_complete | INTEGER | NOT NULL | 1 | Notification flag |
| created_at | TEXT | NOT NULL | CURRENT_TIMESTAMP | ISO datetime |
| last_modified | TEXT | NOT NULL | CURRENT_TIMESTAMP | ISO datetime |

#### `fasting_sessions`
Individual fasting session records.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique session ID |
| start_time | TEXT | NOT NULL | — | ISO datetime |
| end_time | TEXT | — | NULL | ISO datetime (null if active) |
| target_hours | INTEGER | NOT NULL | — | Target fast duration |
| actual_hours | REAL | — | NULL | Actual duration (calculated) |
| status | TEXT | NOT NULL | `'active'` | `active`, `completed`, `cancelled` |
| created_at | TEXT | NOT NULL | CURRENT_TIMESTAMP | ISO datetime |

**Indexes:**
- `idx_fasting_sessions_start` ON (start_time)
- `idx_fasting_sessions_status` ON (status)

#### `meal_plan_settings`
Singleton meal planning configuration.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | INTEGER | PRIMARY KEY | 1 | Always 1 (singleton) |
| enabled | INTEGER | NOT NULL | 0 | Feature toggle (0/1) |
| show_on_today | INTEGER | NOT NULL | 1 | Show on Today tab |
| reminder_time | TEXT | — | NULL | Reminder time (HH:MM) |
| created_at | TEXT | NOT NULL | CURRENT_TIMESTAMP | ISO datetime |
| last_modified | TEXT | NOT NULL | CURRENT_TIMESTAMP | ISO datetime |

#### `planned_meals`
Individual planned meal entries.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique meal ID |
| date | TEXT | NOT NULL | — | YYYY-MM-DD |
| meal_slot | TEXT | NOT NULL | — | `breakfast`, `lunch`, `dinner`, `snack` |
| food_id | TEXT | NOT NULL | — | Food item reference |
| food_name | TEXT | NOT NULL | — | Denormalized food name |
| servings | REAL | NOT NULL | 1 | Number of servings |
| calories | REAL | NOT NULL | — | Calculated calories |
| protein | REAL | NOT NULL | — | Calculated protein |
| carbs | REAL | NOT NULL | — | Calculated carbs |
| fat | REAL | NOT NULL | — | Calculated fat |
| status | TEXT | NOT NULL | `'planned'` | `planned`, `logged`, `skipped` |
| logged_at | TEXT | — | NULL | When logged (if status=logged) |
| created_at | TEXT | NOT NULL | CURRENT_TIMESTAMP | ISO datetime |

**Indexes:**
- `idx_planned_meals_date` ON (date)
- `idx_planned_meals_status` ON (status)
- `idx_planned_meals_date_slot` ON (date, meal_slot)

---

### Migration 013: Micronutrients & Photos

#### `nutrient_settings`
Singleton demographic settings for RDA calculation.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | INTEGER | PRIMARY KEY, CHECK (id = 1) | — | Always 1 (singleton) |
| gender | TEXT | NOT NULL | `'male'` | `male`, `female` |
| age_group | TEXT | NOT NULL | `'19-30y'` | Age bracket for RDA |
| life_stage | TEXT | NOT NULL | `'normal'` | `normal`, `pregnant`, `lactating` |
| updated_at | TEXT | NOT NULL | `datetime('now')` | ISO datetime |

#### `custom_nutrient_targets`
User-overridden RDA values for specific nutrients.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| nutrient_id | TEXT | PRIMARY KEY | — | Nutrient identifier |
| target_amount | REAL | NOT NULL | — | Custom target |
| upper_limit | REAL | — | NULL | Upper safe limit |
| created_at | TEXT | NOT NULL | `datetime('now')` | ISO datetime |
| updated_at | TEXT | NOT NULL | `datetime('now')` | ISO datetime |

#### `food_item_nutrients`
Extended micronutrient data for food items.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique ID |
| food_item_id | TEXT | NOT NULL, FK → food_items(id) | — | Parent food item |
| nutrient_id | TEXT | NOT NULL | — | Nutrient identifier |
| amount | REAL | NOT NULL | — | Amount per serving |
| created_at | TEXT | NOT NULL | `datetime('now')` | ISO datetime |

**Unique:** (food_item_id, nutrient_id)
**Foreign Keys:** food_item_id → food_items(id) ON DELETE CASCADE
**Indexes:**
- `idx_food_nutrients_food` ON (food_item_id)
- `idx_food_nutrients_nutrient` ON (nutrient_id)

#### `daily_nutrient_intake`
Aggregated daily micronutrient totals.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique ID |
| date | TEXT | NOT NULL | — | YYYY-MM-DD |
| nutrient_id | TEXT | NOT NULL | — | Nutrient identifier |
| total_amount | REAL | NOT NULL | — | Total intake |
| percent_of_target | REAL | NOT NULL | — | % of RDA |
| status | TEXT | NOT NULL | — | `deficient`, `adequate`, `excess` |
| foods_logged | INTEGER | NOT NULL | 0 | Foods contributing |
| has_complete_data | INTEGER | NOT NULL | 1 | Data completeness flag |
| calculated_at | TEXT | NOT NULL | `datetime('now')` | When calculated |

**Unique:** (date, nutrient_id)
**Indexes:**
- `idx_daily_nutrients_date` ON (date)
- `idx_daily_nutrients_nutrient` ON (nutrient_id)
- `idx_daily_nutrients_status` ON (status)

#### `nutrient_contributors`
Which foods contributed to daily nutrient totals.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique ID |
| date | TEXT | NOT NULL | — | YYYY-MM-DD |
| log_entry_id | TEXT | NOT NULL, FK → log_entries(id) | — | Source log entry |
| nutrient_id | TEXT | NOT NULL | — | Nutrient identifier |
| food_name | TEXT | NOT NULL | — | Denormalized food name |
| amount | REAL | NOT NULL | — | Amount contributed |
| percent_of_daily | REAL | NOT NULL | — | % of daily total |
| created_at | TEXT | NOT NULL | `datetime('now')` | ISO datetime |

**Foreign Keys:** log_entry_id → log_entries(id) ON DELETE CASCADE
**Indexes:**
- `idx_contributors_date` ON (date)
- `idx_contributors_nutrient` ON (nutrient_id)
- `idx_contributors_entry` ON (log_entry_id)

#### `progress_photos`
Progress photos with metadata (images stored locally on device).

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique photo ID |
| local_uri | TEXT | NOT NULL | — | Local file path |
| thumbnail_uri | TEXT | — | NULL | Thumbnail file path |
| date | TEXT | NOT NULL | — | YYYY-MM-DD |
| timestamp | INTEGER | NOT NULL | — | Unix timestamp |
| category | TEXT | NOT NULL | `'front'` | `front`, `side`, `back` |
| notes | TEXT | — | NULL | Optional notes |
| weight_kg | REAL | — | NULL | Weight at time of photo |
| is_private | INTEGER | NOT NULL | 1 | Privacy flag |
| created_at | TEXT | NOT NULL | `datetime('now')` | ISO datetime |
| updated_at | TEXT | NOT NULL | `datetime('now')` | ISO datetime |

**Indexes:**
- `idx_photos_date` ON (date)
- `idx_photos_category` ON (category)
- `idx_photos_timestamp` ON (timestamp DESC)

#### `photo_comparisons`
Saved side-by-side photo comparison pairs.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | TEXT | PRIMARY KEY | — | Unique comparison ID |
| photo1_id | TEXT | NOT NULL, FK → progress_photos(id) | — | First photo |
| photo2_id | TEXT | NOT NULL, FK → progress_photos(id) | — | Second photo |
| comparison_type | TEXT | NOT NULL | `'side_by_side'` | Comparison mode |
| created_at | TEXT | NOT NULL | `datetime('now')` | ISO datetime |

**Foreign Keys:**
- photo1_id → progress_photos(id) ON DELETE CASCADE
- photo2_id → progress_photos(id) ON DELETE CASCADE

---

## Enums & Constrained Values

### Goal Types
`goals.type`: `'lose'` | `'gain'` | `'maintain'`

### Meal Types
`log_entries.meal_type`, `quick_add_entries.meal_type`, `planned_meals.meal_slot`:
`'breakfast'` | `'lunch'` | `'dinner'` | `'snack'`

### Restaurant Meal Types
`restaurant_food_logs.meal`: `'breakfast'` | `'lunch'` | `'dinner'` | `'snack'`

### Eating Styles
`user_profile.eating_style`, `goals.eating_style`:
- `'flexible'` — 50/50 carb/fat split (balanced)
- `'carb_focused'` — 65/35 carb/fat split (performance)
- `'fat_focused'` — 35/65 carb/fat split, 150g carb cap
- `'very_low_carb'` — 10/90 carb/fat split, 50g carb cap (keto)

### Protein Priority
`user_profile.protein_priority`, `goals.protein_priority`:
- `'standard'` — 0.6g per lb (general health)
- `'active'` — 0.75g per lb (regular exercise)
- `'athletic'` — 0.9g per lb (muscle building)
- `'maximum'` — 1.0g per lb (serious athletes)

### Activity Levels
`user_profile.activity_level`:
`'sedentary'` | `'lightly_active'` | `'moderately_active'` | `'very_active'` | `'extremely_active'`

### Food Sources
`food_items.source`: `'seed'` | `'user'` | `'openfoodfacts'` | `'usda'` | `'restaurant'`

### Restaurant Sources
`restaurants.source`: `'bundled'` | `'api'` | `'community'`

### Fasting Protocols
`fasting_config.protocol`: `'16:8'` | `'18:6'` | `'20:4'` | `'OMAD'` | `'custom'`

### Fasting Session Status
`fasting_sessions.status`: `'active'` | `'completed'` | `'cancelled'`

### Planned Meal Status
`planned_meals.status`: `'planned'` | `'logged'` | `'skipped'`

### Data Quality
`weekly_reflections.data_quality`, `daily_metabolism.data_quality`:
`'high'` | `'moderate'` | `'low'`

### Health Sync
- `health_sync_log.platform`: `'healthkit'` | `'health_connect'`
- `health_sync_log.direction`: `'import'` | `'export'`
- `health_sync_log.status`: `'success'` | `'error'` | `'pending'`

### Nutrient Status
`daily_nutrient_intake.status`: `'deficient'` | `'adequate'` | `'excess'`

### Photo Categories
`progress_photos.category`: `'front'` | `'side'` | `'back'`

### Macro Cycling Pattern
`macro_cycle_config.pattern_type`: `'training_rest'` | `'custom'`

---

## Foreign Key Map

| Child Table | Column | Parent Table | Parent Column | On Delete |
|-------------|--------|-------------|---------------|-----------|
| log_entries | food_item_id | food_items | id | CASCADE |
| weekly_reflections | goal_id | goals | id | CASCADE |
| favorite_foods | food_id | food_items | id | CASCADE |
| menu_categories | restaurant_id | restaurants | id | CASCADE |
| restaurant_foods | restaurant_id | restaurants | id | CASCADE |
| restaurant_foods | category_id | menu_categories | id | SET NULL |
| food_variants | restaurant_food_id | restaurant_foods | id | CASCADE |
| restaurant_food_logs | restaurant_food_id | restaurant_foods | id | — |
| restaurant_food_logs | variant_id | food_variants | id | — |
| user_restaurant_usage | restaurant_id | restaurants | id | CASCADE |
| food_item_nutrients | food_item_id | food_items | id | CASCADE |
| nutrient_contributors | log_entry_id | log_entries | id | CASCADE |
| photo_comparisons | photo1_id | progress_photos | id | CASCADE |
| photo_comparisons | photo2_id | progress_photos | id | CASCADE |

---

## Singleton Tables

These tables use a fixed primary key to ensure only one row exists:

| Table | PK Column | PK Value | Pattern |
|-------|-----------|----------|---------|
| user_profile | id | `'singleton'` | TEXT default |
| macro_cycle_config | id | `1` | INTEGER DEFAULT 1 |
| fasting_config | id | `1` | INTEGER DEFAULT 1 |
| meal_plan_settings | id | `1` | INTEGER DEFAULT 1 |
| nutrient_settings | id | `1` | INTEGER CHECK (id = 1) |
