import { OPEN_FOOD_FACTS_API } from '@/constants/defaults';
import { foodRepository, CreateFoodInput } from '@/repositories';
import { micronutrientRepository, NutrientInsert } from '@/repositories/micronutrientRepository';
import { FoodItem, DataSource } from '@/types/domain';
import { withTransaction } from '@/db/database';
import { TRACKED_NUTRIENT_IDS } from '@/constants/trackedNutrients';

interface OpenFoodFactsProduct {
  code: string;
  product?: {
    product_name?: string;
    brands?: string;
    serving_size?: string;
    serving_quantity?: number;
    nutriments?: {
      'energy-kcal_100g'?: number;
      'energy-kcal_serving'?: number;
      proteins_100g?: number;
      proteins_serving?: number;
      carbohydrates_100g?: number;
      carbohydrates_serving?: number;
      fat_100g?: number;
      fat_serving?: number;
      fiber_100g?: number;
      fiber_serving?: number;
      sugars_100g?: number;
      sugars_serving?: number;
      sodium_100g?: number;
      sodium_serving?: number;
      [key: string]: number | undefined;
    };
  };
  status: number;
  status_verbose?: string;
}

export interface FetchFoodResult {
  success: boolean;
  food?: FoodItem;
  error?: string;
}

// Parse serving size from string like "100g" or "1 bar (45g)"
function parseServingSize(servingStr?: string): { size: number; unit: string; grams?: number } {
  if (!servingStr) {
    return { size: 100, unit: 'g', grams: 100 };
  }

  // Try to extract grams from parentheses like "1 bar (45g)"
  const gramsMatch = servingStr.match(/\((\d+(?:\.\d+)?)\s*g\)/i);
  const grams = gramsMatch ? parseFloat(gramsMatch[1]) : undefined;

  // Try to extract main serving size
  const sizeMatch = servingStr.match(/^(\d+(?:\.\d+)?)\s*(\w+)?/);
  if (sizeMatch) {
    const size = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[2] || (grams ? 'serving' : 'g');
    return { size, unit, grams: grams || (unit === 'g' ? size : undefined) };
  }

  return { size: 1, unit: 'serving', grams };
}

// Calculate per-serving values from per-100g values
function calculatePerServing(
  per100g: number | undefined,
  servingGrams: number | undefined
): number {
  if (per100g === undefined || servingGrams === undefined) return 0;
  return Math.round((per100g * servingGrams) / 100);
}

// Map Open Food Facts nutriment field keys to tracked nutrient IDs.
// OFF stores values per 100g ({key}_100g) and optionally per serving ({key}_serving).
// factor converts from OFF's native unit to our app's unit.
const OFF_MICRONUTRIENT_MAP: {
  offKey: string;
  nutrientId: string;
  unit: string;
  factor: number;
}[] = [
  // Vitamins
  { offKey: 'vitamin-c', nutrientId: 'vitamin_c', unit: 'mg', factor: 1 },
  { offKey: 'vitamin-a', nutrientId: 'vitamin_a', unit: 'mcg', factor: 1 },
  { offKey: 'vitamin-d', nutrientId: 'vitamin_d', unit: 'mcg', factor: 1 },
  { offKey: 'vitamin-e', nutrientId: 'vitamin_e', unit: 'mg', factor: 1 },
  { offKey: 'vitamin-k', nutrientId: 'vitamin_k', unit: 'mcg', factor: 1 },
  { offKey: 'vitamin-b1', nutrientId: 'thiamin', unit: 'mg', factor: 1 },
  { offKey: 'vitamin-b2', nutrientId: 'riboflavin', unit: 'mg', factor: 1 },
  { offKey: 'vitamin-pp', nutrientId: 'niacin', unit: 'mg', factor: 1 },
  { offKey: 'vitamin-b6', nutrientId: 'vitamin_b6', unit: 'mg', factor: 1 },
  { offKey: 'vitamin-b9', nutrientId: 'folate', unit: 'mcg', factor: 1 },
  { offKey: 'vitamin-b12', nutrientId: 'vitamin_b12', unit: 'mcg', factor: 1 },
  // Minerals
  { offKey: 'calcium', nutrientId: 'calcium', unit: 'mg', factor: 1 },
  { offKey: 'iron', nutrientId: 'iron', unit: 'mg', factor: 1 },
  { offKey: 'magnesium', nutrientId: 'magnesium', unit: 'mg', factor: 1 },
  { offKey: 'zinc', nutrientId: 'zinc', unit: 'mg', factor: 1 },
  { offKey: 'potassium', nutrientId: 'potassium', unit: 'mg', factor: 1 },
  { offKey: 'sodium', nutrientId: 'sodium', unit: 'mg', factor: 1000 }, // OFF stores in g
  { offKey: 'selenium', nutrientId: 'selenium', unit: 'mcg', factor: 1 },
  { offKey: 'phosphorus', nutrientId: 'phosphorus', unit: 'mg', factor: 1 },
  { offKey: 'copper', nutrientId: 'copper', unit: 'mg', factor: 1 },
  // Other
  { offKey: 'fiber', nutrientId: 'fiber', unit: 'g', factor: 1 },
  { offKey: 'choline', nutrientId: 'choline', unit: 'mg', factor: 1 },
  // Fatty acids
  { offKey: 'alpha-linolenic-acid', nutrientId: 'omega_3_ala', unit: 'g', factor: 1 },
  { offKey: 'eicosapentaenoic-acid', nutrientId: 'omega_3_epa', unit: 'g', factor: 1 },
  { offKey: 'docosahexaenoic-acid', nutrientId: 'omega_3_dha', unit: 'g', factor: 1 },
];

