/**
 * Bundled Restaurant Data
 * Pre-loaded data for top restaurant chains
 * Data sourced from official restaurant nutrition information
 */

import { BundledRestaurantData, BundledMenuData } from '@/types/restaurant';

interface BundledRestaurantPackage {
  restaurant: BundledRestaurantData;
  menu: BundledMenuData;
}

// ============================================================
// McDonald's
// ============================================================

const mcdonaldsRestaurant: BundledRestaurantData = {
  id: 'mcdonalds',
  name: "McDonald's",
  slug: 'mcdonalds',
  logoAsset: 'mcdonalds',
  categories: [
    { id: 'burgers', name: 'Burgers & Sandwiches', displayOrder: 1, icon: 'burger' },
    { id: 'chicken', name: 'Chicken & Fish', displayOrder: 2, icon: 'chicken' },
    { id: 'breakfast', name: 'Breakfast', displayOrder: 3, icon: 'breakfast' },
    { id: 'sides', name: 'Sides & Snacks', displayOrder: 4, icon: 'fries' },
    { id: 'drinks', name: 'Drinks', displayOrder: 5, icon: 'drink' },
    { id: 'desserts', name: 'Desserts', displayOrder: 6, icon: 'dessert' },
  ],
  metadata: {
    lastUpdated: '2025-01-15',
    source: 'bundled',
    isVerified: true,
  },
};

