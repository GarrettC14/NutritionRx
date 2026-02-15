/**
 * USDA Micronutrient Integration Tests (Feature 4)
 *
 * Tests the complete USDA FoodData Central integration including:
 * 1. USDA Food Service structure and API patterns
 * 2. Nutrient ID mapping (USDA → app nutrient IDs)
 * 3. API configuration
 * 4. Database migration for usda_fdc_id
 * 5. Food repository USDA-specific methods
 * 6. Micronutrient repository for food nutrient storage
 * 7. Food search store USDA integration
 * 8. FoodSearchResult component USDA badge and nutrient count
 * 9. Food log screen micronutrient preview
 * 10. Type system updates (FoodItem, FoodItemRow)
 * 11. Cross-component consistency
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// 1. USDA Food Service
// ============================================================

describe('USDA Food Service (Feature 4)', () => {
  let serviceSource: string;

  beforeAll(() => {
    serviceSource = fs.readFileSync(
      path.resolve(__dirname, '../../../services/usda/USDAFoodService.ts'),
      'utf-8'
    );
  });

  describe('Service Structure', () => {
    it('should be a singleton class', () => {
      expect(serviceSource).toContain('class USDAFoodServiceClass');
      expect(serviceSource).toContain('export const USDAFoodService = new USDAFoodServiceClass()');
    });

    it('should import API config', () => {
      expect(serviceSource).toContain("from '@/config/api'");
      expect(serviceSource).toContain('usdaConfig');
    });

    it('should import nutrient map', () => {
      expect(serviceSource).toContain("from './nutrientMap'");
      expect(serviceSource).toContain('USDA_NUTRIENT_MAP');
    });

    it('should import types', () => {
      expect(serviceSource).toContain("from './types'");
      expect(serviceSource).toContain('USDASearchResult');
      expect(serviceSource).toContain('USDAFoodDetail');
      expect(serviceSource).toContain('USDANutrient');
    });
  });

  describe('Search Method', () => {
    it('should have searchFoods method', () => {
      expect(serviceSource).toContain('async searchFoods(');
    });

    it('should accept query and options parameters', () => {
      expect(serviceSource).toContain('query: string');
      expect(serviceSource).toContain('options: SearchOptions');
    });

    it('should default data types to Foundation and SR Legacy', () => {
      expect(serviceSource).toContain("dataTypes = ['Foundation', 'SR Legacy']");
    });

    it('should default page size to 10', () => {
      expect(serviceSource).toContain('pageSize = 10');
    });

    it('should use POST method for search', () => {
      expect(serviceSource).toContain("method: 'POST'");
    });

    it('should build cache key from search parameters', () => {
      expect(serviceSource).toContain('cacheKey');
    });

    it('should check search cache before API call', () => {
      expect(serviceSource).toContain('searchCache.get(cacheKey)');
    });

    it('should handle rate limiting (429 status)', () => {
      expect(serviceSource).toContain('response.status === 429');
      expect(serviceSource).toContain('USDAError.RateLimited');
    });

    it('should handle invalid API key (403 status)', () => {
      expect(serviceSource).toContain('response.status === 403');
      expect(serviceSource).toContain('USDAError.InvalidApiKey');
    });

    it('should return cached data on error', () => {
      expect(serviceSource).toContain("cached?.data || []");
    });
  });

  describe('Food Details Method', () => {
    it('should have getFoodDetails method', () => {
      expect(serviceSource).toContain('async getFoodDetails(fdcId: number)');
    });

    it('should return USDAFoodDetail or null', () => {
      expect(serviceSource).toContain('Promise<USDAFoodDetail | null>');
    });

    it('should check details cache', () => {
      expect(serviceSource).toContain('detailsCache.get(fdcId)');
    });

    it('should construct URL with fdcId and API key', () => {
      expect(serviceSource).toContain('`${usdaConfig.baseUrl}/food/${fdcId}?api_key=${usdaConfig.apiKey}`');
    });

    it('should handle 404 (food not found)', () => {
      expect(serviceSource).toContain('response.status === 404');
    });

    it('should cache successful responses', () => {
      expect(serviceSource).toContain('this.detailsCache.set(fdcId');
    });
  });

  describe('Batch Details Method', () => {
    it('should have getFoodDetailsBatch method', () => {
      expect(serviceSource).toContain('async getFoodDetailsBatch(fdcIds: number[])');
    });

    it('should return cached items without fetching', () => {
      expect(serviceSource).toContain('uncachedIds');
    });

    it('should use POST for batch endpoint', () => {
      const batchSection = serviceSource.match(
        /getFoodDetailsBatch[\s\S]*?}\s*\n\s*\/\*\*/
      );
      expect(batchSection).toBeTruthy();
      expect(batchSection![0]).toContain("fdcIds: uncachedIds");
    });
  });

  describe('Nutrient Mapping', () => {
    it('should have mapNutrients method', () => {
      expect(serviceSource).toContain('mapNutrients(usdaNutrients: USDANutrient[])');
    });

    it('should return MicronutrientData', () => {
      expect(serviceSource).toContain('MicronutrientData');
    });

    it('should use USDA_NUTRIENT_MAP for mapping', () => {
      expect(serviceSource).toContain('USDA_NUTRIENT_MAP[nutrientId]');
    });

    it('should skip nutrients with zero or undefined amounts', () => {
      expect(serviceSource).toContain('nutrient.amount > 0');
    });
  });

  describe('Nutrient Count', () => {
    it('should have countAvailableNutrients method', () => {
      expect(serviceSource).toContain('countAvailableNutrients(food: USDASearchResult)');
    });

    it('should count only mapped nutrients with positive values', () => {
      expect(serviceSource).toContain('USDA_NUTRIENT_MAP[nutrient.nutrientId]');
      expect(serviceSource).toContain('nutrient.value > 0');
    });
  });

  describe('Serving Size Scaling', () => {
    it('should have scaleNutrientsToServing method', () => {
      expect(serviceSource).toContain('scaleNutrientsToServing(');
    });

    it('should scale by serving size relative to 100g', () => {
      expect(serviceSource).toContain('servingSizeGrams / 100');
    });
  });

  describe('Rate Limiting', () => {
    it('should have rate limit checking', () => {
      expect(serviceSource).toContain('checkRateLimit()');
    });

    it('should track request count per hour', () => {
      expect(serviceSource).toContain('requestCount');
      expect(serviceSource).toContain('requestWindowStart');
    });

    it('should reset window after 1 hour', () => {
      expect(serviceSource).toContain('60 * 60 * 1000');
    });

    it('should compare against configured rate limit', () => {
      expect(serviceSource).toContain('usdaConfig.rateLimitPerHour');
    });
  });

  describe('Cache Management', () => {
    it('should have clearCache method', () => {
      expect(serviceSource).toContain('clearCache()');
    });

    it('should use separate caches for search and details', () => {
      expect(serviceSource).toContain('searchCache');
      expect(serviceSource).toContain('detailsCache');
    });

    it('should use USDA_CACHE_DURATIONS for TTL', () => {
      expect(serviceSource).toContain('USDA_CACHE_DURATIONS.searchResults');
      expect(serviceSource).toContain('USDA_CACHE_DURATIONS.foodDetails');
    });
  });
});