// Extract micronutrients from OFF nutriments object.
// Prefers per-serving values, falls back to calculated from per-100g.
// Only returns nutrients that are in TRACKED_NUTRIENT_IDS with amount > 0.
function extractMicronutrientsFromOFF(
  nutriments: Record<string, number | undefined>,
  servingGrams: number
): NutrientInsert[] {
  const results: NutrientInsert[] = [];

  for (const mapping of OFF_MICRONUTRIENT_MAP) {
    if (!TRACKED_NUTRIENT_IDS.has(mapping.nutrientId)) continue;

    const servingValue = nutriments[`${mapping.offKey}_serving`];
    const per100gValue = nutriments[`${mapping.offKey}_100g`];

    let amount: number;
    if (servingValue !== undefined && servingValue > 0) {
      amount = servingValue * mapping.factor;
    } else if (per100gValue !== undefined && per100gValue > 0) {
      amount = (per100gValue * servingGrams / 100) * mapping.factor;
    } else {
      continue;
    }

    if (amount > 0) {
      results.push({
        nutrientId: mapping.nutrientId,
        amount,
        unit: mapping.unit,
      });
    }
  }

  return results;
}

// In-memory cache for searchProducts results
const searchCache = new Map<string, { data: FoodItem[]; timestamp: number }>();
const SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** Clear the in-memory search cache (for tests). */
export function clearSearchCache() {
  searchCache.clear();
}

