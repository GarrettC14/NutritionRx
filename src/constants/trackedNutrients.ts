/**
 * Tracked Nutrients
 * The 25 micronutrients the app actively tracks with RDA targets.
 * All other nutrients in ALL_NUTRIENTS are defined for data capture
 * but are not displayed on the micronutrient screen.
 */

export interface TrackedNutrient {
  id: string;
  name: string;
  unit: 'mg' | 'mcg' | 'g';
  category: 'vitamins' | 'minerals' | 'fatty_acids' | 'other';
}

export const TRACKED_NUTRIENTS: TrackedNutrient[] = [
  // Vitamins (11)
  { id: 'vitamin_c', name: 'Vitamin C', unit: 'mg', category: 'vitamins' },
  { id: 'vitamin_a', name: 'Vitamin A', unit: 'mcg', category: 'vitamins' },
  { id: 'vitamin_d', name: 'Vitamin D', unit: 'mcg', category: 'vitamins' },
  { id: 'vitamin_e', name: 'Vitamin E', unit: 'mg', category: 'vitamins' },
  { id: 'vitamin_k', name: 'Vitamin K', unit: 'mcg', category: 'vitamins' },
  { id: 'thiamin', name: 'Thiamin (B1)', unit: 'mg', category: 'vitamins' },
  { id: 'riboflavin', name: 'Riboflavin (B2)', unit: 'mg', category: 'vitamins' },
  { id: 'niacin', name: 'Niacin (B3)', unit: 'mg', category: 'vitamins' },
  { id: 'vitamin_b6', name: 'Vitamin B6', unit: 'mg', category: 'vitamins' },
  { id: 'folate', name: 'Folate (B9)', unit: 'mcg', category: 'vitamins' },
  { id: 'vitamin_b12', name: 'Vitamin B12', unit: 'mcg', category: 'vitamins' },

  // Minerals (9)
  { id: 'calcium', name: 'Calcium', unit: 'mg', category: 'minerals' },
  { id: 'iron', name: 'Iron', unit: 'mg', category: 'minerals' },
  { id: 'magnesium', name: 'Magnesium', unit: 'mg', category: 'minerals' },
  { id: 'zinc', name: 'Zinc', unit: 'mg', category: 'minerals' },
  { id: 'potassium', name: 'Potassium', unit: 'mg', category: 'minerals' },
  { id: 'sodium', name: 'Sodium', unit: 'mg', category: 'minerals' },
  { id: 'selenium', name: 'Selenium', unit: 'mcg', category: 'minerals' },
  { id: 'phosphorus', name: 'Phosphorus', unit: 'mg', category: 'minerals' },
  { id: 'copper', name: 'Copper', unit: 'mg', category: 'minerals' },

  // Other (5)
  { id: 'fiber', name: 'Fiber', unit: 'g', category: 'other' },
  { id: 'choline', name: 'Choline', unit: 'mg', category: 'other' },
  { id: 'omega_3_ala', name: 'Omega-3 (ALA)', unit: 'g', category: 'fatty_acids' },
  { id: 'omega_3_epa', name: 'Omega-3 (EPA)', unit: 'g', category: 'fatty_acids' },
  { id: 'omega_3_dha', name: 'Omega-3 (DHA)', unit: 'g', category: 'fatty_acids' },
];

/** Set of tracked nutrient IDs for O(1) lookup */
export const TRACKED_NUTRIENT_IDS = new Set(TRACKED_NUTRIENTS.map(n => n.id));

/** Map from nutrient ID to TrackedNutrient for O(1) access */
export const TRACKED_NUTRIENT_MAP = new Map(
  TRACKED_NUTRIENTS.map(n => [n.id, n])
);