// ============================================================
// 2. USDA Types
// ============================================================

describe('USDA Types', () => {
  let typesSource: string;

  beforeAll(() => {
    typesSource = fs.readFileSync(
      path.resolve(__dirname, '../../../services/usda/types.ts'),
      'utf-8'
    );
  });

  it('should define USDASearchResult interface', () => {
    expect(typesSource).toContain('interface USDASearchResult');
    expect(typesSource).toContain('fdcId: number');
    expect(typesSource).toContain('description: string');
    expect(typesSource).toContain('dataType: string');
  });

  it('should define USDAFoodDetail interface', () => {
    expect(typesSource).toContain('interface USDAFoodDetail');
    expect(typesSource).toContain('foodNutrients: USDANutrient[]');
  });

  it('should define USDANutrient interface', () => {
    expect(typesSource).toContain('interface USDANutrient');
    expect(typesSource).toContain('nutrient:');
    expect(typesSource).toContain('amount: number');
  });

  it('should define SearchOptions interface', () => {
    expect(typesSource).toContain('interface SearchOptions');
    expect(typesSource).toContain("'Foundation'");
    expect(typesSource).toContain("'SR Legacy'");
    expect(typesSource).toContain("'Branded'");
  });

  it('should define MicronutrientData type', () => {
    expect(typesSource).toContain('interface MicronutrientData');
  });

  it('should define USDAError enum', () => {
    expect(typesSource).toContain('enum USDAError');
    expect(typesSource).toContain('RateLimited');
    expect(typesSource).toContain('InvalidApiKey');
    expect(typesSource).toContain('FoodNotFound');
    expect(typesSource).toContain('NetworkError');
  });

  it('should define USDASearchResponse interface', () => {
    expect(typesSource).toContain('interface USDASearchResponse');
    expect(typesSource).toContain('totalHits: number');
    expect(typesSource).toContain('foods: USDASearchResult[]');
  });

  it('should define USDAFoodPortion interface', () => {
    expect(typesSource).toContain('interface USDAFoodPortion');
    expect(typesSource).toContain('gramWeight: number');
  });
});

// ============================================================
// 3. Nutrient ID Mapping
// ============================================================

