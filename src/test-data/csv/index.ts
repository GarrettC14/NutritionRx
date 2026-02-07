/**
 * Inline CSV test data for __DEV__-only test file loader.
 * React Native can't read files from the bundle at runtime,
 * so we inline them as string constants.
 *
 * NOTE: test_large_file.csv is excluded (60K rows).
 */

export interface TestCSVFile {
  name: string;
  label: string;
  content: string;
  /** Expected parser source, if any */
  expectedSource?: string;
}

export const TEST_CSV_FILES: TestCSVFile[] = [
  // ── Happy-path files ──────────────────────────────────
  {
    name: 'test_mfp_happy_path.csv',
    label: 'MFP Happy Path',
    expectedSource: 'myfitnesspal',
    content: `Date,Meal,Calories,Fat (g),Protein (g),Carbohydrates (g),Cholesterol (mg),Sodium (mg),Sugars (g),Fiber (g)
2024-01-15,Breakfast,450,15,30,45,120,600,10,5
2024-01-15,Lunch,650,22,40,60,85,800,15,8
2024-01-15,Dinner,700,25,45,55,150,900,12,6
2024-01-15,Snacks,200,8,10,22,30,150,12,2
2024-01-16,Breakfast,400,12,28,42,100,550,8,4
2024-01-16,Lunch,600,20,38,58,80,750,14,7
2024-01-16,Dinner,750,28,42,62,160,950,10,5
2024-01-17,Breakfast,500,18,32,48,130,650,11,6
2024-01-17,Lunch,550,18,35,52,75,700,13,7
2024-01-17,Dinner,680,24,44,50,140,880,9,5
2024-01-17,Snacks,180,6,8,20,25,120,10,2`,
  },
  {
    name: 'test_mfp_with_bom.csv',
    label: 'MFP with BOM',
    expectedSource: 'myfitnesspal',
    content: `\uFEFFDate,Meal,Calories,Fat (g),Protein (g),Carbohydrates (g),Cholesterol (mg),Sodium (mg),Sugars (g),Fiber (g)
2024-01-15,Breakfast,450,15,30,45,120,600,10,5
2024-01-15,Lunch,650,22,40,60,85,800,15,8
2024-01-15,Dinner,700,25,45,55,150,900,12,6
2024-01-15,Snacks,200,8,10,22,30,150,12,2
2024-01-16,Breakfast,400,12,28,42,100,550,8,4
2024-01-16,Lunch,600,20,38,58,80,750,14,7
2024-01-16,Dinner,750,28,42,62,160,950,10,5
2024-01-17,Breakfast,500,18,32,48,130,650,11,6
2024-01-17,Lunch,550,18,35,52,75,700,13,7
2024-01-17,Dinner,680,24,44,50,140,880,9,5
2024-01-17,Snacks,180,6,8,20,25,120,10,2`,
  },
  {
    name: 'test_cronometer_format.csv',
    label: 'Cronometer',
    expectedSource: 'cronometer',
    content: `Day,Group,Food Name,Amount,Energy (kcal),Protein (g),Carbs (g),Fat (g),Fiber (g),Sugars (g)
2024-01-15,Breakfast,Oatmeal,"1 cup",300,10,54,6,4,1
2024-01-15,Breakfast,Banana,"1 medium",105,1.3,27,0.4,3.1,14
2024-01-15,Lunch,Grilled Chicken Breast,"6 oz",280,52,0,6,0,0
2024-01-15,Lunch,Brown Rice,"1 cup",215,5,45,1.8,3.5,0.7
2024-01-15,Lunch,Steamed Broccoli,"1 cup",55,3.7,11,0.6,5.1,2.2
2024-01-15,Dinner,Salmon Fillet,"5 oz",290,40,0,13,0,0
2024-01-15,Dinner,Sweet Potato,"1 medium",103,2.3,24,0.1,3.8,7.4
2024-01-16,Breakfast,Greek Yogurt,"1 cup",150,20,9,4,0,7
2024-01-16,Breakfast,Blueberries,"0.5 cup",42,0.5,11,0.2,1.8,7.4
2024-01-16,Lunch,Turkey Sandwich,"1 sandwich",420,28,38,16,3,5
2024-01-16,Dinner,"Pasta with Marinara, Homemade","2 cups",480,16,72,12,6,10`,
  },
  {
    name: 'test_cronometer_with_bom.csv',
    label: 'Cronometer with BOM',
    expectedSource: 'cronometer',
    content: `\uFEFFDay,Group,Food Name,Amount,Energy (kcal),Protein (g),Carbs (g),Fat (g),Fiber (g),Sugars (g)
2024-01-15,Breakfast,Oatmeal,"1 cup",300,10,54,6,4,1
2024-01-15,Breakfast,Banana,"1 medium",105,1.3,27,0.4,3.1,14
2024-01-15,Lunch,Grilled Chicken Breast,"6 oz",280,52,0,6,0,0
2024-01-15,Lunch,Brown Rice,"1 cup",215,5,45,1.8,3.5,0.7
2024-01-15,Lunch,Steamed Broccoli,"1 cup",55,3.7,11,0.6,5.1,2.2
2024-01-15,Dinner,Salmon Fillet,"5 oz",290,40,0,13,0,0
2024-01-15,Dinner,Sweet Potato,"1 medium",103,2.3,24,0.1,3.8,7.4
2024-01-16,Breakfast,Greek Yogurt,"1 cup",150,20,9,4,0,7
2024-01-16,Breakfast,Blueberries,"0.5 cup",42,0.5,11,0.2,1.8,7.4
2024-01-16,Lunch,Turkey Sandwich,"1 sandwich",420,28,38,16,3,5
2024-01-16,Dinner,"Pasta with Marinara, Homemade","2 cups",480,16,72,12,6,10`,
  },
  {
    name: 'test_loseit_format.csv',
    label: 'Lose It!',
    expectedSource: 'loseit',
    content: `Date,Name,Type,Calories,Fat (g),Protein (g),Carbohydrates (g),Saturated Fat (g),Cholesterol (mg),Sodium (mg),Sugars (g),Fiber (g)
01/15/2024,Oatmeal,Breakfast,300,6,10,54,1,0,150,1,4
01/15/2024,Banana,Breakfast,105,0.4,1.3,27,0.1,0,1,14,3.1
01/15/2024,Grilled Chicken,Lunch,280,6,52,0,1.5,130,75,0,0
01/15/2024,Running 30 min,Exercise,-300,0,0,0,0,0,0,0,0
01/15/2024,Salmon,Dinner,290,13,40,0,2.5,80,60,0,0
01/15/2024,Protein Bar,Snack,220,8,20,24,3,10,150,6,2
01/16/2024,Greek Yogurt,Breakfast,150,4,20,9,2.5,15,70,7,0
01/16/2024,Turkey Sub,Lunch,450,18,30,42,5,60,1200,6,3
01/16/2024,Cycling 45 min,Exercise,-400,0,0,0,0,0,0,0,0
01/16/2024,Steak,Dinner,500,28,55,0,11,150,80,0,0
01/16/2024,Walking 20 min,Exercise,-150,0,0,0,0,0,0,0,0
01/17/2024,Eggs and Toast,Breakfast,380,18,22,28,5,370,450,3,2
01/17/2024,Burrito Bowl,Lunch,620,20,38,62,7,85,980,5,8
01/17/2024,Grilled Fish,Dinner,350,12,48,5,2,90,320,1,0`,
  },
  {
    name: 'test_loseit_mixed_dates.csv',
    label: 'Lose It! Mixed Dates',
    expectedSource: 'loseit',
    content: `Date,Name,Type,Calories,Fat (g),Protein (g),Carbohydrates (g)
01/15/2024,Oatmeal,Breakfast,300,6,10,54
1/5/2024,Banana,Breakfast,105,0.4,1.3,27
2024-01-16,Chicken,Lunch,280,6,52,0
01/17/2024,Salmon,Dinner,290,13,40,0
1/8/2024,Greek Yogurt,Breakfast,150,4,20,9
12/31/2023,New Year's Eve Dinner,Dinner,850,35,45,72`,
  },
  {
    name: 'test_macrofactor_format.csv',
    label: 'MacroFactor',
    expectedSource: 'macrofactor',
    content: `Date,Food Name,Calories,Protein (g),Carbs (g),Fat (g),Time,Servings
2024-01-15,Oatmeal,300,10,54,6,07:30,1
2024-01-15,Protein Shake,250,40,12,4,08:00,1
2024-01-15,Chicken & Rice Bowl,550,45,55,12,12:30,1
2024-01-15,Apple,95,0.5,25,0.3,15:00,1
2024-01-15,Salmon with Vegetables,480,42,18,22,19:00,1
2024-01-16,Eggs and Toast,380,22,28,18,07:45,1
2024-01-16,Burrito Bowl,620,38,62,20,12:00,1
2024-01-16,Protein Bar,220,20,24,8,15:30,1
2024-01-16,Pasta Bolognese,650,35,68,22,19:30,1
2024-01-17,Smoothie Bowl,420,28,52,12,08:15,1
2024-01-17,Grilled Chicken Wrap,480,38,42,16,12:45,1
2024-01-17,Mixed Nuts,280,8,12,24,16:00,0.5
2024-01-17,Stir Fry,520,40,48,18,19:15,1`,
  },
  {
    name: 'test_nutritionrx_backup.csv',
    label: 'NutritionRx Backup',
    expectedSource: 'nutritionrx',
    content: `Date,Meal,Type,Food Name,Brand,Servings,Calories,Protein (g),Carbs (g),Fat (g)
2024-01-15,Breakfast,quick_add,Morning Shake,,1,350,30,35,10
2024-01-15,Lunch,food_entry,Chicken Breast,Kirkland,2,280,52,0,6
2024-01-15,Lunch,food_entry,Brown Rice,Uncle Ben's,1,215,5,45,1.8
2024-01-15,Dinner,quick_add,Evening Meal,,1,600,40,50,22
2024-01-15,Snack,food_entry,Protein Bar,Quest,1,200,21,22,8
2024-01-16,Breakfast,food_entry,Greek Yogurt,Fage,1.5,225,30,13.5,6
2024-01-16,Lunch,quick_add,Lunch Total,,1,550,38,48,18
2024-01-16,Dinner,food_entry,Salmon,Wild Caught,1,290,40,0,13
2024-01-16,Snack,quick_add,Snack,,1,180,10,20,6`,
  },

  // ── Edge-case / error files ───────────────────────────
  {
    name: 'test_duplicate_import.csv',
    label: 'Duplicate Import (MFP)',
    expectedSource: 'myfitnesspal',
    content: `Date,Meal,Calories,Fat (g),Protein (g),Carbohydrates (g)
2024-01-15,Breakfast,450,15,30,45
2024-01-15,Lunch,650,22,40,60
2024-01-15,Dinner,700,25,45,55
2024-01-16,Breakfast,400,12,28,42
2024-01-16,Lunch,600,20,38,58`,
  },
  {
    name: 'test_empty.csv',
    label: 'Empty File',
    content: '',
  },
  {
    name: 'test_headers_only.csv',
    label: 'Headers Only (MFP)',
    expectedSource: 'myfitnesspal',
    content: `Date,Meal,Calories,Fat (g),Protein (g),Carbohydrates (g)`,
  },
  {
    name: 'test_malformed_rows.csv',
    label: 'Malformed Rows (MFP)',
    expectedSource: 'myfitnesspal',
    content: `Date,Meal,Calories,Fat (g),Protein (g),Carbohydrates (g)
2024-01-15,Breakfast,450,15,30,45
not-a-date,Lunch,650,22,40,60
2024-01-15,Dinner,,25,45,55
2024-01-15,,200,8,10,22
2024-01-16,Breakfast,abc,12,28,42
2024-01-16,Lunch,600,20,38,58
,,,,,,
2024-01-16,Dinner,750,28,42,62`,
  },
  {
    name: 'test_special_characters.csv',
    label: 'Special Characters (Cronometer)',
    expectedSource: 'cronometer',
    content: `Day,Group,Food Name,Amount,Energy (kcal),Protein (g),Carbs (g),Fat (g)
2024-01-15,Breakfast,"M\u00FCsli mit Fr\u00FCchten","1 cup",320,12,52,8
2024-01-15,Breakfast,Caf\u00E9 au Lait,"1 mug",120,6,10,5
2024-01-15,Lunch,"Farmer's Market Salad","1 bowl",280,18,22,14
2024-01-15,Lunch,"Rice & Beans, Spicy","1.5 cups",380,14,58,8
2024-01-15,Dinner,"Chicken ""Parmesan""","8 oz",520,42,28,24
2024-01-15,Dinner,C\u00F4te de B\u0153uf,"6 oz",450,55,0,25
2024-01-16,Breakfast,A\u00E7a\u00ED Bowl,"1 bowl",380,8,62,12
2024-01-16,Lunch,P\u00E3o de Queijo,"3 pieces",240,8,30,10
2024-01-16,Dinner,Cr\u00E8me Br\u00FBl\u00E9e,"1 serving",320,4,38,18`,
  },
  {
    name: 'test_wrong_format.csv',
    label: 'Wrong Format (contacts)',
    content: `Name,Email,Phone,Company
John Doe,john@example.com,555-1234,Acme Corp
Jane Smith,jane@example.com,555-5678,Globex
Bob Wilson,bob@example.com,555-9012,Initech`,
  },
  {
    name: 'test_zero_calorie_entries.csv',
    label: 'Zero Calorie Entries (MFP)',
    expectedSource: 'myfitnesspal',
    content: `Date,Meal,Calories,Fat (g),Protein (g),Carbohydrates (g)
2024-01-15,Breakfast,0,0,0,0
2024-01-15,Lunch,650,22,40,60
2024-01-15,Dinner,700,25,45,55
2024-01-15,Snacks,0,0,0,0
2024-01-16,Breakfast,400,12,28,42
2024-01-16,Lunch,0,0,0,0
2024-01-16,Dinner,750,28,42,62`,
  },
];
