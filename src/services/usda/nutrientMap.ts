/**
 * USDA FoodData Central Nutrient ID → App Nutrient ID Mapping
 *
 * Maps USDA nutrient numbers to the nutrient IDs defined in src/data/nutrients.ts
 * Reference: https://fdc.nal.usda.gov/api-guide
 */

export const USDA_NUTRIENT_MAP: Record<number, string> = {
  // Vitamins (water-soluble)
  401: 'vitamin_c',             // mg
  404: 'thiamin',               // mg
  405: 'riboflavin',            // mg
  406: 'niacin',                // mg
  410: 'pantothenic_acid',      // mg
  415: 'vitamin_b6',            // mg
  417: 'folate',                // mcg (DFE)
  418: 'vitamin_b12',           // mcg

  // Vitamins (fat-soluble)
  318: 'vitamin_a',             // IU
  324: 'vitamin_d',             // IU
  323: 'vitamin_e',             // mg (alpha-tocopherol)
  430: 'vitamin_k',             // mcg

  // Major Minerals
  301: 'calcium',               // mg
  305: 'phosphorus',            // mg
  304: 'magnesium',             // mg
  307: 'sodium',                // mg
  306: 'potassium',             // mg

  // Trace Minerals
  303: 'iron',                  // mg
  309: 'zinc',                  // mg
  312: 'copper',                // mg
  315: 'manganese',             // mg
  317: 'selenium',              // mcg

  // Omega Fatty Acids
  675: 'omega_3_ala',           // g (18:3 n-3)
  629: 'omega_3_epa',           // g (20:5 n-3)
  621: 'omega_3_dha',           // g (22:6 n-3)

  // Other Fats
  606: 'saturated_fat',         // g
  645: 'monounsaturated_fat',   // g
  646: 'polyunsaturated_fat',   // g
  601: 'cholesterol',           // mg

  // Other Nutrients
  291: 'fiber',                 // g
  269: 'sugar',                 // g
  262: 'caffeine',              // mg
  421: 'choline',               // mg
};

/**
 * Reverse mapping: App nutrient ID → USDA nutrient number
 */
export const APP_TO_USDA_MAP: Record<string, number> = Object.fromEntries(
  Object.entries(USDA_NUTRIENT_MAP).map(([usdaId, appId]) => [appId, Number(usdaId)])
);

/**
 * Total number of nutrients we can map from USDA data
 */
export const MAPPED_NUTRIENT_COUNT = Object.keys(USDA_NUTRIENT_MAP).length;