describe('USDA Nutrient ID Mapping', () => {
  let mapSource: string;

  beforeAll(() => {
    mapSource = fs.readFileSync(
      path.resolve(__dirname, '../../../services/usda/nutrientMap.ts'),
      'utf-8'
    );
  });

  describe('Vitamin Mappings', () => {
    it('should map all water-soluble vitamins', () => {
      expect(mapSource).toContain("401: 'vitamin_c'");
      expect(mapSource).toContain("404: 'thiamin'");
      expect(mapSource).toContain("405: 'riboflavin'");
      expect(mapSource).toContain("406: 'niacin'");
      expect(mapSource).toContain("410: 'pantothenic_acid'");
      expect(mapSource).toContain("415: 'vitamin_b6'");
      expect(mapSource).toContain("417: 'folate'");
      expect(mapSource).toContain("418: 'vitamin_b12'");
    });

    it('should map all fat-soluble vitamins', () => {
      expect(mapSource).toContain("318: 'vitamin_a'");
      expect(mapSource).toContain("324: 'vitamin_d'");
      expect(mapSource).toContain("323: 'vitamin_e'");
      expect(mapSource).toContain("430: 'vitamin_k'");
    });
  });

  describe('Mineral Mappings', () => {
    it('should map major minerals', () => {
      expect(mapSource).toContain("301: 'calcium'");
      expect(mapSource).toContain("305: 'phosphorus'");
      expect(mapSource).toContain("304: 'magnesium'");
      expect(mapSource).toContain("307: 'sodium'");
      expect(mapSource).toContain("306: 'potassium'");
    });

    it('should map trace minerals', () => {
      expect(mapSource).toContain("303: 'iron'");
      expect(mapSource).toContain("309: 'zinc'");
      expect(mapSource).toContain("312: 'copper'");
      expect(mapSource).toContain("315: 'manganese'");
      expect(mapSource).toContain("317: 'selenium'");
    });
  });

  describe('Fatty Acid Mappings', () => {
    it('should map omega-3 fatty acids', () => {
      expect(mapSource).toContain("675: 'omega_3_ala'");
      expect(mapSource).toContain("629: 'omega_3_epa'");
      expect(mapSource).toContain("621: 'omega_3_dha'");
    });

    it('should map other fats', () => {
      expect(mapSource).toContain("606: 'saturated_fat'");
      expect(mapSource).toContain("645: 'monounsaturated_fat'");
      expect(mapSource).toContain("646: 'polyunsaturated_fat'");
      expect(mapSource).toContain("601: 'cholesterol'");
    });
  });

  describe('Other Nutrient Mappings', () => {
    it('should map other nutrients', () => {
      expect(mapSource).toContain("291: 'fiber'");
      expect(mapSource).toContain("421: 'choline'");
    });
  });

  describe('Reverse Mapping', () => {
    it('should export APP_TO_USDA_MAP', () => {
      expect(mapSource).toContain('export const APP_TO_USDA_MAP');
    });

    it('should derive from USDA_NUTRIENT_MAP', () => {
      expect(mapSource).toContain('Object.entries(USDA_NUTRIENT_MAP)');
    });
  });

  describe('Mapping Integrity', () => {
    it('should export MAPPED_NUTRIENT_COUNT', () => {
      expect(mapSource).toContain('export const MAPPED_NUTRIENT_COUNT');
    });

    it('should use app nutrient IDs matching src/data/nutrients.ts', () => {
      // All mapped IDs should use snake_case (matching the nutrients data file)
      const nutrientIds = mapSource.match(/: '([a-z_0-9]+)'/g);
      expect(nutrientIds).toBeTruthy();
      for (const match of nutrientIds!) {
        const id = match.replace(/: '|'/g, '');
        // All IDs should be snake_case
        expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
      }
    });
  });
});

// ============================================================
// 4. API Configuration
// ============================================================

describe('API Configuration', () => {
  let configSource: string;

  beforeAll(() => {
    configSource = fs.readFileSync(
      path.resolve(__dirname, '../../../config/api.ts'),
      'utf-8'
    );
  });

  it('should export USDA_API_KEY', () => {
    expect(configSource).toContain('export const USDA_API_KEY');
  });

  it('should use EXPO_PUBLIC_USDA_API_KEY env variable', () => {
    expect(configSource).toContain('process.env.EXPO_PUBLIC_USDA_API_KEY');
  });

  it('should fall back to DEMO_KEY', () => {
    expect(configSource).toContain("'DEMO_KEY'");
  });

  it('should export usdaConfig with baseUrl', () => {
    expect(configSource).toContain('export const usdaConfig');
    expect(configSource).toContain('https://api.nal.usda.gov/fdc/v1');
  });

  it('should include rate limit configuration', () => {
    expect(configSource).toContain('rateLimitPerHour');
  });

  it('should have different rate limits for DEMO_KEY vs real key', () => {
    expect(configSource).toContain("USDA_API_KEY === 'DEMO_KEY'");
  });

  it('should export cache duration configuration', () => {
    expect(configSource).toContain('USDA_CACHE_DURATIONS');
    expect(configSource).toContain('searchResults');
    expect(configSource).toContain('foodDetails');
  });
});

// ============================================================
// 5. Database Migration
// ============================================================

describe('Migration 014: USDA FDC ID', () => {
  let migrationSource: string;

  beforeAll(() => {
    migrationSource = fs.readFileSync(
      path.resolve(__dirname, '../../../db/migrations/014_usda_fdc_id.ts'),
      'utf-8'
    );
  });

  it('should export migration014UsdaFdcId function', () => {
    expect(migrationSource).toContain('export async function migration014UsdaFdcId');
  });

  it('should add usda_fdc_id column to food_items', () => {
    expect(migrationSource).toContain('ALTER TABLE food_items ADD COLUMN usda_fdc_id INTEGER');
  });

  it('should add usda_nutrient_count column', () => {
    expect(migrationSource).toContain('ALTER TABLE food_items ADD COLUMN usda_nutrient_count INTEGER');
  });

  it('should create index on usda_fdc_id', () => {
    expect(migrationSource).toContain('CREATE INDEX');
    expect(migrationSource).toContain('idx_food_items_usda_fdc_id');
    expect(migrationSource).toContain('usda_fdc_id');
  });

  it('should create usda_food_cache table', () => {
    expect(migrationSource).toContain('CREATE TABLE IF NOT EXISTS usda_food_cache');
    expect(migrationSource).toContain('fdc_id INTEGER PRIMARY KEY');
    expect(migrationSource).toContain('nutrients_json TEXT NOT NULL');
    expect(migrationSource).toContain('expires_at TEXT NOT NULL');
  });

  it('should record schema version 14', () => {
    expect(migrationSource).toContain("INSERT INTO schema_version (version, applied_at) VALUES (14");
  });
});

