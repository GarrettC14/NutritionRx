export const EDGE_CASE_STRINGS = {
  unicode: ['Acai Bowl', 'Gruner Tee', 'Creme brulee', 'Naive cafe', 'Pho bo', 'Muesli'],
  emoji: ['Morning workout \u{1F4AA}', 'Rest day \u{1F634}', 'PR! \u{1F389}\u{1F525}', 'Feeling great \u{1F957}', 'Meal prep Sunday \u{1F373}', 'Cheat day \u{1F355}'],
  special: ["O'Brien's Pub grub", 'Test "quoted" entry', 'Rice & beans', 'PB&J sandwich', 'Mac n\' cheese'],
  long: ['A'.repeat(500)], // Max length test
  whitespace: ['  padded text  ', 'text'],
} as const;

export const EDGE_CASE_FOOD_NOTES: string[] = [
  'Post-workout meal \u{1F4AA}',
  'Acai Bowl from new place',
  "Grandma's recipe - extra sauce",
  'Test "double quoted" note',
  'Half portion - wasn\'t hungry',
  '',
  'A'.repeat(500),
  '  extra spaces  ',
  'Rice & beans with chimichurri',
];

export const EDGE_CASE_QUICK_ADD_DESCRIPTIONS: string[] = [
  'Black coffee - 0 cal',
  'Water with lemon',
  'Acai bowl from food truck',
  "Friend's homemade cookies \u{1F36A}",
  'Mystery office snack',
  'Gruner smoothie',
];

export const EDGE_CASE_SERVINGS = [0.01, 0.1, 0.25, 0.33, 0.5, 1, 1.5, 2, 3, 5, 10];

export const EDGE_CASE_WEIGHTS_KG = [45.0, 50.5, 60.0, 75.3, 90.0, 100.0, 120.5, 150.0, 200.0];

export const EDGE_CASE_DATES = {
  yearBoundary: ['2024-12-31', '2025-01-01'],
  leapDay: ['2024-02-29'],
  monthEnds: ['2025-01-31', '2025-02-28', '2025-03-31'],
};
