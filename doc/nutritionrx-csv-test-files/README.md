# NutritionRx CSV Import Test Files

## How to Use

### With Dev Test Loader
1. Copy these files into `src/test-data/csv/` (or wherever the dev loader expects them)
2. Add a `__DEV__`-only test button on the import source selection screen (same pattern as GymRx)
3. Use `parseCSVContent()` or equivalent to bypass the file picker

### With Unit Tests
Import file contents as strings in your test files and pass to each parser's `detect()` and `parse()` methods.

---

## Test Files & Expected Outcomes

### 1. `test_mfp_happy_path.csv` — MyFitnessPal Standard Export
- **Format:** MFP (Date, Meal, Calories, Fat (g), Protein (g), Carbohydrates (g) + micronutrient columns)
- **Content:** 3 days, 11 rows, 4 meal types (Breakfast, Lunch, Dinner, Snacks)
- **Expected:** Parser detects MFP. 3 days imported. Extra columns (Cholesterol, Sodium, etc.) ignored.
- **Day 1 totals:** Cal: 2000, Pro: 125g, Carb: 182g, Fat: 70g
- **Day 2 totals:** Cal: 1750, Pro: 108g, Carb: 162g, Fat: 60g
- **Day 3 totals:** Cal: 1910, Pro: 119g, Carb: 170g, Fat: 66g

### 2. `test_mfp_with_bom.csv` — MFP with UTF-8 BOM
- **Format:** Same as #1 but with BOM bytes (0xEF 0xBB 0xBF) prepended
- **Expected (BEFORE fix):** Parser fails to detect MFP — first header is `"\uFEFFDate"` not `"Date"`
- **Expected (AFTER fix):** BOM stripped, parses identically to #1

### 3. `test_cronometer_format.csv` — Cronometer Servings Export
- **Format:** Cronometer (Day, Group, Food Name, Amount, Energy (kcal), Protein (g), Carbs (g), Fat (g))
- **Content:** 2 days, 11 rows, individual food items (not daily totals)
- **Expected:** Parser detects Cronometer via `Day` + `Energy (kcal)`. Groups meals by `Group` column.
- **Day 1 (Jan 15):** 7 food items across Breakfast/Lunch/Dinner. Breakfast cal: 405, Lunch cal: 550, Dinner cal: 393
- **Day 2 (Jan 16):** 4 food items. Note: "Pasta with Marinara, Homemade" has comma in name (quoted field)
- **Key test:** Commas in food names don't break CSV parsing

### 4. `test_loseit_format.csv` — Lose It! Export
- **Format:** Lose It! (Date, Name, Type, Calories, Fat (g), Protein (g), Carbohydrates (g))
- **Content:** 3 days, 14 rows including 3 Exercise rows
- **Expected:** Parser detects Lose It! via `Date + Name + Type`. Exercise rows (Type="Exercise") FILTERED OUT.
- **Critical test:** 3 exercise rows (Running, Cycling, Walking) with negative calories MUST be excluded
- **Day 1 (Jan 15):** 4 food items after filtering (Oatmeal, Banana, Chicken, Salmon, Protein Bar). Exercise: Running -300 cal skipped
- **Day 2 (Jan 16):** 3 food items. Exercises: Cycling -400, Walking -150 skipped
- **MM/DD/YYYY dates:** "01/15/2024" format — parser must handle this

### 5. `test_macrofactor_format.csv` — MacroFactor Granular Export
- **Format:** MacroFactor (Date, Food Name, Calories, Protein (g), Carbs (g), Fat (g), Time, Servings)
- **Content:** 3 days, 13 rows with Time column
- **Expected:** Parser detects MacroFactor via broad detection (Date + Food Name + Calories)
- **Time column test:** If app infers meal type from time (07:30=Breakfast, 12:30=Lunch, etc.)
- **Servings column:** Mixed Nuts has 0.5 servings — verify this doesn't break anything
- **Day 1 totals:** Cal: 1675, Pro: 137.5g

### 6. `test_nutritionrx_backup.csv` — NutritionRx Own Export
- **Format:** NutritionRx (Date, Meal, Type, Food Name, Brand, Servings, Calories, Protein (g), Carbs (g), Fat (g))
- **Content:** 2 days, 9 rows with Type (quick_add/food_entry) and Brand columns
- **Expected:** Parser detects NutritionRx via `Date + Meal + Type + Food Name` (most specific detection)
- **Detection order test:** Must NOT match MFP first (MFP detects Date + Meal + Calories, NutritionRx also has these)
- **Brand column:** Kirkland, Fage, Quest, Wild Caught — preserved if app stores brands