describe('Migration Index', () => {
  let indexSource: string;

  beforeAll(() => {
    indexSource = fs.readFileSync(
      path.resolve(__dirname, '../../../db/migrations/index.ts'),
      'utf-8'
    );
  });

  it('should import migration014UsdaFdcId', () => {
    expect(indexSource).toContain("import { migration014UsdaFdcId } from './014_usda_fdc_id'");
  });

  it('should set CURRENT_SCHEMA_VERSION to 24', () => {
    expect(indexSource).toContain('export const CURRENT_SCHEMA_VERSION = 24');
  });

  it('should include migration014 in migrations array', () => {
    expect(indexSource).toContain('migration014UsdaFdcId');
  });

  it('should have 24 migrations in the array', () => {
    const migrationsArray = indexSource.match(
      /export const migrations[\s\S]*?\];/
    );
    expect(migrationsArray).toBeTruthy();
    const migrationEntries = migrationsArray![0].match(/migration\d+/g);
    expect(migrationEntries).toBeTruthy();
    expect(migrationEntries!.length).toBe(24);
  });
});

// ============================================================
// 6. Type System Updates
// ============================================================

describe('FoodItemRow Type (database.ts)', () => {
  let databaseSource: string;

  beforeAll(() => {
    databaseSource = fs.readFileSync(
      path.resolve(__dirname, '../../../types/database.ts'),
      'utf-8'
    );
  });

  it('should have usda_fdc_id field', () => {
    expect(databaseSource).toContain('usda_fdc_id: number | null');
  });

  it('should have usda_nutrient_count field', () => {
    expect(databaseSource).toContain('usda_nutrient_count: number');
  });
});

describe('FoodItem Domain Type (domain.ts)', () => {
  let domainSource: string;

  beforeAll(() => {
    domainSource = fs.readFileSync(
      path.resolve(__dirname, '../../../types/domain.ts'),
      'utf-8'
    );
  });

  it('should have usdaFdcId optional field', () => {
    expect(domainSource).toContain('usdaFdcId?: number');
  });

  it('should have usdaNutrientCount field', () => {
    expect(domainSource).toContain('usdaNutrientCount: number');
  });
});

describe('FoodItem Mapper (mappers.ts)', () => {
  let mapperSource: string;

  beforeAll(() => {
    mapperSource = fs.readFileSync(
      path.resolve(__dirname, '../../../types/mappers.ts'),
      'utf-8'
    );
  });

  it('should map usda_fdc_id to usdaFdcId', () => {
    expect(mapperSource).toContain('usdaFdcId: row.usda_fdc_id');
  });

  it('should map usda_nutrient_count to usdaNutrientCount', () => {
    expect(mapperSource).toContain('usdaNutrientCount: row.usda_nutrient_count');
  });

  it('should convert null usda_fdc_id to undefined', () => {
    expect(mapperSource).toContain('row.usda_fdc_id ?? undefined');
  });

  it('should default usda_nutrient_count to 0', () => {
    expect(mapperSource).toContain('row.usda_nutrient_count ?? 0');
  });
});

// ============================================================
// 7. Food Repository USDA Methods
// ============================================================

describe('Food Repository USDA Methods', () => {
  let repoSource: string;

  beforeAll(() => {
    repoSource = fs.readFileSync(
      path.resolve(__dirname, '../../../repositories/foodRepository.ts'),
      'utf-8'
    );
  });

  it('should have findByFdcId method', () => {
    expect(repoSource).toContain('async findByFdcId(fdcId: number)');
  });

  it('should query by usda_fdc_id', () => {
    expect(repoSource).toContain("WHERE usda_fdc_id = ?");
  });

  it('should have updateUsdaFields method', () => {
    expect(repoSource).toContain('async updateUsdaFields(id: string, fdcId: number, nutrientCount: number)');
  });

  it('should update usda_fdc_id and usda_nutrient_count', () => {
    expect(repoSource).toContain('SET usda_fdc_id = ?, usda_nutrient_count = ?');
  });

  it('should include usdaFdcId in CreateFoodInput', () => {
    expect(repoSource).toContain('usdaFdcId?: number');
    expect(repoSource).toContain('usdaNutrientCount?: number');
  });

  it('should include USDA fields in create INSERT', () => {
    expect(repoSource).toContain('usda_fdc_id, usda_nutrient_count');
    expect(repoSource).toContain('input.usdaFdcId ?? null');
    expect(repoSource).toContain('input.usdaNutrientCount ?? 0');
  });
});

