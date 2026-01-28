/**
 * Food Sources for Nutrient Deficiency Alerts
 * Maps nutrients to common food sources for suggestions
 */

export const NUTRIENT_FOOD_SOURCES: Record<string, string[]> = {
  iron: ['spinach', 'lentils', 'fortified cereals', 'dark chocolate', 'tofu', 'chickpeas', 'red meat', 'quinoa'],
  calcium: ['dairy products', 'fortified plant milk', 'leafy greens', 'sardines', 'tofu', 'almonds', 'broccoli'],
  vitamin_d: ['fatty fish (salmon, mackerel)', 'fortified milk', 'egg yolks', 'mushrooms', 'fortified orange juice', 'sunshine!'],
  vitamin_b12: ['meat', 'fish', 'dairy', 'eggs', 'fortified nutritional yeast', 'fortified cereals', 'fortified plant milk'],
  magnesium: ['nuts', 'seeds', 'whole grains', 'leafy greens', 'dark chocolate', 'avocado', 'bananas'],
  zinc: ['oysters', 'beef', 'pumpkin seeds', 'chickpeas', 'cashews', 'yogurt', 'lentils'],
  vitamin_c: ['citrus fruits', 'bell peppers', 'strawberries', 'broccoli', 'kiwi', 'tomatoes', 'Brussels sprouts'],
  potassium: ['bananas', 'potatoes', 'beans', 'spinach', 'yogurt', 'salmon', 'avocado', 'sweet potatoes'],
  folate: ['leafy greens', 'legumes', 'asparagus', 'fortified grains', 'citrus fruits', 'beets', 'eggs'],
  vitamin_a: ['sweet potatoes', 'carrots', 'spinach', 'cantaloupe', 'eggs', 'bell peppers', 'mangoes'],
  fiber: ['whole grains', 'legumes', 'berries', 'vegetables', 'nuts', 'seeds', 'avocado', 'apples'],
  omega_3: ['fatty fish (salmon, sardines)', 'walnuts', 'flaxseed', 'chia seeds', 'fortified eggs', 'hemp seeds'],
  vitamin_e: ['almonds', 'sunflower seeds', 'spinach', 'avocado', 'olive oil', 'peanuts', 'hazelnuts'],
  vitamin_k: ['leafy greens (kale, spinach)', 'broccoli', 'Brussels sprouts', 'green beans', 'prunes', 'kiwi'],
  thiamine: ['whole grains', 'pork', 'legumes', 'fortified cereals', 'nuts', 'seeds', 'sunflower seeds'],
  riboflavin: ['dairy products', 'eggs', 'lean meats', 'mushrooms', 'almonds', 'fortified cereals'],
  niacin: ['poultry', 'fish', 'peanuts', 'mushrooms', 'green peas', 'fortified cereals'],
  vitamin_b6: ['poultry', 'fish', 'potatoes', 'bananas', 'chickpeas', 'fortified cereals'],
  phosphorus: ['dairy products', 'meat', 'fish', 'poultry', 'legumes', 'nuts', 'whole grains'],
  selenium: ['Brazil nuts', 'fish', 'meat', 'poultry', 'eggs', 'sunflower seeds'],
  copper: ['shellfish', 'nuts', 'seeds', 'whole grains', 'dark chocolate', 'potatoes'],
  manganese: ['whole grains', 'nuts', 'legumes', 'tea', 'leafy greens', 'pineapple'],
};

export function getFoodSuggestions(nutrientId: string, count: number = 4): string[] {
  const foods = NUTRIENT_FOOD_SOURCES[nutrientId] || [];
  return foods.slice(0, Math.min(count, foods.length));
}

export function getFormattedFoodSuggestions(nutrientId: string): string {
  const foods = getFoodSuggestions(nutrientId, 4);
  if (foods.length === 0) return '';
  return foods.join(', ');
}
