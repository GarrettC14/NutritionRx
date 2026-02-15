import { BUNDLED_RESTAURANTS, BUNDLED_RESTAURANT_IDS, BUNDLED_ITEM_COUNT } from '@/services/restaurants/restaurantData';

describe('restaurantData', () => {
  describe('BUNDLED_RESTAURANTS', () => {
    it('contains 10 restaurant packages', () => {
      expect(BUNDLED_RESTAURANTS).toHaveLength(10);
    });

    it('each package has restaurant and menu properties', () => {
      for (const pkg of BUNDLED_RESTAURANTS) {
        expect(pkg).toHaveProperty('restaurant');
        expect(pkg).toHaveProperty('menu');
      }
    });

    it('each restaurant has required fields', () => {
      for (const { restaurant } of BUNDLED_RESTAURANTS) {
        expect(restaurant.id).toBeDefined();
        expect(typeof restaurant.id).toBe('string');
        expect(restaurant.name).toBeDefined();
        expect(typeof restaurant.name).toBe('string');
        expect(restaurant.slug).toBeDefined();
        expect(restaurant.categories).toBeInstanceOf(Array);
        expect(restaurant.categories.length).toBeGreaterThan(0);
        expect(restaurant.metadata).toBeDefined();
        expect(restaurant.metadata.lastUpdated).toBeDefined();
        expect(restaurant.metadata.source).toBe('bundled');
        expect(restaurant.metadata.isVerified).toBe(true);
      }
    });

    it('each restaurant has unique IDs', () => {
      const ids = BUNDLED_RESTAURANTS.map((r) => r.restaurant.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('each category has required fields', () => {
      for (const { restaurant } of BUNDLED_RESTAURANTS) {
        for (const cat of restaurant.categories) {
          expect(cat.id).toBeDefined();
          expect(cat.name).toBeDefined();
          expect(typeof cat.displayOrder).toBe('number');
        }
      }
    });

    it('each menu item has required nutrition fields', () => {
      for (const { menu } of BUNDLED_RESTAURANTS) {
        for (const item of menu.items) {
          expect(item.id).toBeDefined();
          expect(item.categoryId).toBeDefined();
          expect(item.name).toBeDefined();
          expect(typeof item.nutrition.calories).toBe('number');
          expect(typeof item.nutrition.protein).toBe('number');
          expect(typeof item.nutrition.carbohydrates).toBe('number');
          expect(typeof item.nutrition.fat).toBe('number');
          expect(item.nutrition.calories).toBeGreaterThanOrEqual(0);
          expect(item.nutrition.protein).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('each menu item has serving info', () => {
      for (const { menu } of BUNDLED_RESTAURANTS) {
        for (const item of menu.items) {
          expect(item.serving).toBeDefined();
          expect(item.serving.size).toBeDefined();
        }
      }
    });

    it('each menu item has metadata', () => {
      for (const { menu } of BUNDLED_RESTAURANTS) {
        for (const item of menu.items) {
          expect(item.metadata).toBeDefined();
          expect(item.metadata.source).toBeDefined();
          expect(item.metadata.lastVerified).toBeDefined();
        }
      }
    });

    it('menu item categoryIds reference valid restaurant categories', () => {
      for (const { restaurant, menu } of BUNDLED_RESTAURANTS) {
        const validCategoryIds = new Set(restaurant.categories.map((c) => c.id));
        for (const item of menu.items) {
          expect(validCategoryIds.has(item.categoryId)).toBe(true);
        }
      }
    });

    it('includes expected restaurants', () => {
      const names = BUNDLED_RESTAURANTS.map((r) => r.restaurant.name);
      expect(names).toContain("McDonald's");
      expect(names).toContain('Chipotle');
      expect(names).toContain('Starbucks');
      expect(names).toContain('Chick-fil-A');
      expect(names).toContain('Subway');
    });
  });

  describe('BUNDLED_RESTAURANT_IDS', () => {
    it('contains IDs matching BUNDLED_RESTAURANTS', () => {
      const expectedIds = BUNDLED_RESTAURANTS.map((r) => r.restaurant.id);
      expect(BUNDLED_RESTAURANT_IDS).toEqual(expectedIds);
    });

    it('has correct count', () => {
      expect(BUNDLED_RESTAURANT_IDS).toHaveLength(10);
    });
  });

  describe('BUNDLED_ITEM_COUNT', () => {
    it('equals total number of menu items across all restaurants', () => {
      const totalItems = BUNDLED_RESTAURANTS.reduce(
        (sum, pkg) => sum + pkg.menu.items.length,
        0,
      );
      expect(BUNDLED_ITEM_COUNT).toBe(totalItems);
    });

    it('is a positive number', () => {
      expect(BUNDLED_ITEM_COUNT).toBeGreaterThan(0);
    });
  });
});