// ============================================================
// 8. Micronutrient Repository
// ============================================================

describe('Micronutrient Repository', () => {
  let repoSource: string;

  beforeAll(() => {
    repoSource = fs.readFileSync(
      path.resolve(__dirname, '../../../repositories/micronutrientRepository.ts'),
      'utf-8'
    );
  });

  describe('Structure', () => {
    it('should export micronutrientRepository', () => {
      expect(repoSource).toContain('export const micronutrientRepository');
    });

    it('should import MicronutrientData type', () => {
      expect(repoSource).toContain('MicronutrientData');
    });

    it('should import getDatabase', () => {
      expect(repoSource).toContain("from '@/db/database'");
    });

    it('should import generateId', () => {
      expect(repoSource).toContain("from '@/utils/generateId'");
    });
  });

  describe('storeFoodNutrients', () => {
    it('should have storeFoodNutrients method', () => {
      expect(repoSource).toContain("async storeFoodNutrients(foodItemId: string, nutrients: MicronutrientData, source: string = 'usda')");
    });

    it('should use INSERT OR REPLACE for upsert', () => {
      expect(repoSource).toContain('INSERT OR REPLACE INTO food_item_nutrients');
    });

    it('should batch insert for performance', () => {
      expect(repoSource).toContain('batchSize');
    });

    it('should return count of stored nutrients', () => {
      expect(repoSource).toContain('return count');
    });
  });

  describe('getFoodNutrients', () => {
    it('should have getFoodNutrients method', () => {
      expect(repoSource).toContain('async getFoodNutrients(foodItemId: string)');
    });

    it('should query food_item_nutrients table', () => {
      expect(repoSource).toContain('SELECT nutrient_id, amount FROM food_item_nutrients WHERE food_item_id = ?');
    });

    it('should return MicronutrientData', () => {
      expect(repoSource).toContain('MicronutrientData');
    });
  });

  describe('hasFoodNutrients', () => {
    it('should have hasFoodNutrients method', () => {
      expect(repoSource).toContain('async hasFoodNutrients(foodItemId: string)');
    });

    it('should return boolean', () => {
      expect(repoSource).toContain('Promise<boolean>');
    });
  });

  describe('getFoodNutrientCount', () => {
    it('should have getFoodNutrientCount method', () => {
      expect(repoSource).toContain('async getFoodNutrientCount(foodItemId: string)');
    });

    it('should return number', () => {
      expect(repoSource).toContain('Promise<number>');
    });
  });

  describe('deleteFoodNutrients', () => {
    it('should have deleteFoodNutrients method', () => {
      expect(repoSource).toContain('async deleteFoodNutrients(foodItemId: string)');
    });

    it('should delete from food_item_nutrients', () => {
      expect(repoSource).toContain('DELETE FROM food_item_nutrients WHERE food_item_id = ?');
    });
  });

  describe('USDA Cache', () => {
    it('should have cacheUSDAFood method', () => {
      expect(repoSource).toContain('async cacheUSDAFood(');
    });

    it('should have getCachedUSDAFood method', () => {
      expect(repoSource).toContain('async getCachedUSDAFood(fdcId: number)');
    });

    it('should use usda_food_cache table', () => {
      expect(repoSource).toContain('usda_food_cache');
    });

    it('should check expiration', () => {
      expect(repoSource).toContain('expires_at');
    });
  });
});

describe('Repository Index', () => {
  let indexSource: string;

  beforeAll(() => {
    indexSource = fs.readFileSync(
      path.resolve(__dirname, '../../../repositories/index.ts'),
      'utf-8'
    );
  });

  it('should export micronutrientRepository', () => {
    expect(indexSource).toContain("export { micronutrientRepository } from './micronutrientRepository'");
  });
});

// ============================================================
// 9. Food Search Store USDA Integration
// ============================================================

