/**
 * USDA FoodData Central API Service
 *
 * Provides search, detail fetching, and nutrient mapping for USDA foods.
 * Implements caching, rate limiting, and graceful degradation.
 */

import { usdaConfig, USDA_CACHE_DURATIONS } from '@/config/api';
import { USDA_NUTRIENT_MAP, MAPPED_NUTRIENT_COUNT } from './nutrientMap';
import {
  USDASearchResult,
  USDAFoodDetail,
  USDANutrient,
  USDASearchResponse,
  USDAError,
  SearchOptions,
  MicronutrientData,
} from './types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class USDAFoodServiceClass {
  private searchCache: Map<string, CacheEntry<USDASearchResult[]>> = new Map();
  private detailsCache: Map<number, CacheEntry<USDAFoodDetail>> = new Map();
  private requestCount = 0;
  private requestWindowStart = Date.now();

  /**
   * Search USDA FoodData Central for foods matching query
   */
  async searchFoods(
    query: string,
    options: SearchOptions = {}
  ): Promise<USDASearchResult[]> {
    const {
      dataTypes = ['Foundation', 'SR Legacy'],
      pageSize = 10,
      pageNumber = 1,
    } = options;

    // Check cache
    const cacheKey = `${query}:${dataTypes.join(',')}:${pageSize}:${pageNumber}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < USDA_CACHE_DURATIONS.searchResults) {
      return cached.data;
    }

    // Check rate limit
    if (!this.checkRateLimit()) {
      if (__DEV__) console.warn('USDA API rate limit reached');
      return cached?.data || [];
    }

    try {
      const url = `${usdaConfig.baseUrl}/foods/search?api_key=${usdaConfig.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          dataType: dataTypes,
          pageSize,
          pageNumber,
          sortBy: 'dataType.keyword',
          sortOrder: 'asc',
        }),
      });

      if (response.status === 429) {
        throw Object.assign(new Error('Rate limited'), { code: USDAError.RateLimited });
      }
      if (response.status === 403) {
        throw Object.assign(new Error('Invalid API key'), { code: USDAError.InvalidApiKey });
      }
      if (!response.ok) {
        throw Object.assign(new Error(`HTTP ${response.status}`), { code: USDAError.NetworkError });
      }

      const data: USDASearchResponse = await response.json();
      const results = data.foods || [];

      // Cache results
      this.searchCache.set(cacheKey, { data: results, timestamp: Date.now() });

      return results;
    } catch (error) {
      if (__DEV__) console.error('USDA search error:', error);
      return cached?.data || [];
    }
  }

  /**
   * Get full nutrient details for a specific food
   */
  async getFoodDetails(fdcId: number): Promise<USDAFoodDetail | null> {
    // Check cache
    const cached = this.detailsCache.get(fdcId);
    if (cached && Date.now() - cached.timestamp < USDA_CACHE_DURATIONS.foodDetails) {
      return cached.data;
    }

    // Check rate limit
    if (!this.checkRateLimit()) {
      if (__DEV__) console.warn('USDA API rate limit reached');
      return cached?.data || null;
    }

    try {
      const url = `${usdaConfig.baseUrl}/food/${fdcId}?api_key=${usdaConfig.apiKey}`;
      const response = await fetch(url);

      if (response.status === 404) {
        return null;
      }
      if (response.status === 429) {
        throw Object.assign(new Error('Rate limited'), { code: USDAError.RateLimited });
      }
      if (!response.ok) {
        throw Object.assign(new Error(`HTTP ${response.status}`), { code: USDAError.NetworkError });
      }

      const data: USDAFoodDetail = await response.json();

      // Cache result
      this.detailsCache.set(fdcId, { data, timestamp: Date.now() });

      return data;
    } catch (error) {
      if (__DEV__) console.error('USDA food detail error:', error);
      return cached?.data || null;
    }
  }

  /**
   * Get details for multiple foods in batch
   */
  async getFoodDetailsBatch(fdcIds: number[]): Promise<USDAFoodDetail[]> {
    // Return cached items and fetch only uncached ones
    const results: USDAFoodDetail[] = [];
    const uncachedIds: number[] = [];

    for (const fdcId of fdcIds) {
      const cached = this.detailsCache.get(fdcId);
      if (cached && Date.now() - cached.timestamp < USDA_CACHE_DURATIONS.foodDetails) {
        results.push(cached.data);
      } else {
        uncachedIds.push(fdcId);
      }
    }

    if (uncachedIds.length === 0) return results;

    if (!this.checkRateLimit()) {
      return results;
    }

    try {
      const url = `${usdaConfig.baseUrl}/foods?api_key=${usdaConfig.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fdcIds: uncachedIds }),
      });

      if (!response.ok) {
        return results;
      }

      const data: USDAFoodDetail[] = await response.json();

      // Cache each result
      for (const food of data) {
        this.detailsCache.set(food.fdcId, { data: food, timestamp: Date.now() });
        results.push(food);
      }

      return results;
    } catch (error) {
      if (__DEV__) console.error('USDA batch detail error:', error);
      return results;
    }
  }

  /**
   * Map USDA nutrient data to app nutrient IDs
   * Returns nutrients per 100g (USDA standard reference amount)
   */
  mapNutrients(usdaNutrients: USDANutrient[]): MicronutrientData {
    const mapped: MicronutrientData = {};

    for (const nutrient of usdaNutrients) {
      const nutrientId = nutrient.nutrient?.id;
      const appNutrientId = USDA_NUTRIENT_MAP[nutrientId];

      if (appNutrientId && nutrient.amount !== undefined && nutrient.amount > 0) {
        mapped[appNutrientId] = nutrient.amount;
      }
    }

    return mapped;
  }

  /**
   * Count how many nutrients are available for a USDA food
   * (from search result nutrient preview)
   */
  countAvailableNutrients(food: USDASearchResult): number {
    if (!food.foodNutrients) return 0;

    let count = 0;
    for (const nutrient of food.foodNutrients) {
      if (USDA_NUTRIENT_MAP[nutrient.nutrientId] && nutrient.value > 0) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get the maximum possible nutrient count we can map
   */
  getMaxNutrientCount(): number {
    return MAPPED_NUTRIENT_COUNT;
  }

  /**
   * Scale nutrient amounts based on serving size
   * USDA data is per 100g, so scale to actual serving
   */
  scaleNutrientsToServing(
    nutrients: MicronutrientData,
    servingSizeGrams: number
  ): MicronutrientData {
    const scaled: MicronutrientData = {};
    const factor = servingSizeGrams / 100;

    for (const [nutrientId, amount] of Object.entries(nutrients)) {
      scaled[nutrientId] = amount * factor;
    }

    return scaled;
  }

  /**
   * Check rate limit before making a request
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour

    // Reset window if expired
    if (now - this.requestWindowStart >= windowMs) {
      this.requestCount = 0;
      this.requestWindowStart = now;
    }

    if (this.requestCount >= usdaConfig.rateLimitPerHour) {
      return false;
    }

    this.requestCount++;
    return true;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.searchCache.clear();
    this.detailsCache.clear();
  }
}

// Singleton instance
export const USDAFoodService = new USDAFoodServiceClass();
