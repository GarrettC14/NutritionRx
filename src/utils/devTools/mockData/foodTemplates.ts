/** Meal templates using seed food IDs (seed-001 through seed-150) */

export interface MealTemplate {
  foodId: string;
  servings: number;
}

export interface MealOption {
  name: string;
  items: MealTemplate[];
}

export const BREAKFAST_TEMPLATES: MealOption[] = [
  {
    name: 'Oatmeal + Banana + Protein Shake',
    items: [
      { foodId: 'seed-057', servings: 0.5 },
      { foodId: 'seed-024', servings: 1 },
      { foodId: 'seed-104', servings: 1 },
    ],
  },
  {
    name: 'Eggs + Whole Wheat Toast',
    items: [
      { foodId: 'seed-004', servings: 3 },
      { foodId: 'seed-059', servings: 0.5 },
      { foodId: 'seed-120', servings: 1 },
    ],
  },
  {
    name: 'Greek Yogurt + Blueberries + Granola',
    items: [
      { foodId: 'seed-063', servings: 2 },
      { foodId: 'seed-028', servings: 1 },
      { foodId: 'seed-106', servings: 0.3 },
    ],
  },
  {
    name: 'Bagel + Cream Cheese + Latte',
    items: [
      { foodId: 'seed-115', servings: 1 },
      { foodId: 'seed-074', servings: 0.3 },
      { foodId: 'seed-121', servings: 1 },
    ],
  },
  {
    name: 'Protein Shake + Banana',
    items: [
      { foodId: 'seed-104', servings: 1.5 },
      { foodId: 'seed-024', servings: 1 },
    ],
  },
  {
    name: 'Eggs + Avocado Toast',
    items: [
      { foodId: 'seed-004', servings: 2 },
      { foodId: 'seed-059', servings: 0.5 },
      { foodId: 'seed-034', servings: 0.3 },
    ],
  },
];

export const LUNCH_TEMPLATES: MealOption[] = [
  {
    name: 'Chicken Breast + Brown Rice + Broccoli',
    items: [
      { foodId: 'seed-001', servings: 1.5 },
      { foodId: 'seed-054', servings: 1.5 },
      { foodId: 'seed-037', servings: 1 },
    ],
  },
  {
    name: 'Tuna Salad Sandwich',
    items: [
      { foodId: 'seed-015', servings: 1 },
      { foodId: 'seed-059', servings: 1 },
      { foodId: 'seed-038', servings: 0.5 },
      { foodId: 'seed-043', servings: 0.5 },
    ],
  },
  {
    name: 'Turkey Wrap',
    items: [
      { foodId: 'seed-011', servings: 1 },
      { foodId: 'seed-061', servings: 1 },
      { foodId: 'seed-034', servings: 0.5 },
      { foodId: 'seed-071', servings: 0.3 },
    ],
  },
  {
    name: 'Caesar Salad with Chicken',
    items: [{ foodId: 'seed-103', servings: 3 }],
  },
  {
    name: 'Chicken + Quinoa Bowl',
    items: [
      { foodId: 'seed-001', servings: 1.5 },
      { foodId: 'seed-055', servings: 1 },
      { foodId: 'seed-041', servings: 0.5 },
    ],
  },
  {
    name: 'Ground Turkey + Rice',
    items: [
      { foodId: 'seed-012', servings: 1.5 },
      { foodId: 'seed-054', servings: 1 },
      { foodId: 'seed-047', servings: 1 },
    ],
  },
];

export const DINNER_TEMPLATES: MealOption[] = [
  {
    name: 'Salmon + Sweet Potato + Asparagus',
    items: [
      { foodId: 'seed-013', servings: 1.5 },
      { foodId: 'seed-044', servings: 1.5 },
      { foodId: 'seed-046', servings: 1 },
    ],
  },
  {
    name: 'Beef Steak + Baked Potato + Green Beans',
    items: [
      { foodId: 'seed-008', servings: 1.5 },
      { foodId: 'seed-045', servings: 1.5 },
      { foodId: 'seed-047', servings: 1 },
    ],
  },
  {
    name: 'Pasta with Ground Turkey',
    items: [
      { foodId: 'seed-058', servings: 2 },
      { foodId: 'seed-012', servings: 1 },
      { foodId: 'seed-082', servings: 1 },
    ],
  },
  {
    name: 'Chicken Thigh + Quinoa + Veggies',
    items: [
      { foodId: 'seed-002', servings: 1.5 },
      { foodId: 'seed-055', servings: 1.5 },
      { foodId: 'seed-041', servings: 1 },
      { foodId: 'seed-049', servings: 0.5 },
    ],
  },
  {
    name: 'Salmon + Brown Rice',
    items: [
      { foodId: 'seed-013', servings: 1.5 },
      { foodId: 'seed-054', servings: 1.5 },
      { foodId: 'seed-038', servings: 0.5 },
    ],
  },
  {
    name: 'Chicken Breast + Pasta',
    items: [
      { foodId: 'seed-001', servings: 1.5 },
      { foodId: 'seed-058', servings: 1.5 },
      { foodId: 'seed-082', servings: 0.5 },
    ],
  },
];

export const SNACK_TEMPLATES: MealOption[] = [
  {
    name: 'Protein Bar',
    items: [{ foodId: 'seed-105', servings: 1 }],
  },
  {
    name: 'Apple + Peanut Butter',
    items: [
      { foodId: 'seed-025', servings: 1 },
      { foodId: 'seed-080', servings: 0.15 },
    ],
  },
  {
    name: 'Greek Yogurt',
    items: [{ foodId: 'seed-063', servings: 1.5 }],
  },
  {
    name: 'Almonds',
    items: [{ foodId: 'seed-076', servings: 0.3 }],
  },
  {
    name: 'Banana',
    items: [{ foodId: 'seed-024', servings: 1 }],
  },
  {
    name: 'Protein Shake',
    items: [{ foodId: 'seed-104', servings: 1 }],
  },
];

export const ALL_TEMPLATES = {
  breakfast: BREAKFAST_TEMPLATES,
  lunch: LUNCH_TEMPLATES,
  dinner: DINNER_TEMPLATES,
  snack: SNACK_TEMPLATES,
} as const;

export type MealType = keyof typeof ALL_TEMPLATES;

/** IDs of seed foods suitable for favorites */
export const FAVORITE_FOOD_IDS = [
  'seed-001', // Chicken breast
  'seed-004', // Eggs
  'seed-013', // Salmon
  'seed-024', // Banana
  'seed-054', // Brown rice
  'seed-063', // Greek yogurt
  'seed-080', // Peanut butter
  'seed-104', // Protein shake
  'seed-105', // Protein bar
  'seed-025', // Apple
  'seed-055', // Quinoa
  'seed-034', // Avocado
];