describe('Food Search Store USDA Integration', () => {
  let storeSource: string;

  beforeAll(() => {
    storeSource = fs.readFileSync(
      path.resolve(__dirname, '../../../stores/foodSearchStore.ts'),
      'utf-8'
    );
  });

  it('should import USDAFoodService', () => {
    expect(storeSource).toContain("import { USDAFoodService } from '@/services/usda/USDAFoodService'");
  });

  it('should search USDA in addition to local DB', () => {
    expect(storeSource).toContain('USDAFoodService.searchFoods(');
  });

  it('should prioritize Foundation and SR Legacy data types', () => {
    expect(storeSource).toContain("dataTypes: ['Foundation', 'SR Legacy']");
  });

  it('should show local results immediately', () => {
    // Local results should be set before USDA results arrive
    const searchFn = storeSource.match(/search: async[\s\S]*?(?=\n  clearSearch)/);
    expect(searchFn).toBeTruthy();
    const fnBody = searchFn![0];
    const localSetIndex = fnBody.indexOf('set({ results: localResults');
    const usdaSearchIndex = fnBody.indexOf('USDAFoodService.searchFoods');
    expect(localSetIndex).toBeGreaterThan(-1);
    expect(usdaSearchIndex).toBeGreaterThan(-1);
    expect(localSetIndex).toBeLessThan(usdaSearchIndex);
  });

  it('should create FoodItem objects from USDA search results', () => {
    expect(storeSource).toContain("`usda-${r.fdcId}`");
  });

  it('should set source to usda for USDA results', () => {
    expect(storeSource).toContain("source: 'usda'");
  });

  it('should include usdaFdcId in USDA food items', () => {
    expect(storeSource).toContain('usdaFdcId: r.fdcId');
  });

  it('should include nutrient count from USDA', () => {
    expect(storeSource).toContain('USDAFoodService.countAvailableNutrients(r)');
  });

  it('should deduplicate USDA results against local results', () => {
    expect(storeSource).toContain('localNames');
    expect(storeSource).toContain('uniqueUsda');
  });

  it('should handle USDA search failure gracefully', () => {
    // USDA failure should not affect local results
    expect(storeSource).toContain('// USDA search failure is non-critical');
  });

  it('should extract macros from search result nutrients', () => {
    // USDA nutrient IDs: 1008=Energy, 1003=Protein, 1005=Carbs, 1004=Fat
    expect(storeSource).toContain('findNutrient(r.foodNutrients, 1008, 2048, 2047)');
    expect(storeSource).toContain('findNutrient(r.foodNutrients, 1003)');
    expect(storeSource).toContain('findNutrient(r.foodNutrients, 1005)');
    expect(storeSource).toContain('findNutrient(r.foodNutrients, 1004)');
  });
});

// ============================================================
// 10. Add-Food Screen USDA Integration
// ============================================================

describe('Add-Food Screen USDA Integration', () => {
  let screenSource: string;

  beforeAll(() => {
    screenSource = fs.readFileSync(
      path.resolve(__dirname, '../../../app/add-food/index.tsx'),
      'utf-8'
    );
  });

  it('should import USDAFoodService', () => {
    expect(screenSource).toContain("import { USDAFoodService } from '@/services/usda/USDAFoodService'");
  });

  it('should import micronutrientRepository', () => {
    expect(screenSource).toContain("import { micronutrientRepository } from '@/repositories/micronutrientRepository'");
  });

  describe('USDA Food Selection Handler', () => {
    it('should check for unsaved USDA food (usda- prefix)', () => {
      expect(screenSource).toContain("food.id.startsWith('usda-')");
    });

    it('should check if food is already saved locally', () => {
      expect(screenSource).toContain('foodRepository.findByFdcId(food.usdaFdcId)');
    });

    it('should save USDA food to local database before navigating', () => {
      expect(screenSource).toContain('foodRepository.create(');
    });

    it('should fetch and store micronutrients in background', () => {
      expect(screenSource).toContain('USDAFoodService.getFoodDetails(food.usdaFdcId)');
      expect(screenSource).toContain('USDAFoodService.mapNutrients(details.foodNutrients)');
      expect(screenSource).toContain('micronutrientRepository.storeFoodNutrients(saved.id, nutrients)');
    });

    it('should not block navigation on micronutrient fetch', () => {
      // Should use .then() instead of await for background fetch
      expect(screenSource).toContain('.then((details)');
    });

    it('should handle USDA food save failure gracefully', () => {
      expect(screenSource).toContain("console.error('Failed to save USDA food:");
    });
  });
});

// ============================================================
// 11. FoodSearchResult Component USDA Badge
// ============================================================

describe('FoodSearchResult Component USDA Badge', () => {
  let componentSource: string;

  beforeAll(() => {
    componentSource = fs.readFileSync(
      path.resolve(__dirname, '../../../components/food/FoodSearchResult.tsx'),
      'utf-8'
    );
  });

  it('should show nutrient count badge when usdaNutrientCount > 0', () => {
    expect(componentSource).toContain('food.usdaNutrientCount > 0');
    expect(componentSource).toContain('nutrientBadge');
  });

  it('should display nutrient count number', () => {
    expect(componentSource).toContain('{food.usdaNutrientCount}');
  });

  it('should show USDA source badge for USDA foods', () => {
    expect(componentSource).toContain("food.source === 'usda'");
    expect(componentSource).toContain('sourceBadge');
    expect(componentSource).toContain('>USDA<');
  });

  it('should show checkmark icon for verified non-USDA foods only', () => {
    expect(componentSource).toContain("food.isVerified && food.source !== 'usda'");
  });

  it('should have nutrientBadge styles', () => {
    expect(componentSource).toContain('nutrientBadge:');
    expect(componentSource).toContain('nutrientBadgeText:');
  });

  it('should have sourceBadge styles', () => {
    expect(componentSource).toContain('sourceBadge:');
    expect(componentSource).toContain('sourceBadgeText:');
  });

  it('should use accent color for badges', () => {
    expect(componentSource).toContain("colors.accent + '20'");
    expect(componentSource).toContain('color: colors.accent');
  });

  it('should use checkmark icon for nutrient badge', () => {
    expect(componentSource).toContain('name="checkmark"');
  });
});

// ============================================================
// 12. Food Log Screen Micronutrient Preview
// ============================================================

