import {
  BREAKFAST_TEMPLATES,
  LUNCH_TEMPLATES,
  DINNER_TEMPLATES,
  SNACK_TEMPLATES,
  ALL_TEMPLATES,
  FAVORITE_FOOD_IDS,
  type MealTemplate,
  type MealOption,
  type MealType,
} from '../mockData/foodTemplates';

describe('BREAKFAST_TEMPLATES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(BREAKFAST_TEMPLATES)).toBe(true);
    expect(BREAKFAST_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('each template has a name and non-empty items array', () => {
    for (const template of BREAKFAST_TEMPLATES) {
      expect(typeof template.name).toBe('string');
      expect(template.name.length).toBeGreaterThan(0);
      expect(Array.isArray(template.items)).toBe(true);
      expect(template.items.length).toBeGreaterThan(0);
    }
  });

  it('each item has a foodId starting with "seed-" and positive servings', () => {
    for (const template of BREAKFAST_TEMPLATES) {
      for (const item of template.items) {
        expect(item.foodId).toMatch(/^seed-\d+$/);
        expect(item.servings).toBeGreaterThan(0);
      }
    }
  });
});

describe('LUNCH_TEMPLATES', () => {
  it('is a non-empty array', () => {
    expect(LUNCH_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('all items reference seed food IDs', () => {
    for (const template of LUNCH_TEMPLATES) {
      for (const item of template.items) {
        expect(item.foodId).toMatch(/^seed-\d+$/);
      }
    }
  });
});

describe('DINNER_TEMPLATES', () => {
  it('is a non-empty array', () => {
    expect(DINNER_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('all items reference seed food IDs with positive servings', () => {
    for (const template of DINNER_TEMPLATES) {
      for (const item of template.items) {
        expect(item.foodId).toMatch(/^seed-\d+$/);
        expect(item.servings).toBeGreaterThan(0);
      }
    }
  });
});

describe('SNACK_TEMPLATES', () => {
  it('is a non-empty array', () => {
    expect(SNACK_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('all items reference seed food IDs', () => {
    for (const template of SNACK_TEMPLATES) {
      for (const item of template.items) {
        expect(item.foodId).toMatch(/^seed-\d+$/);
      }
    }
  });
});

describe('ALL_TEMPLATES', () => {
  it('has exactly 4 meal type keys', () => {
    const keys = Object.keys(ALL_TEMPLATES);
    expect(keys).toEqual(['breakfast', 'lunch', 'dinner', 'snack']);
  });

  it('maps to the individual template arrays', () => {
    expect(ALL_TEMPLATES.breakfast).toBe(BREAKFAST_TEMPLATES);
    expect(ALL_TEMPLATES.lunch).toBe(LUNCH_TEMPLATES);
    expect(ALL_TEMPLATES.dinner).toBe(DINNER_TEMPLATES);
    expect(ALL_TEMPLATES.snack).toBe(SNACK_TEMPLATES);
  });

  it('every template across all meals has valid structure', () => {
    const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
    for (const mealType of mealTypes) {
      const templates = ALL_TEMPLATES[mealType];
      expect(templates.length).toBeGreaterThan(0);
      for (const template of templates) {
        expect(typeof template.name).toBe('string');
        expect(template.items.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('FAVORITE_FOOD_IDS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(FAVORITE_FOOD_IDS)).toBe(true);
    expect(FAVORITE_FOOD_IDS.length).toBeGreaterThan(0);
  });

  it('all IDs are seed food IDs', () => {
    for (const id of FAVORITE_FOOD_IDS) {
      expect(id).toMatch(/^seed-\d+$/);
    }
  });

  it('has no duplicate IDs', () => {
    const unique = new Set(FAVORITE_FOOD_IDS);
    expect(unique.size).toBe(FAVORITE_FOOD_IDS.length);
  });

  it('contains well-known food IDs', () => {
    expect(FAVORITE_FOOD_IDS).toContain('seed-001'); // Chicken breast
    expect(FAVORITE_FOOD_IDS).toContain('seed-004'); // Eggs
    expect(FAVORITE_FOOD_IDS).toContain('seed-013'); // Salmon
  });
});
