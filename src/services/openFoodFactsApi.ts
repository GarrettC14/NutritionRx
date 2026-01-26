import { OPEN_FOOD_FACTS_API } from '@/constants/defaults';
import { foodRepository, CreateFoodInput } from '@/repositories';
import { FoodItem, DataSource } from '@/types/domain';

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

      // Save to local database for offline access
      const food = await foodRepository.create(foodInput);

      return { success: true, food };
    } catch (error) {
      console.error('OpenFoodFacts API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product',
      };
    }
  },

  async searchProducts(query: string, limit: number = 10): Promise<FoodItem[]> {
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

      return [...localResults, ...uniqueApiResults].slice(0, limit);
    } catch (error) {
      console.error('OpenFoodFacts search error:', error);
      return foodRepository.search(query, limit);
    }
  },
};