describe('Food Log Screen Micronutrient Preview', () => {
  let logSource: string;

  beforeAll(() => {
    logSource = fs.readFileSync(
      path.resolve(__dirname, '../../../app/add-food/log.tsx'),
      'utf-8'
    );
  });

  describe('Imports', () => {
    it('should import USDAFoodService', () => {
      expect(logSource).toContain("import { USDAFoodService } from '@/services/usda/USDAFoodService'");
    });

    it('should import micronutrientRepository', () => {
      expect(logSource).toContain('micronutrientRepository');
    });

    it('should import NUTRIENT_BY_ID', () => {
      expect(logSource).toContain("import { NUTRIENT_BY_ID } from '@/data/nutrients'");
    });

    it('should import MicronutrientData type', () => {
      expect(logSource).toContain("import { MicronutrientData } from '@/services/usda/types'");
    });
  });

  describe('Micronutrient State', () => {
    it('should have micronutrients state', () => {
      expect(logSource).toContain('useState<MicronutrientData | null>(null)');
    });

    it('should have isLoadingNutrients state', () => {
      expect(logSource).toContain('isLoadingNutrients');
    });
  });

  describe('Micronutrient Loading', () => {
    it('should check local cache first', () => {
      expect(logSource).toContain('micronutrientRepository.getFoodNutrients(item.id)');
    });

    it('should fetch from USDA API if no cached data', () => {
      expect(logSource).toContain('USDAFoodService.getFoodDetails(item.usdaFdcId)');
    });

    it('should map USDA nutrients', () => {
      expect(logSource).toContain('USDAFoodService.mapNutrients(details.foodNutrients)');
    });

    it('should store fetched nutrients for offline access', () => {
      expect(logSource).toContain('micronutrientRepository.storeFoodNutrients(item.id, mapped)');
    });

    it('should update nutrient count after fetching', () => {
      expect(logSource).toContain('foodRepository.updateUsdaFields(item.id, item.usdaFdcId, count)');
    });
  });

  describe('Micronutrient Preview UI', () => {
    it('should show micronutrient card for USDA foods', () => {
      expect(logSource).toContain('micronutrients && Object.keys(micronutrients).length > 0');
      expect(logSource).toContain('micronutrientCard');
    });

    it('should show "Micronutrients" title', () => {
      expect(logSource).toContain('Micronutrients');
      expect(logSource).toContain('micronutrientTitle');
    });

    it('should show nutrient count badge', () => {
      expect(logSource).toContain('nutrientCountBadge');
      expect(logSource).toContain('Object.keys(micronutrients).length');
    });

    it('should show USDA source attribution', () => {
      expect(logSource).toContain('Nutrient data available');
    });

    it('should show top 3 nutrients', () => {
      expect(logSource).toContain('.slice(0, 3)');
    });

    it('should sort nutrients by amount descending', () => {
      expect(logSource).toContain('.sort(');
    });

    it('should display nutrient name and value', () => {
      expect(logSource).toContain('micronutrientName');
      expect(logSource).toContain('micronutrientValue');
    });

    it('should use NUTRIENT_BY_ID for nutrient names and units', () => {
      expect(logSource).toContain('NUTRIENT_BY_ID[nutrientId]');
      expect(logSource).toContain('nutrientDef.name');
      expect(logSource).toContain('nutrientDef.unit');
    });

    it('should show loading state while fetching nutrients', () => {
      expect(logSource).toContain('isLoadingNutrients');
      expect(logSource).toContain('Loading nutrient details...');
    });

    it('should show "not available" message for non-USDA foods', () => {
      expect(logSource).toContain('Micronutrient data not available');
    });
  });

  describe('Micronutrient Styles', () => {
    it('should have micronutrientCard style', () => {
      expect(logSource).toContain('micronutrientCard:');
    });

    it('should have micronutrientRow style', () => {
      expect(logSource).toContain('micronutrientRow:');
    });

    it('should have micronutrientHeader style', () => {
      expect(logSource).toContain('micronutrientHeader:');
    });

    it('should have noMicronutrientCard style', () => {
      expect(logSource).toContain('noMicronutrientCard:');
    });
  });
});

// ============================================================
// 13. Cross-Component Consistency
// ============================================================