### 7. `test_empty.csv` — Empty File
- **Expected:** User-friendly error: "This file is empty" or "No data found"
- **Must NOT:** crash, show raw exception, or start import with 0 days

### 8. `test_headers_only.csv` — MFP Headers, No Data
- **Expected:** User-friendly error: "No nutrition data found in this file" or "File has headers but no data rows"
- **Must NOT:** show "0 days to import" and let user proceed

### 9. `test_malformed_rows.csv` — Mixed Valid/Invalid Rows
- **Content:** 8 rows — 4 valid, 4 problematic:
  - Row 2: valid (Jan 15, Breakfast, 450 cal)
  - Row 3: invalid date "not-a-date"
  - Row 4: missing calories (empty field)
  - Row 5: missing meal name
  - Row 6: non-numeric calories "abc"
  - Row 7: valid (Jan 16, Lunch, 600 cal)
  - Row 8: completely empty row
  - Row 9: valid (Jan 16, Dinner, 750 cal)
- **Expected (BEFORE fix):** Problematic rows silently dropped, no warning
- **Expected (AFTER fix):** Valid rows import (3-4 rows), warnings shown for skipped rows with line numbers

### 10. `test_special_characters.csv` — Unicode & Quoted Fields (Cronometer format)
- **Content:** 2 days, 9 rows with special characters:
  - German: Müsli mit Früchten, Côte de Bœuf
  - French: Café au Lait, Crème Brûlée
  - Portuguese: Açaí Bowl, Pão de Queijo
  - Apostrophe: Farmer's Market Salad
  - Ampersand: Rice & Beans, Spicy
  - Escaped quotes: Chicken "Parmesan" (double-quoted in CSV)
- **Expected:** All food names preserved correctly. No mojibake or truncation.
- **PapaParse test:** Quoted fields with commas and escaped quotes handled correctly

### 11. `test_wrong_format.csv` — Non-Nutrition CSV
- **Content:** Contacts list (Name, Email, Phone, Company)
- **Expected:** "We couldn't detect the format of this CSV" error
- **Must NOT:** silently fall back to any parser or crash

### 12. `test_large_file.csv` — 60,000 Rows (Exceeds 50K Limit)
- **Content:** ~15,000 days × 4 meals from 2010-01-01 onward
- **Expected:** Error: "This file has 60,000 rows, which exceeds the maximum of 50,000. Try exporting a smaller date range."
- **Must trigger AFTER parsing headers** (file size check happens first, then row count)

### 13. `test_loseit_mixed_dates.csv` — Lose It! with Mixed Date Formats
- **Content:** 6 rows with three date formats mixed:
  - MM/DD/YYYY: "01/15/2024", "01/17/2024"
  - M/D/YYYY (no zero-padding): "1/5/2024", "1/8/2024"
  - YYYY-MM-DD: "2024-01-16"
  - Year boundary: "12/31/2023"
- **Expected:** All dates parsed correctly. No off-by-one from timezone bugs.
- **Critical test:** "1/5/2024" should be January 5, not May 1

### 14. `test_duplicate_import.csv` — Small File for Duplicate Testing
- **Content:** 2 days, 5 rows (MFP format)
- **Test procedure:**
  1. Import this file → success, 2 days imported
  2. Import this file AGAIN → duplicate warning for both dates
  3. Select "Skip" → 0 new days, 2 skipped
  4. Or select "Replace" → old entries deleted, new entries inserted
- **Expected (BEFORE fix):** Second import silently creates duplicates
- **Expected (AFTER fix):** Duplicate warning shown, user chooses resolution

### 15. `test_cronometer_with_bom.csv` — Cronometer with UTF-8 BOM
- **Same as #3 with BOM bytes prepended**
- **Expected (BEFORE fix):** First header "Day" becomes "\uFEFFDay", detection fails
- **Expected (AFTER fix):** BOM stripped, detects as Cronometer

### 16. `test_zero_calorie_entries.csv` — MFP with Zero-Calorie Meals
- **Content:** 2 days, 7 rows. Some meals have 0 calories (e.g., skipped breakfast, water-only lunch)
- **Expected:** Zero-calorie entries ARE imported (0 cal is valid data — user may have logged water or nothing)
- **Must NOT:** skip rows where calories = 0
- **Day 1:** 4 meals (2 with 0 cal, 2 with real cal). Total: 1350 cal
- **Day 2:** 3 meals (1 with 0 cal). Total: 1150 cal