const mcdonaldsMenu: BundledMenuData = {
  items: [
    {
      id: 'mcd-big-mac',
      categoryId: 'burgers',
      name: 'Big Mac',
      description: 'Two beef patties, special sauce, lettuce, cheese, pickles, onions on a sesame seed bun',
      nutrition: { calories: 590, protein: 25, carbohydrates: 46, fat: 34, fiber: 3, sugar: 9, sodium: 1050, saturatedFat: 11 },
      serving: { size: '1 sandwich (215g)', sizeGrams: 215 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'mcd-quarter-pounder',
      categoryId: 'burgers',
      name: 'Quarter Pounder with Cheese',
      description: 'Fresh beef patty with cheese, onions, pickles, ketchup, mustard',
      nutrition: { calories: 520, protein: 30, carbohydrates: 42, fat: 27, fiber: 2, sugar: 10, sodium: 1140, saturatedFat: 13 },
      serving: { size: '1 sandwich (202g)', sizeGrams: 202 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'mcd-double-quarter',
      categoryId: 'burgers',
      name: 'Double Quarter Pounder with Cheese',
      nutrition: { calories: 740, protein: 48, carbohydrates: 43, fat: 43, fiber: 2, sugar: 10, sodium: 1360, saturatedFat: 21 },
      serving: { size: '1 sandwich (280g)', sizeGrams: 280 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'mcd-mcdouble',
      categoryId: 'burgers',
      name: 'McDouble',
      nutrition: { calories: 400, protein: 22, carbohydrates: 33, fat: 20, fiber: 2, sugar: 7, sodium: 920, saturatedFat: 9 },
      serving: { size: '1 sandwich (155g)', sizeGrams: 155 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'mcd-cheeseburger',
      categoryId: 'burgers',
      name: 'Cheeseburger',
      nutrition: { calories: 300, protein: 15, carbohydrates: 32, fat: 13, fiber: 1, sugar: 7, sodium: 720, saturatedFat: 6 },
      serving: { size: '1 sandwich (119g)', sizeGrams: 119 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'mcd-mcchicken',
      categoryId: 'chicken',
      name: 'McChicken',
      nutrition: { calories: 400, protein: 14, carbohydrates: 40, fat: 21, fiber: 2, sugar: 5, sodium: 780, saturatedFat: 4 },
      serving: { size: '1 sandwich (143g)', sizeGrams: 143 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'mcd-10pc-nuggets',
      categoryId: 'chicken',
      name: 'Chicken McNuggets (10 piece)',
      nutrition: { calories: 420, protein: 25, carbohydrates: 26, fat: 25, fiber: 1, sugar: 0, sodium: 900, saturatedFat: 4 },
      serving: { size: '10 pieces (162g)', sizeGrams: 162 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'mcd-filet-o-fish',
      categoryId: 'chicken',
      name: 'Filet-O-Fish',
      nutrition: { calories: 390, protein: 16, carbohydrates: 39, fat: 19, fiber: 2, sugar: 5, sodium: 580, saturatedFat: 4 },
      serving: { size: '1 sandwich (136g)', sizeGrams: 136 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'mcd-egg-mcmuffin',
      categoryId: 'breakfast',
      name: 'Egg McMuffin',
      nutrition: { calories: 310, protein: 17, carbohydrates: 30, fat: 13, fiber: 2, sugar: 3, sodium: 770, saturatedFat: 6 },
      serving: { size: '1 sandwich (137g)', sizeGrams: 137 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'mcd-sausage-mcmuffin',
      categoryId: 'breakfast',
      name: 'Sausage McMuffin with Egg',
      nutrition: { calories: 480, protein: 21, carbohydrates: 30, fat: 31, fiber: 2, sugar: 2, sodium: 920, saturatedFat: 12 },
      serving: { size: '1 sandwich (167g)', sizeGrams: 167 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'mcd-hotcakes',
      categoryId: 'breakfast',
      name: 'Hotcakes',
      nutrition: { calories: 580, protein: 9, carbohydrates: 102, fat: 15, fiber: 2, sugar: 45, sodium: 600, saturatedFat: 4 },
      serving: { size: '3 hotcakes with syrup (228g)', sizeGrams: 228 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'mcd-medium-fries',
      categoryId: 'sides',
      name: 'French Fries (Medium)',
      nutrition: { calories: 320, protein: 4, carbohydrates: 43, fat: 15, fiber: 4, sugar: 0, sodium: 260, saturatedFat: 2 },
      serving: { size: 'Medium (111g)', sizeGrams: 111 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'mcd-large-fries',
      categoryId: 'sides',
      name: 'French Fries (Large)',
      nutrition: { calories: 480, protein: 6, carbohydrates: 65, fat: 23, fiber: 6, sugar: 0, sodium: 400, saturatedFat: 3 },
      serving: { size: 'Large (154g)', sizeGrams: 154 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'mcd-medium-coke',
      categoryId: 'drinks',
      name: 'Coca-Cola (Medium)',
      nutrition: { calories: 210, protein: 0, carbohydrates: 58, fat: 0, fiber: 0, sugar: 58, sodium: 10 },
      serving: { size: 'Medium (21 fl oz)', sizeGrams: 621 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'mcd-mcflurry-oreo',
      categoryId: 'desserts',
      name: 'McFlurry with OREO Cookies',
      nutrition: { calories: 510, protein: 13, carbohydrates: 80, fat: 17, fiber: 1, sugar: 64, sodium: 280, saturatedFat: 9 },
      serving: { size: '1 McFlurry (285g)', sizeGrams: 285 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
  ],
};

// ============================================================
// Chipotle
// ============================================================

const chipotleRestaurant: BundledRestaurantData = {
  id: 'chipotle',
  name: 'Chipotle',
  slug: 'chipotle',
  logoAsset: 'chipotle',
  categories: [
    { id: 'bowls', name: 'Bowls & Salads', displayOrder: 1, icon: 'bowl' },
    { id: 'burritos', name: 'Burritos & Tacos', displayOrder: 2, icon: 'burrito' },
    { id: 'quesadillas', name: 'Quesadillas', displayOrder: 3, icon: 'quesadilla' },
    { id: 'sides', name: 'Sides', displayOrder: 4, icon: 'side' },
    { id: 'drinks', name: 'Drinks', displayOrder: 5, icon: 'drink' },
  ],
  metadata: {
    lastUpdated: '2025-01-15',
    source: 'bundled',
    isVerified: true,
  },
};

const chipotleMenu: BundledMenuData = {
  items: [
    {
      id: 'chipotle-chicken-bowl',
      categoryId: 'bowls',
      name: 'Chicken Bowl',
      description: 'Cilantro-lime rice, black beans, chicken, fresh tomato salsa, cheese, lettuce',
      nutrition: { calories: 665, protein: 45, carbohydrates: 52, fat: 24, fiber: 12, sugar: 5, sodium: 1480, saturatedFat: 7 },
      serving: { size: '1 bowl', sizeGrams: 510 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'chipotle-steak-bowl',
      categoryId: 'bowls',
      name: 'Steak Bowl',
      description: 'Cilantro-lime rice, black beans, steak, fresh tomato salsa, cheese, lettuce',
      nutrition: { calories: 680, protein: 42, carbohydrates: 52, fat: 26, fiber: 12, sugar: 5, sodium: 1370, saturatedFat: 9 },
      serving: { size: '1 bowl', sizeGrams: 510 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'chipotle-carnitas-bowl',
      categoryId: 'bowls',
      name: 'Carnitas Bowl',
      description: 'Cilantro-lime rice, pinto beans, carnitas, roasted chili-corn salsa, sour cream, lettuce',
      nutrition: { calories: 720, protein: 38, carbohydrates: 57, fat: 32, fiber: 13, sugar: 6, sodium: 1590, saturatedFat: 11 },
      serving: { size: '1 bowl', sizeGrams: 520 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'chipotle-chicken-burrito',
      categoryId: 'burritos',
      name: 'Chicken Burrito',
      description: 'Flour tortilla, cilantro-lime rice, black beans, chicken, fresh tomato salsa, cheese, sour cream, lettuce',
      nutrition: { calories: 1050, protein: 56, carbohydrates: 102, fat: 40, fiber: 14, sugar: 7, sodium: 2320, saturatedFat: 15 },
      serving: { size: '1 burrito', sizeGrams: 570 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'chipotle-steak-burrito',
      categoryId: 'burritos',
      name: 'Steak Burrito',
      nutrition: { calories: 1070, protein: 53, carbohydrates: 103, fat: 43, fiber: 14, sugar: 7, sodium: 2210, saturatedFat: 17 },
      serving: { size: '1 burrito', sizeGrams: 570 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'chipotle-chicken-tacos',
      categoryId: 'burritos',
      name: 'Chicken Tacos (3)',
      description: 'Three soft corn tortillas, chicken, fresh tomato salsa, cheese, lettuce',
      nutrition: { calories: 540, protein: 38, carbohydrates: 42, fat: 21, fiber: 8, sugar: 3, sodium: 1090, saturatedFat: 7 },
      serving: { size: '3 tacos', sizeGrams: 340 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'chipotle-quesadilla-chicken',
      categoryId: 'quesadillas',
      name: 'Chicken Quesadilla',
      nutrition: { calories: 900, protein: 48, carbohydrates: 63, fat: 47, fiber: 3, sugar: 2, sodium: 1770, saturatedFat: 22 },
      serving: { size: '1 quesadilla', sizeGrams: 300 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'chipotle-chips-guac',
      categoryId: 'sides',
      name: 'Chips & Guacamole',
      nutrition: { calories: 770, protein: 7, carbohydrates: 64, fat: 53, fiber: 14, sugar: 2, sodium: 690, saturatedFat: 8 },
      serving: { size: '1 order', sizeGrams: 220 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'chipotle-chips-salsa',
      categoryId: 'sides',
      name: 'Chips & Fresh Tomato Salsa',
      nutrition: { calories: 600, protein: 7, carbohydrates: 70, fat: 32, fiber: 7, sugar: 4, sodium: 730, saturatedFat: 5 },
      serving: { size: '1 order', sizeGrams: 180 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'chipotle-guacamole-side',
      categoryId: 'sides',
      name: 'Guacamole (Side)',
      nutrition: { calories: 230, protein: 3, carbohydrates: 13, fat: 21, fiber: 10, sugar: 1, sodium: 340, saturatedFat: 3 },
      serving: { size: '1 side (4 oz)', sizeGrams: 114 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
  ],
};

// ============================================================
// Starbucks
// ============================================================

const starbucksRestaurant: BundledRestaurantData = {
  id: 'starbucks',
  name: 'Starbucks',
  slug: 'starbucks',
  logoAsset: 'starbucks',
  categories: [
    { id: 'coffee', name: 'Hot Coffee', displayOrder: 1, icon: 'coffee' },
    { id: 'espresso', name: 'Espresso Drinks', displayOrder: 2, icon: 'espresso' },
    { id: 'cold', name: 'Cold Drinks', displayOrder: 3, icon: 'cold-drink' },
    { id: 'food', name: 'Food', displayOrder: 4, icon: 'food' },
    { id: 'bakery', name: 'Bakery', displayOrder: 5, icon: 'bakery' },
  ],
  metadata: {
    lastUpdated: '2025-01-15',
    source: 'bundled',
    isVerified: true,
  },
};

const starbucksMenu: BundledMenuData = {
  items: [
    {
      id: 'sbux-latte-grande',
      categoryId: 'espresso',
      name: 'Caffè Latte (Grande)',
      description: 'Espresso with steamed milk',
      nutrition: { calories: 190, protein: 13, carbohydrates: 18, fat: 7, fiber: 0, sugar: 17, sodium: 150 },
      serving: { size: 'Grande (16 fl oz)', sizeGrams: 473 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'sbux-cappuccino-grande',
      categoryId: 'espresso',
      name: 'Cappuccino (Grande)',
      nutrition: { calories: 140, protein: 10, carbohydrates: 14, fat: 5, fiber: 0, sugar: 12, sodium: 115 },
      serving: { size: 'Grande (16 fl oz)', sizeGrams: 473 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'sbux-americano-grande',
      categoryId: 'espresso',
      name: 'Caffè Americano (Grande)',
      nutrition: { calories: 15, protein: 1, carbohydrates: 2, fat: 0, fiber: 0, sugar: 0, sodium: 10 },
      serving: { size: 'Grande (16 fl oz)', sizeGrams: 473 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'sbux-caramel-macchiato',
      categoryId: 'espresso',
      name: 'Caramel Macchiato (Grande)',
      nutrition: { calories: 250, protein: 10, carbohydrates: 34, fat: 7, fiber: 0, sugar: 32, sodium: 150 },
      serving: { size: 'Grande (16 fl oz)', sizeGrams: 473 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'sbux-mocha-grande',
      categoryId: 'espresso',
      name: 'Caffè Mocha (Grande)',
      nutrition: { calories: 360, protein: 13, carbohydrates: 44, fat: 15, fiber: 2, sugar: 35, sodium: 150, saturatedFat: 9 },
      serving: { size: 'Grande (16 fl oz)', sizeGrams: 473 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'sbux-psl-grande',
      categoryId: 'espresso',
      name: 'Pumpkin Spice Latte (Grande)',
      nutrition: { calories: 380, protein: 14, carbohydrates: 52, fat: 14, fiber: 0, sugar: 50, sodium: 240, saturatedFat: 8 },
      serving: { size: 'Grande (16 fl oz)', sizeGrams: 473 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'sbux-pike-place',
      categoryId: 'coffee',
      name: "Pike Place Roast (Grande)",
      nutrition: { calories: 5, protein: 1, carbohydrates: 0, fat: 0, fiber: 0, sugar: 0, sodium: 10 },
      serving: { size: 'Grande (16 fl oz)', sizeGrams: 473 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'sbux-cold-brew',
      categoryId: 'cold',
      name: 'Cold Brew Coffee (Grande)',
      nutrition: { calories: 5, protein: 0, carbohydrates: 0, fat: 0, fiber: 0, sugar: 0, sodium: 10 },
      serving: { size: 'Grande (16 fl oz)', sizeGrams: 473 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'sbux-pink-drink',
      categoryId: 'cold',
      name: 'Pink Drink (Grande)',
      nutrition: { calories: 140, protein: 1, carbohydrates: 28, fat: 2, fiber: 1, sugar: 25, sodium: 65 },
      serving: { size: 'Grande (16 fl oz)', sizeGrams: 473 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'sbux-bacon-gouda',
      categoryId: 'food',
      name: 'Bacon, Gouda & Egg Sandwich',
      nutrition: { calories: 360, protein: 19, carbohydrates: 34, fat: 16, fiber: 1, sugar: 4, sodium: 790, saturatedFat: 7 },
      serving: { size: '1 sandwich (113g)', sizeGrams: 113 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'sbux-impossible-sandwich',
      categoryId: 'food',
      name: 'Impossible Breakfast Sandwich',
      nutrition: { calories: 420, protein: 22, carbohydrates: 34, fat: 22, fiber: 3, sugar: 4, sodium: 790, saturatedFat: 8 },
      serving: { size: '1 sandwich (127g)', sizeGrams: 127 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'sbux-croissant',
      categoryId: 'bakery',
      name: 'Butter Croissant',
      nutrition: { calories: 260, protein: 5, carbohydrates: 29, fat: 14, fiber: 1, sugar: 5, sodium: 280, saturatedFat: 8 },
      serving: { size: '1 croissant (70g)', sizeGrams: 70 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'sbux-chocolate-croissant',
      categoryId: 'bakery',
      name: 'Chocolate Croissant',
      nutrition: { calories: 310, protein: 5, carbohydrates: 36, fat: 17, fiber: 2, sugar: 14, sodium: 260, saturatedFat: 10 },
      serving: { size: '1 croissant (80g)', sizeGrams: 80 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
  ],
};

// ============================================================
// Chick-fil-A
// ============================================================

const chickfilaRestaurant: BundledRestaurantData = {
  id: 'chickfila',
  name: 'Chick-fil-A',
  slug: 'chick-fil-a',
  logoAsset: 'chickfila',
  categories: [
    { id: 'entrees', name: 'Entrées', displayOrder: 1, icon: 'chicken' },
    { id: 'salads', name: 'Salads', displayOrder: 2, icon: 'salad' },
    { id: 'sides', name: 'Sides', displayOrder: 3, icon: 'side' },
    { id: 'breakfast', name: 'Breakfast', displayOrder: 4, icon: 'breakfast' },
    { id: 'treats', name: 'Treats', displayOrder: 5, icon: 'dessert' },
    { id: 'drinks', name: 'Drinks', displayOrder: 6, icon: 'drink' },
  ],
  metadata: {
    lastUpdated: '2025-01-15',
    source: 'bundled',
    isVerified: true,
  },
};

const chickfilaMenu: BundledMenuData = {
  items: [
    {
      id: 'cfa-chicken-sandwich',
      categoryId: 'entrees',
      name: 'Chick-fil-A Chicken Sandwich',
      description: 'Boneless breast of chicken, seasoned, breaded, pressure cooked in refined peanut oil, served on a toasted buttered bun with dill pickle chips',
      nutrition: { calories: 440, protein: 28, carbohydrates: 40, fat: 19, fiber: 1, sugar: 5, sodium: 1350, saturatedFat: 4 },
      serving: { size: '1 sandwich (167g)', sizeGrams: 167 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'cfa-deluxe-sandwich',
      categoryId: 'entrees',
      name: 'Chick-fil-A Deluxe Sandwich',
      description: 'Chicken sandwich with lettuce, tomato, and American cheese',
      nutrition: { calories: 500, protein: 30, carbohydrates: 42, fat: 23, fiber: 2, sugar: 6, sodium: 1640, saturatedFat: 6 },
      serving: { size: '1 sandwich (208g)', sizeGrams: 208 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'cfa-spicy-sandwich',
      categoryId: 'entrees',
      name: 'Spicy Chicken Sandwich',
      nutrition: { calories: 450, protein: 28, carbohydrates: 41, fat: 19, fiber: 2, sugar: 4, sodium: 1620, saturatedFat: 4 },
      serving: { size: '1 sandwich (170g)', sizeGrams: 170 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'cfa-nuggets-8',
      categoryId: 'entrees',
      name: 'Chick-fil-A Nuggets (8-count)',
      nutrition: { calories: 250, protein: 27, carbohydrates: 11, fat: 11, fiber: 0, sugar: 1, sodium: 1030, saturatedFat: 2 },
      serving: { size: '8 pieces (113g)', sizeGrams: 113 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'cfa-nuggets-12',
      categoryId: 'entrees',
      name: 'Chick-fil-A Nuggets (12-count)',
      nutrition: { calories: 380, protein: 40, carbohydrates: 16, fat: 17, fiber: 1, sugar: 1, sodium: 1540, saturatedFat: 4 },
      serving: { size: '12 pieces (170g)', sizeGrams: 170 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'cfa-grilled-nuggets-8',
      categoryId: 'entrees',
      name: 'Grilled Nuggets (8-count)',
      nutrition: { calories: 130, protein: 25, carbohydrates: 1, fat: 3, fiber: 0, sugar: 1, sodium: 530, saturatedFat: 1 },
      serving: { size: '8 pieces (85g)', sizeGrams: 85 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'cfa-waffle-fries-medium',
      categoryId: 'sides',
      name: 'Waffle Potato Fries (Medium)',
      nutrition: { calories: 420, protein: 5, carbohydrates: 45, fat: 24, fiber: 5, sugar: 0, sodium: 280, saturatedFat: 4 },
      serving: { size: 'Medium (125g)', sizeGrams: 125 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'cfa-mac-cheese',
      categoryId: 'sides',
      name: 'Mac & Cheese (Medium)',
      nutrition: { calories: 450, protein: 17, carbohydrates: 32, fat: 28, fiber: 1, sugar: 5, sodium: 1160, saturatedFat: 14 },
      serving: { size: 'Medium (213g)', sizeGrams: 213 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'cfa-chicken-biscuit',
      categoryId: 'breakfast',
      name: 'Chick-fil-A Chicken Biscuit',
      nutrition: { calories: 440, protein: 17, carbohydrates: 47, fat: 20, fiber: 2, sugar: 4, sodium: 1340, saturatedFat: 8 },
      serving: { size: '1 biscuit (163g)', sizeGrams: 163 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'cfa-egg-white-grill',
      categoryId: 'breakfast',
      name: 'Egg White Grill',
      nutrition: { calories: 300, protein: 25, carbohydrates: 31, fat: 8, fiber: 1, sugar: 3, sodium: 880, saturatedFat: 3 },
      serving: { size: '1 sandwich (139g)', sizeGrams: 139 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'cfa-milkshake-cookies',
      categoryId: 'treats',
      name: 'Cookies & Cream Milkshake',
      nutrition: { calories: 530, protein: 14, carbohydrates: 74, fat: 21, fiber: 0, sugar: 66, sodium: 370, saturatedFat: 13 },
      serving: { size: '1 shake (400g)', sizeGrams: 400 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
  ],
};

// ============================================================
// Subway
// ============================================================

const subwayRestaurant: BundledRestaurantData = {
  id: 'subway',
  name: 'Subway',
  slug: 'subway',
  logoAsset: 'subway',
  categories: [
    { id: 'footlong', name: 'Footlong Subs', displayOrder: 1, icon: 'sub' },
    { id: 'six-inch', name: '6-Inch Subs', displayOrder: 2, icon: 'sub' },
    { id: 'wraps', name: 'Wraps', displayOrder: 3, icon: 'wrap' },
    { id: 'salads', name: 'Salads', displayOrder: 4, icon: 'salad' },
    { id: 'sides', name: 'Sides & Extras', displayOrder: 5, icon: 'side' },
  ],
  metadata: {
    lastUpdated: '2025-01-15',
    source: 'bundled',
    isVerified: true,
  },
};

const subwayMenu: BundledMenuData = {
  items: [
    {
      id: 'subway-turkey-6',
      categoryId: 'six-inch',
      name: 'Turkey Breast 6" Sub',
      description: 'Sliced turkey breast on freshly baked bread with your choice of veggies',
      nutrition: { calories: 270, protein: 18, carbohydrates: 40, fat: 4, fiber: 3, sugar: 6, sodium: 730, saturatedFat: 1 },
      serving: { size: '6" sub (220g)', sizeGrams: 220 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'subway-italian-bmt-6',
      categoryId: 'six-inch',
      name: 'Italian B.M.T. 6" Sub',
      description: 'Genoa salami, spicy pepperoni, and Black Forest ham',
      nutrition: { calories: 370, protein: 17, carbohydrates: 41, fat: 15, fiber: 3, sugar: 6, sodium: 1290, saturatedFat: 6 },
      serving: { size: '6" sub (231g)', sizeGrams: 231 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'subway-chicken-teriyaki-6',
      categoryId: 'six-inch',
      name: 'Sweet Onion Chicken Teriyaki 6" Sub',
      nutrition: { calories: 330, protein: 26, carbohydrates: 50, fat: 5, fiber: 3, sugar: 14, sodium: 780, saturatedFat: 1 },
      serving: { size: '6" sub (267g)', sizeGrams: 267 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'subway-meatball-6',
      categoryId: 'six-inch',
      name: 'Meatball Marinara 6" Sub',
      nutrition: { calories: 430, protein: 18, carbohydrates: 53, fat: 17, fiber: 5, sugar: 12, sodium: 1090, saturatedFat: 7 },
      serving: { size: '6" sub (295g)', sizeGrams: 295 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'subway-veggie-delite-6',
      categoryId: 'six-inch',
      name: 'Veggie Delite 6" Sub',
      nutrition: { calories: 200, protein: 7, carbohydrates: 38, fat: 2, fiber: 3, sugar: 5, sodium: 310, saturatedFat: 0 },
      serving: { size: '6" sub (163g)', sizeGrams: 163 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'subway-tuna-6',
      categoryId: 'six-inch',
      name: 'Tuna 6" Sub',
      nutrition: { calories: 470, protein: 20, carbohydrates: 41, fat: 25, fiber: 3, sugar: 5, sodium: 700, saturatedFat: 5 },
      serving: { size: '6" sub (252g)', sizeGrams: 252 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'subway-steak-cheese-footlong',
      categoryId: 'footlong',
      name: 'Steak & Cheese Footlong',
      nutrition: { calories: 780, protein: 50, carbohydrates: 86, fat: 25, fiber: 6, sugar: 12, sodium: 1940, saturatedFat: 10 },
      serving: { size: 'Footlong (440g)', sizeGrams: 440 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'subway-chips',
      categoryId: 'sides',
      name: "Lay's Classic Chips",
      nutrition: { calories: 230, protein: 3, carbohydrates: 23, fat: 15, fiber: 2, sugar: 1, sodium: 250, saturatedFat: 2 },
      serving: { size: '1 bag (42g)', sizeGrams: 42 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'subway-cookie',
      categoryId: 'sides',
      name: 'Chocolate Chip Cookie',
      nutrition: { calories: 200, protein: 2, carbohydrates: 28, fat: 10, fiber: 1, sugar: 17, sodium: 150, saturatedFat: 5 },
      serving: { size: '1 cookie (45g)', sizeGrams: 45 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
  ],
};

// ============================================================
// Taco Bell
// ============================================================

const tacobellRestaurant: BundledRestaurantData = {
  id: 'tacobell',
  name: 'Taco Bell',
  slug: 'taco-bell',
  logoAsset: 'tacobell',
  categories: [
    { id: 'tacos', name: 'Tacos', displayOrder: 1, icon: 'taco' },
    { id: 'burritos', name: 'Burritos', displayOrder: 2, icon: 'burrito' },
    { id: 'specialties', name: 'Specialties', displayOrder: 3, icon: 'star' },
    { id: 'nachos', name: 'Nachos & Sides', displayOrder: 4, icon: 'nachos' },
    { id: 'breakfast', name: 'Breakfast', displayOrder: 5, icon: 'breakfast' },
  ],
  metadata: {
    lastUpdated: '2025-01-15',
    source: 'bundled',
    isVerified: true,
  },
};

const tacobellMenu: BundledMenuData = {
  items: [
    {
      id: 'tb-crunchy-taco',
      categoryId: 'tacos',
      name: 'Crunchy Taco',
      nutrition: { calories: 170, protein: 8, carbohydrates: 13, fat: 10, fiber: 2, sugar: 1, sodium: 310, saturatedFat: 4 },
      serving: { size: '1 taco (78g)', sizeGrams: 78 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'tb-crunchy-taco-supreme',
      categoryId: 'tacos',
      name: 'Crunchy Taco Supreme',
      nutrition: { calories: 200, protein: 9, carbohydrates: 15, fat: 12, fiber: 2, sugar: 2, sodium: 340, saturatedFat: 5 },
      serving: { size: '1 taco (92g)', sizeGrams: 92 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'tb-soft-taco',
      categoryId: 'tacos',
      name: 'Soft Taco',
      nutrition: { calories: 180, protein: 9, carbohydrates: 18, fat: 8, fiber: 2, sugar: 1, sodium: 500, saturatedFat: 4 },
      serving: { size: '1 taco (99g)', sizeGrams: 99 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'tb-doritos-locos-nacho',
      categoryId: 'tacos',
      name: 'Doritos Locos Taco - Nacho Cheese',
      nutrition: { calories: 170, protein: 8, carbohydrates: 14, fat: 9, fiber: 2, sugar: 1, sodium: 370, saturatedFat: 3 },
      serving: { size: '1 taco (78g)', sizeGrams: 78 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'tb-bean-burrito',
      categoryId: 'burritos',
      name: 'Bean Burrito',
      nutrition: { calories: 380, protein: 14, carbohydrates: 55, fat: 11, fiber: 10, sugar: 4, sodium: 1050, saturatedFat: 4 },
      serving: { size: '1 burrito (198g)', sizeGrams: 198 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'tb-burrito-supreme',
      categoryId: 'burritos',
      name: 'Burrito Supreme - Beef',
      nutrition: { calories: 400, protein: 17, carbohydrates: 50, fat: 15, fiber: 6, sugar: 5, sodium: 1140, saturatedFat: 7 },
      serving: { size: '1 burrito (248g)', sizeGrams: 248 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'tb-crunchwrap-supreme',
      categoryId: 'specialties',
      name: 'Crunchwrap Supreme',
      nutrition: { calories: 530, protein: 16, carbohydrates: 55, fat: 26, fiber: 5, sugar: 6, sodium: 1200, saturatedFat: 9 },
      serving: { size: '1 item (254g)', sizeGrams: 254 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'tb-mexican-pizza',
      categoryId: 'specialties',
      name: 'Mexican Pizza',
      nutrition: { calories: 540, protein: 20, carbohydrates: 47, fat: 30, fiber: 6, sugar: 3, sodium: 1030, saturatedFat: 10 },
      serving: { size: '1 pizza (213g)', sizeGrams: 213 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'tb-nachos-bellgrande',
      categoryId: 'nachos',
      name: 'Nachos BellGrande',
      nutrition: { calories: 740, protein: 17, carbohydrates: 82, fat: 38, fiber: 11, sugar: 4, sodium: 1100, saturatedFat: 8 },
      serving: { size: '1 order (308g)', sizeGrams: 308 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'tb-cheesy-gordita-crunch',
      categoryId: 'specialties',
      name: 'Cheesy Gordita Crunch',
      nutrition: { calories: 500, protein: 20, carbohydrates: 41, fat: 28, fiber: 3, sugar: 4, sodium: 960, saturatedFat: 11 },
      serving: { size: '1 item (153g)', sizeGrams: 153 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
  ],
};

// ============================================================
// Wendy's
// ============================================================

const wendysRestaurant: BundledRestaurantData = {
  id: 'wendys',
  name: "Wendy's",
  slug: 'wendys',
  logoAsset: 'wendys',
  categories: [
    { id: 'burgers', name: 'Hamburgers', displayOrder: 1, icon: 'burger' },
    { id: 'chicken', name: 'Chicken', displayOrder: 2, icon: 'chicken' },
    { id: 'salads', name: 'Salads', displayOrder: 3, icon: 'salad' },
    { id: 'sides', name: 'Sides', displayOrder: 4, icon: 'fries' },
    { id: 'breakfast', name: 'Breakfast', displayOrder: 5, icon: 'breakfast' },
    { id: 'frosty', name: 'Frosty', displayOrder: 6, icon: 'dessert' },
  ],
  metadata: {
    lastUpdated: '2025-01-15',
    source: 'bundled',
    isVerified: true,
  },
};

const wendysMenu: BundledMenuData = {
  items: [
    {
      id: 'wendys-daves-single',
      categoryId: 'burgers',
      name: "Dave's Single",
      description: 'Fresh beef, American cheese, crisp lettuce, tomato, pickle, ketchup, mayo, onion on a toasted bun',
      nutrition: { calories: 570, protein: 30, carbohydrates: 39, fat: 33, fiber: 2, sugar: 8, sodium: 1050, saturatedFat: 14 },
      serving: { size: '1 burger (207g)', sizeGrams: 207 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'wendys-daves-double',
      categoryId: 'burgers',
      name: "Dave's Double",
      nutrition: { calories: 810, protein: 48, carbohydrates: 40, fat: 51, fiber: 2, sugar: 8, sodium: 1340, saturatedFat: 23 },
      serving: { size: '1 burger (298g)', sizeGrams: 298 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'wendys-jr-bacon-cheeseburger',
      categoryId: 'burgers',
      name: 'Jr. Bacon Cheeseburger',
      nutrition: { calories: 380, protein: 19, carbohydrates: 25, fat: 23, fiber: 1, sugar: 5, sodium: 710, saturatedFat: 9 },
      serving: { size: '1 burger (130g)', sizeGrams: 130 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'wendys-baconator',
      categoryId: 'burgers',
      name: 'Baconator',
      nutrition: { calories: 950, protein: 57, carbohydrates: 38, fat: 65, fiber: 1, sugar: 8, sodium: 1730, saturatedFat: 28 },
      serving: { size: '1 burger (306g)', sizeGrams: 306 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'wendys-spicy-chicken',
      categoryId: 'chicken',
      name: 'Spicy Chicken Sandwich',
      nutrition: { calories: 500, protein: 30, carbohydrates: 46, fat: 22, fiber: 2, sugar: 5, sodium: 1200, saturatedFat: 4 },
      serving: { size: '1 sandwich (210g)', sizeGrams: 210 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'wendys-nuggets-10',
      categoryId: 'chicken',
      name: 'Chicken Nuggets (10 piece)',
      nutrition: { calories: 450, protein: 22, carbohydrates: 28, fat: 28, fiber: 2, sugar: 0, sodium: 1010, saturatedFat: 5 },
      serving: { size: '10 pieces (135g)', sizeGrams: 135 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'wendys-medium-fries',
      categoryId: 'sides',
      name: 'Medium French Fries',
      nutrition: { calories: 420, protein: 5, carbohydrates: 56, fat: 19, fiber: 5, sugar: 0, sodium: 450, saturatedFat: 3 },
      serving: { size: 'Medium (142g)', sizeGrams: 142 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'wendys-baked-potato',
      categoryId: 'sides',
      name: 'Baked Potato (Plain)',
      nutrition: { calories: 270, protein: 7, carbohydrates: 61, fat: 0, fiber: 6, sugar: 3, sodium: 25, saturatedFat: 0 },
      serving: { size: '1 potato (312g)', sizeGrams: 312 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
    {
      id: 'wendys-frosty-chocolate',
      categoryId: 'frosty',
      name: 'Chocolate Frosty (Medium)',
      nutrition: { calories: 350, protein: 9, carbohydrates: 57, fat: 9, fiber: 0, sugar: 47, sodium: 180, saturatedFat: 6 },
      serving: { size: 'Medium (298g)', sizeGrams: 298 },
      metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true },
    },
  ],
};

// ============================================================
// Additional Restaurants (Tier 1 Priority)
// ============================================================

const paneraRestaurant: BundledRestaurantData = {
  id: 'panera',
  name: 'Panera Bread',
  slug: 'panera-bread',
  logoAsset: 'panera',
  categories: [
    { id: 'soups', name: 'Soups', displayOrder: 1, icon: 'soup' },
    { id: 'sandwiches', name: 'Sandwiches', displayOrder: 2, icon: 'sandwich' },
    { id: 'salads', name: 'Salads', displayOrder: 3, icon: 'salad' },
    { id: 'bakery', name: 'Bakery', displayOrder: 4, icon: 'bakery' },
    { id: 'breakfast', name: 'Breakfast', displayOrder: 5, icon: 'breakfast' },
  ],
  metadata: { lastUpdated: '2025-01-15', source: 'bundled', isVerified: true },
};

const paneraMenu: BundledMenuData = {
  items: [
    { id: 'panera-broccoli-cheddar', categoryId: 'soups', name: 'Broccoli Cheddar Soup (Bowl)', nutrition: { calories: 360, protein: 15, carbohydrates: 29, fat: 21, fiber: 4, sugar: 6, sodium: 1130, saturatedFat: 12 }, serving: { size: 'Bowl (340g)', sizeGrams: 340 }, metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true } },
    { id: 'panera-bread-bowl-mac', categoryId: 'soups', name: 'Bread Bowl Mac & Cheese', nutrition: { calories: 990, protein: 38, carbohydrates: 124, fat: 37, fiber: 5, sugar: 13, sodium: 2010, saturatedFat: 18 }, serving: { size: '1 bread bowl', sizeGrams: 540 }, metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true } },
    { id: 'panera-bacon-turkey-bravo', categoryId: 'sandwiches', name: 'Bacon Turkey Bravo', nutrition: { calories: 620, protein: 38, carbohydrates: 53, fat: 28, fiber: 2, sugar: 9, sodium: 1750, saturatedFat: 9 }, serving: { size: 'Whole sandwich', sizeGrams: 320 }, metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true } },
    { id: 'panera-fuji-apple-salad', categoryId: 'salads', name: 'Fuji Apple Salad with Chicken', nutrition: { calories: 550, protein: 32, carbohydrates: 41, fat: 29, fiber: 5, sugar: 32, sodium: 820, saturatedFat: 9 }, serving: { size: 'Whole salad', sizeGrams: 375 }, metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true } },
  ],
};

const fiveguysRestaurant: BundledRestaurantData = {
  id: 'fiveguys',
  name: 'Five Guys',
  slug: 'five-guys',
  logoAsset: 'fiveguys',
  categories: [
    { id: 'burgers', name: 'Burgers', displayOrder: 1, icon: 'burger' },
    { id: 'dogs', name: 'Hot Dogs', displayOrder: 2, icon: 'hotdog' },
    { id: 'sandwiches', name: 'Sandwiches', displayOrder: 3, icon: 'sandwich' },
    { id: 'fries', name: 'Fries', displayOrder: 4, icon: 'fries' },
  ],
  metadata: { lastUpdated: '2025-01-15', source: 'bundled', isVerified: true },
};

const fiveguysMenu: BundledMenuData = {
  items: [
    { id: 'fiveguys-hamburger', categoryId: 'burgers', name: 'Hamburger', nutrition: { calories: 700, protein: 39, carbohydrates: 39, fat: 43, fiber: 2, sugar: 8, sodium: 430, saturatedFat: 19 }, serving: { size: '1 burger', sizeGrams: 263 }, metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true } },
    { id: 'fiveguys-little-hamburger', categoryId: 'burgers', name: 'Little Hamburger', nutrition: { calories: 540, protein: 26, carbohydrates: 39, fat: 30, fiber: 2, sugar: 8, sodium: 380, saturatedFat: 13 }, serving: { size: '1 burger', sizeGrams: 190 }, metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true } },
    { id: 'fiveguys-cheeseburger', categoryId: 'burgers', name: 'Cheeseburger', nutrition: { calories: 840, protein: 47, carbohydrates: 40, fat: 55, fiber: 2, sugar: 8, sodium: 1050, saturatedFat: 26 }, serving: { size: '1 burger', sizeGrams: 303 }, metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true } },
    { id: 'fiveguys-bacon-burger', categoryId: 'burgers', name: 'Bacon Burger', nutrition: { calories: 780, protein: 43, carbohydrates: 39, fat: 50, fiber: 2, sugar: 8, sodium: 690, saturatedFat: 22 }, serving: { size: '1 burger', sizeGrams: 283 }, metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true } },
    { id: 'fiveguys-regular-fries', categoryId: 'fries', name: 'Regular Fries', nutrition: { calories: 530, protein: 7, carbohydrates: 62, fat: 30, fiber: 6, sugar: 1, sodium: 130, saturatedFat: 6 }, serving: { size: 'Regular (227g)', sizeGrams: 227 }, metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true } },
    { id: 'fiveguys-hotdog', categoryId: 'dogs', name: 'Hot Dog', nutrition: { calories: 545, protein: 18, carbohydrates: 40, fat: 35, fiber: 2, sugar: 6, sodium: 1130, saturatedFat: 15 }, serving: { size: '1 hot dog', sizeGrams: 151 }, metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true } },
  ],
};

const pandaExpressRestaurant: BundledRestaurantData = {
  id: 'pandaexpress',
  name: 'Panda Express',
  slug: 'panda-express',
  logoAsset: 'pandaexpress',
  categories: [
    { id: 'entrees', name: 'Entrees', displayOrder: 1, icon: 'main' },
    { id: 'sides', name: 'Sides', displayOrder: 2, icon: 'side' },
    { id: 'appetizers', name: 'Appetizers', displayOrder: 3, icon: 'appetizer' },
    { id: 'drinks', name: 'Drinks', displayOrder: 4, icon: 'drink' },
  ],
  metadata: { lastUpdated: '2025-01-15', source: 'bundled', isVerified: true },
};

const pandaExpressMenu: BundledMenuData = {
  items: [
    { id: 'panda-orange-chicken', categoryId: 'entrees', name: 'Orange Chicken', nutrition: { calories: 490, protein: 25, carbohydrates: 51, fat: 23, fiber: 0, sugar: 19, sodium: 820, saturatedFat: 5 }, serving: { size: '1 serving (163g)', sizeGrams: 163 }, metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true } },
    { id: 'panda-kung-pao-chicken', categoryId: 'entrees', name: 'Kung Pao Chicken', nutrition: { calories: 290, protein: 17, carbohydrates: 14, fat: 19, fiber: 2, sugar: 5, sodium: 970, saturatedFat: 4 }, serving: { size: '1 serving (163g)', sizeGrams: 163 }, metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true } },
    { id: 'panda-broccoli-beef', categoryId: 'entrees', name: 'Broccoli Beef', nutrition: { calories: 150, protein: 9, carbohydrates: 13, fat: 7, fiber: 2, sugar: 7, sodium: 520, saturatedFat: 2 }, serving: { size: '1 serving (163g)', sizeGrams: 163 }, metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true } },
    { id: 'panda-beijing-beef', categoryId: 'entrees', name: 'Beijing Beef', nutrition: { calories: 470, protein: 14, carbohydrates: 46, fat: 26, fiber: 1, sugar: 25, sodium: 660, saturatedFat: 6 }, serving: { size: '1 serving (163g)', sizeGrams: 163 }, metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true } },
    { id: 'panda-fried-rice', categoryId: 'sides', name: 'Fried Rice', nutrition: { calories: 520, protein: 11, carbohydrates: 85, fat: 16, fiber: 1, sugar: 3, sodium: 850, saturatedFat: 3 }, serving: { size: '1 serving (257g)', sizeGrams: 257 }, metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true } },
    { id: 'panda-chow-mein', categoryId: 'sides', name: 'Chow Mein', nutrition: { calories: 510, protein: 13, carbohydrates: 80, fat: 18, fiber: 6, sugar: 10, sodium: 860, saturatedFat: 3 }, serving: { size: '1 serving (251g)', sizeGrams: 251 }, metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true } },
    { id: 'panda-egg-roll', categoryId: 'appetizers', name: 'Chicken Egg Roll (1)', nutrition: { calories: 200, protein: 8, carbohydrates: 20, fat: 10, fiber: 2, sugar: 3, sodium: 390, saturatedFat: 2 }, serving: { size: '1 roll (78g)', sizeGrams: 78 }, metadata: { source: 'restaurant', lastVerified: '2025-01-15', isVerified: true } },
  ],
};

// ============================================================
// Export All Bundled Restaurants
// ============================================================

export const BUNDLED_RESTAURANTS: BundledRestaurantPackage[] = [
  { restaurant: mcdonaldsRestaurant, menu: mcdonaldsMenu },
  { restaurant: chipotleRestaurant, menu: chipotleMenu },
  { restaurant: starbucksRestaurant, menu: starbucksMenu },
  { restaurant: chickfilaRestaurant, menu: chickfilaMenu },
  { restaurant: subwayRestaurant, menu: subwayMenu },
  { restaurant: tacobellRestaurant, menu: tacobellMenu },
  { restaurant: wendysRestaurant, menu: wendysMenu },
  { restaurant: paneraRestaurant, menu: paneraMenu },
  { restaurant: fiveguysRestaurant, menu: fiveguysMenu },
  { restaurant: pandaExpressRestaurant, menu: pandaExpressMenu },
];

/**
 * Get restaurant IDs for quick lookup
 */
export const BUNDLED_RESTAURANT_IDS = BUNDLED_RESTAURANTS.map(r => r.restaurant.id);

/**
 * Get total item count
 */
export const BUNDLED_ITEM_COUNT = BUNDLED_RESTAURANTS.reduce(
  (sum, r) => sum + r.menu.items.length,
  0
);