describe('Cross-Component USDA Integration Consistency', () => {
  let serviceSource: string;
  let searchStoreSource: string;
  let addFoodSource: string;
  let logSource: string;
  let searchResultSource: string;
  let repoSource: string;

  beforeAll(() => {
    serviceSource = fs.readFileSync(
      path.resolve(__dirname, '../../../services/usda/USDAFoodService.ts'),
      'utf-8'
    );
    searchStoreSource = fs.readFileSync(
      path.resolve(__dirname, '../../../stores/foodSearchStore.ts'),
      'utf-8'
    );
    addFoodSource = fs.readFileSync(
      path.resolve(__dirname, '../../../app/add-food/index.tsx'),
      'utf-8'
    );
    logSource = fs.readFileSync(
      path.resolve(__dirname, '../../../app/add-food/log.tsx'),
      'utf-8'
    );
    searchResultSource = fs.readFileSync(
      path.resolve(__dirname, '../../../components/food/FoodSearchResult.tsx'),
      'utf-8'
    );
    repoSource = fs.readFileSync(
      path.resolve(__dirname, '../../../repositories/foodRepository.ts'),
      'utf-8'
    );
  });

  it('should use consistent USDA food ID prefix across components', () => {
    // Search store creates prefixed IDs
    expect(searchStoreSource).toContain('`usda-${r.fdcId}`');
    // Add-food screen checks for that prefix
    expect(addFoodSource).toContain("food.id.startsWith('usda-')");
  });

  it('should use consistent source type across components', () => {
    expect(searchStoreSource).toContain("source: 'usda'");
    expect(searchResultSource).toContain("food.source === 'usda'");
  });

  it('should use same USDAFoodService import path', () => {
    expect(searchStoreSource).toContain("from '@/services/usda/USDAFoodService'");
    expect(addFoodSource).toContain("from '@/services/usda/USDAFoodService'");
    expect(logSource).toContain("from '@/services/usda/USDAFoodService'");
  });

  it('should use same micronutrientRepository for storage', () => {
    expect(addFoodSource).toContain('micronutrientRepository.storeFoodNutrients');
    expect(logSource).toContain('micronutrientRepository.storeFoodNutrients');
    expect(logSource).toContain('micronutrientRepository.getFoodNutrients');
  });

  it('should use mapNutrients consistently', () => {
    expect(addFoodSource).toContain('USDAFoodService.mapNutrients(details.foodNutrients)');
    expect(logSource).toContain('USDAFoodService.mapNutrients(details.foodNutrients)');
  });

  it('should handle graceful degradation pattern everywhere', () => {
    // Service: returns null/[] on failure
    expect(serviceSource).toContain("cached?.data || []");
    expect(serviceSource).toContain("cached?.data || null");
    // Search store: USDA failure is non-critical
    expect(searchStoreSource).toContain('USDA search failure is non-critical');
    // Add-food: background micronutrient fetch with catch
    expect(addFoodSource).toContain('.catch(() =>');
    // Log screen: try/catch on nutrient loading
    expect(logSource).toContain("console.error('Failed to load micronutrients:");
  });

  it('should use consistent FoodItem usdaFdcId field', () => {
    expect(searchStoreSource).toContain('usdaFdcId: r.fdcId');
    expect(addFoodSource).toContain('food.usdaFdcId');
    expect(logSource).toContain('item.usdaFdcId');
  });

  it('should use consistent usdaNutrientCount field', () => {
    expect(searchStoreSource).toContain('usdaNutrientCount:');
    expect(searchResultSource).toContain('food.usdaNutrientCount');
    expect(addFoodSource).toContain('usdaNutrientCount: food.usdaNutrientCount');
  });

  it('should store USDA data to local DB for offline access', () => {
    // Foods are saved to food_items table
    expect(addFoodSource).toContain('foodRepository.create(');
    // Nutrients saved to food_item_nutrients table
    expect(addFoodSource).toContain('micronutrientRepository.storeFoodNutrients');
    // Log screen also saves nutrients for offline
    expect(logSource).toContain('micronutrientRepository.storeFoodNutrients');
  });
});

// ============================================================
// 14. Nutrient Data Alignment
// ============================================================

describe('Nutrient Data Alignment', () => {
  let nutrientMapSource: string;
  let nutrientDataSource: string;

  beforeAll(() => {
    nutrientMapSource = fs.readFileSync(
      path.resolve(__dirname, '../../../services/usda/nutrientMap.ts'),
      'utf-8'
    );
    nutrientDataSource = fs.readFileSync(
      path.resolve(__dirname, '../../../data/nutrients.ts'),
      'utf-8'
    );
  });

  it('should only map to nutrient IDs that exist in nutrients.ts', () => {
    // Extract all app nutrient IDs from the map
    const mappedIds = nutrientMapSource.match(/: '([a-z_0-9]+)'/g);
    expect(mappedIds).toBeTruthy();

    for (const match of mappedIds!) {
      const id = match.replace(/: '|'/g, '');
      // Each mapped ID should exist in nutrients.ts
      expect(nutrientDataSource).toContain(`id: '${id}'`);
    }
  });

  it('should map key vitamins', () => {
    expect(nutrientMapSource).toContain("'vitamin_a'");
    expect(nutrientMapSource).toContain("'vitamin_c'");
    expect(nutrientMapSource).toContain("'vitamin_d'");
    expect(nutrientMapSource).toContain("'vitamin_e'");
    expect(nutrientMapSource).toContain("'vitamin_k'");
    expect(nutrientMapSource).toContain("'vitamin_b6'");
    expect(nutrientMapSource).toContain("'vitamin_b12'");
    expect(nutrientMapSource).toContain("'folate'");
  });

  it('should map key minerals', () => {
    expect(nutrientMapSource).toContain("'calcium'");
    expect(nutrientMapSource).toContain("'iron'");
    expect(nutrientMapSource).toContain("'magnesium'");
    expect(nutrientMapSource).toContain("'zinc'");
    expect(nutrientMapSource).toContain("'potassium'");
    expect(nutrientMapSource).toContain("'selenium'");
  });

  it('should map omega-3 fatty acids', () => {
    expect(nutrientMapSource).toContain("'omega_3_ala'");
    expect(nutrientMapSource).toContain("'omega_3_epa'");
    expect(nutrientMapSource).toContain("'omega_3_dha'");
  });
});