export const openFoodFactsApi = {
  async fetchByBarcode(barcode: string): Promise<FetchFoodResult> {
    try {
      // First check if we already have this food cached
      const existing = await foodRepository.findByBarcode(barcode);
      if (existing) {
        return { success: true, food: existing };
      }

      // Fetch from Open Food Facts API
      const response = await fetch(`${OPEN_FOOD_FACTS_API}/${barcode}.json`, {
        headers: {
          'User-Agent': 'NutritionRx/1.0 (https://github.com/nutritionrx)',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `API request failed: ${response.status}`,
        };
      }

      const data: OpenFoodFactsProduct = await response.json();

      if (data.status !== 1 || !data.product) {
        return {
          success: false,
          error: 'Product not found in database',
        };
      }

      const product = data.product;
      const nutriments = product.nutriments || {};

      // Parse serving information
      const servingInfo = parseServingSize(product.serving_size);
      const servingGrams = product.serving_quantity || servingInfo.grams || 100;

      // Prefer per-serving values, fall back to calculated from per-100g
      const calories =
        nutriments['energy-kcal_serving'] ||
        calculatePerServing(nutriments['energy-kcal_100g'], servingGrams);
      const protein =
        nutriments.proteins_serving ||
        calculatePerServing(nutriments.proteins_100g, servingGrams);
      const carbs =
        nutriments.carbohydrates_serving ||
        calculatePerServing(nutriments.carbohydrates_100g, servingGrams);
      const fat =
        nutriments.fat_serving ||
        calculatePerServing(nutriments.fat_100g, servingGrams);
      const fiber =
        nutriments.fiber_serving ||
        calculatePerServing(nutriments.fiber_100g, servingGrams);
      const sugar =
        nutriments.sugars_serving ||
        calculatePerServing(nutriments.sugars_100g, servingGrams);
      const sodium =
        nutriments.sodium_serving ||
        calculatePerServing(nutriments.sodium_100g, servingGrams);

      // Create food input
      const foodInput: CreateFoodInput = {
        name: product.product_name || 'Unknown Product',
        brand: product.brands || undefined,
        barcode,
        calories: Math.round(calories),
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
        fiber: fiber > 0 ? Math.round(fiber) : undefined,
        sugar: sugar > 0 ? Math.round(sugar) : undefined,
        sodium: sodium > 0 ? Math.round(sodium * 1000) : undefined, // Convert g to mg
        servingSize: servingInfo.size,
        servingUnit: servingInfo.unit,
        servingSizeGrams: servingGrams,
        source: 'open_food_facts' as DataSource,
        sourceId: barcode,
        isVerified: true,
        isUserCreated: false,
      };

      // Extract micronutrients from OFF data
      const micronutrients = extractMicronutrientsFromOFF(nutriments, servingGrams);

      // Save food + micronutrients atomically
      const food = await withTransaction(async () => {
        const created = await foodRepository.create(foodInput);

        if (micronutrients.length > 0) {
          await micronutrientRepository.storeFoodNutrientsWithMeta(
            created.id,
            micronutrients,
            'open_food_facts'
          );
        }

        return created;
      });

      return { success: true, food };
    } catch (error) {
      if (__DEV__) console.error('OpenFoodFacts API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product',
      };
    }
  },

  async searchProducts(query: string, limit: number = 10): Promise<FoodItem[]> {
    // Check in-memory cache
    const cacheKey = `${query}:${limit}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
      return cached.data;
    }

    try {
      // First search local database
      const localResults = await foodRepository.search(query, limit);
      if (localResults.length >= limit) {
        return localResults;
      }

      // If not enough local results, search API
      const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        query
      )}&search_simple=1&action=process&json=1&page_size=${limit}`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'NutritionRx/1.0 (https://github.com/nutritionrx)',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return localResults;
      }

      const data = await response.json();
      const products = data.products || [];

      // Convert API results to FoodItem format (but don't save them yet)
      const apiResults: FoodItem[] = products
        .filter((p: any) => p.product_name && p.nutriments)
        .map((p: any) => {
          const servingInfo = parseServingSize(p.serving_size);
          const servingGrams = p.serving_quantity || servingInfo.grams || 100;
          const nutriments = p.nutriments || {};

          return {
            id: `off-${p.code}`,
            name: p.product_name,
            brand: p.brands || undefined,
            barcode: p.code,
            calories: Math.round(
              nutriments['energy-kcal_serving'] ||
                calculatePerServing(nutriments['energy-kcal_100g'], servingGrams)
            ),
            protein: Math.round(
              nutriments.proteins_serving ||
                calculatePerServing(nutriments.proteins_100g, servingGrams)
            ),
            carbs: Math.round(
              nutriments.carbohydrates_serving ||
                calculatePerServing(nutriments.carbohydrates_100g, servingGrams)
            ),
            fat: Math.round(
              nutriments.fat_serving ||
                calculatePerServing(nutriments.fat_100g, servingGrams)
            ),
            servingSize: servingInfo.size,
            servingUnit: servingInfo.unit,
            servingSizeGrams: servingGrams,
            source: 'open_food_facts' as DataSource,
            sourceId: p.code,
            isVerified: true,
            isUserCreated: false,
            usageCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });

      // Combine local and API results, avoiding duplicates
      const localBarcodes = new Set(localResults.map((f) => f.barcode));
      const uniqueApiResults = apiResults.filter(
        (f) => !localBarcodes.has(f.barcode)
      );

      const mergedResults = [...localResults, ...uniqueApiResults].slice(0, limit);

      // Cache the merged results
      searchCache.set(cacheKey, { data: mergedResults, timestamp: Date.now() });

      return mergedResults;
    } catch (error) {
      if (__DEV__) console.error('OpenFoodFacts search error:', error);
      return foodRepository.search(query, limit);
    }
  },
};
