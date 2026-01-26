# NutritionRx API Integration Specification

## Overview

This document specifies the external API integrations for NutritionRx. The app uses **free, open APIs** only to maintain zero operational costs.

---

## Data Sources

| Source | Purpose | Cost | Rate Limits |
|--------|---------|------|-------------|
| **Open Food Facts** | Barcode lookup, packaged foods | Free (ODbL) | 100 req/min (product), 10 req/min (search) |
| **USDA FoodData Central** | Generic foods, seed data | Free (Public Domain) | 1,000 req/hour |
| **Local Database** | Cached foods, user-created | N/A | N/A |

---

## 1. Open Food Facts API

### 1.1 API Overview

- **Base URL:** `https://world.openfoodfacts.org/api/v2`
- **Format:** JSON
- **Authentication:** None required
- **License:** Open Database License (ODbL)
- **Attribution Required:** Yes — must credit Open Food Facts

### 1.2 Required Headers

```typescript
const OFF_HEADERS = {
  'User-Agent': 'NutritionRx/1.0.0 (iOS/Android; contact@nutritionrx.app)',
  'Accept': 'application/json',
};
```

**Important:** Open Food Facts requires a custom User-Agent identifying your app. Generic user agents may be blocked.

### 1.3 Rate Limits

| Endpoint Type | Limit | Behavior on Exceed |
|---------------|-------|-------------------|
| Product lookup (`/product/{barcode}`) | 100 req/min | Temporary IP ban (1 hour) |
| Search (`/search`) | 10 req/min | Temporary IP ban (1 hour) |
| Facet queries | 2 req/min | Temporary IP ban |

**Strategy:** 
- Cache ALL product lookups locally
- Debounce search queries (500ms minimum between requests)
- Never use search for "search-as-you-type" — use local cache instead
- If banned, show cached results only

### 1.4 Endpoints

#### Get Product by Barcode

```
GET /api/v2/product/{barcode}
```

**Parameters:**
- `barcode` (path): UPC/EAN barcode
- `fields` (query): Comma-separated list of fields to return (reduces payload)

**Recommended Fields:**
```typescript
const PRODUCT_FIELDS = [
  'code',
  'product_name',
  'brands',
  'serving_size',
  'serving_quantity',
  'nutriments',
  'nutrition_grades',
  'image_url',
  'image_small_url',
].join(',');
```

**Example Request:**
```typescript
const response = await fetch(
  `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=${PRODUCT_FIELDS}`,
  { headers: OFF_HEADERS }
);
```

**Example Response:**
```json
{
  "code": "3017624010701",
  "product": {
    "code": "3017624010701",
    "product_name": "Nutella",
    "brands": "Ferrero",
    "serving_size": "15 g",
    "serving_quantity": 15,
    "nutriments": {
      "energy-kcal_100g": 539,
      "energy-kcal_serving": 81,
      "proteins_100g": 6.3,
      "proteins_serving": 0.95,
      "carbohydrates_100g": 57.5,
      "carbohydrates_serving": 8.6,
      "sugars_100g": 56.3,
      "sugars_serving": 8.4,
      "fat_100g": 30.9,
      "fat_serving": 4.6,
      "saturated-fat_100g": 10.6,
      "saturated-fat_serving": 1.6,
      "fiber_100g": 0,
      "fiber_serving": 0,
      "sodium_100g": 0.041,
      "sodium_serving": 0.006,
      "salt_100g": 0.1,
      "salt_serving": 0.02
    },
    "nutrition_grades": "e",
    "image_url": "https://images.openfoodfacts.org/images/products/301/762/401/0701/front_en.200.jpg"
  },
  "status": 1,
  "status_verbose": "product found"
}
```

**Status Codes:**
- `status: 1` — Product found
- `status: 0` — Product not found

#### Search Products

**⚠️ Use sparingly!** Only 10 requests per minute allowed.

```
GET /api/v2/search
```

**Parameters:**
- `search_terms` (query): Search text
- `fields` (query): Fields to return
- `page_size` (query): Results per page (max 100)
- `page` (query): Page number

**Example:**
```typescript
const response = await fetch(
  `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&fields=${PRODUCT_FIELDS}&page_size=20`,
  { headers: OFF_HEADERS }
);
```

### 1.5 TypeScript Types

```typescript
// types/openFoodFacts.ts

export interface OFFNutriments {
  'energy-kcal_100g'?: number;
  'energy-kcal_serving'?: number;
  proteins_100g?: number;
  proteins_serving?: number;
  carbohydrates_100g?: number;
  carbohydrates_serving?: number;
  sugars_100g?: number;
  sugars_serving?: number;
  fat_100g?: number;
  fat_serving?: number;
  'saturated-fat_100g'?: number;
  'saturated-fat_serving'?: number;
  fiber_100g?: number;
  fiber_serving?: number;
  sodium_100g?: number;
  sodium_serving?: number;
  salt_100g?: number;
  salt_serving?: number;
}

export interface OFFProduct {
  code: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments?: OFFNutriments;
  nutrition_grades?: string;
  image_url?: string;
  image_small_url?: string;
}

export interface OFFProductResponse {
  code: string;
  product?: OFFProduct;
  status: 0 | 1;
  status_verbose: string;
}

export interface OFFSearchResponse {
  count: number;
  page: number;
  page_count: number;
  page_size: number;
  products: OFFProduct[];
}
```

### 1.6 Mapping to Domain Model

```typescript
// services/openFoodFactsService.ts

import { FoodItem } from '../types/domain';
import { OFFProduct } from '../types/openFoodFacts';
import { generateUUID } from '../utils/uuid';

export function mapOFFProductToFoodItem(product: OFFProduct): FoodItem | null {
  // Validate required fields
  if (!product.product_name) return null;
  
  const nutriments = product.nutriments ?? {};
  
  // Determine serving size
  let servingSize = product.serving_quantity ?? 100;
  let servingUnit = 'g';
  
  // Parse serving_size string if available (e.g., "15 g", "1 cup (240ml)")
  if (product.serving_size) {
    const parsed = parseServingSize(product.serving_size);
    if (parsed) {
      servingSize = parsed.size;
      servingUnit = parsed.unit;
    }
  }
  
  // Use per-serving values if available, otherwise calculate from per-100g
  const useServing = nutriments['energy-kcal_serving'] !== undefined;
  const multiplier = useServing ? 1 : servingSize / 100;
  
  return {
    id: generateUUID(),
    name: product.product_name,
    brand: product.brands ?? undefined,
    barcode: product.code,
    
    // Nutrition
    calories: Math.round((useServing ? nutriments['energy-kcal_serving'] : (nutriments['energy-kcal_100g'] ?? 0) * multiplier) ?? 0),
    protein: Math.round(((useServing ? nutriments.proteins_serving : (nutriments.proteins_100g ?? 0) * multiplier) ?? 0) * 10) / 10,
    carbs: Math.round(((useServing ? nutriments.carbohydrates_serving : (nutriments.carbohydrates_100g ?? 0) * multiplier) ?? 0) * 10) / 10,
    fat: Math.round(((useServing ? nutriments.fat_serving : (nutriments.fat_100g ?? 0) * multiplier) ?? 0) * 10) / 10,
    fiber: nutriments.fiber_100g !== undefined 
      ? Math.round((useServing ? (nutriments.fiber_serving ?? 0) : nutriments.fiber_100g * multiplier) * 10) / 10 
      : undefined,
    sugar: nutriments.sugars_100g !== undefined
      ? Math.round((useServing ? (nutriments.sugars_serving ?? 0) : nutriments.sugars_100g * multiplier) * 10) / 10
      : undefined,
    sodium: nutriments.sodium_100g !== undefined
      ? Math.round((useServing ? (nutriments.sodium_serving ?? 0) : nutriments.sodium_100g * multiplier) * 1000) // Convert to mg
      : undefined,
    
    // Serving
    servingSize,
    servingUnit,
    servingSizeGrams: servingSize, // Assuming grams for now
    
    // Metadata
    source: 'open_food_facts',
    sourceId: product.code,
    isVerified: true,
    isUserCreated: false,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function parseServingSize(servingStr: string): { size: number; unit: string } | null {
  // Match patterns like "15 g", "100g", "1 cup", "240 ml"
  const match = servingStr.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
  if (match) {
    return {
      size: parseFloat(match[1]),
      unit: match[2].toLowerCase(),
    };
  }
  return null;
}
```

### 1.7 Caching Strategy

```typescript
// services/foodCacheService.ts

/**
 * Caching strategy for Open Food Facts products:
 * 
 * 1. BARCODE LOOKUP:
 *    - Always check local DB first
 *    - If found locally + fresh (< 30 days), use local
 *    - If found locally + stale, use local but refresh in background
 *    - If not found locally, fetch from API and cache
 * 
 * 2. SEARCH:
 *    - Primary: Search local DB only (instant, no rate limits)
 *    - Secondary: Offer "Search online" button that hits API
 *    - Cache all API results locally
 * 
 * 3. OFFLINE MODE:
 *    - All features work with local cache
 *    - Show indicator when offline
 *    - Queue any "not found" barcodes for later lookup
 */

const CACHE_FRESHNESS_DAYS = 30;

export async function getProductByBarcode(barcode: string): Promise<FoodItem | null> {
  // 1. Check local cache
  const cached = await foodRepository.getByBarcode(barcode);
  
  if (cached) {
    const age = Date.now() - new Date(cached.updatedAt).getTime();
    const isStale = age > CACHE_FRESHNESS_DAYS * 24 * 60 * 60 * 1000;
    
    if (isStale) {
      // Refresh in background, but return cached data immediately
      refreshProductInBackground(barcode);
    }
    
    return cached;
  }
  
  // 2. Not in cache — fetch from API
  const online = await isOnline();
  if (!online) {
    return null; // Will show "Scan again when online" message
  }
  
  try {
    const product = await openFoodFactsApi.getProduct(barcode);
    
    if (product) {
      // Cache the result
      await foodRepository.upsert(product);
      return product;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to fetch from Open Food Facts:', error);
    return null;
  }
}

async function refreshProductInBackground(barcode: string): Promise<void> {
  try {
    const product = await openFoodFactsApi.getProduct(barcode);
    if (product) {
      await foodRepository.upsert(product);
    }
  } catch {
    // Silently fail — we already have cached data
  }
}
```

### 1.8 Error Handling

```typescript
// api/openFoodFactsApi.ts

export class OpenFoodFactsError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'PARSE_ERROR'
  ) {
    super(message);
    this.name = 'OpenFoodFactsError';
  }
}

export async function fetchProduct(barcode: string): Promise<FoodItem | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/product/${barcode}?fields=${PRODUCT_FIELDS}`,
      { 
        headers: OFF_HEADERS,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }
    );
    
    if (response.status === 429) {
      throw new OpenFoodFactsError(
        'Too many requests. Please try again later.',
        'RATE_LIMITED'
      );
    }
    
    if (!response.ok) {
      throw new OpenFoodFactsError(
        `HTTP error: ${response.status}`,
        'NETWORK_ERROR'
      );
    }
    
    const data: OFFProductResponse = await response.json();
    
    if (data.status === 0 || !data.product) {
      return null; // Product not found — not an error
    }
    
    return mapOFFProductToFoodItem(data.product);
    
  } catch (error) {
    if (error instanceof OpenFoodFactsError) {
      throw error;
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new OpenFoodFactsError('No internet connection', 'NETWORK_ERROR');
    }
    
    throw new OpenFoodFactsError('Failed to parse response', 'PARSE_ERROR');
  }
}
```

---

## 2. USDA FoodData Central API

### 2.1 API Overview

- **Base URL:** `https://api.nal.usda.gov/fdc/v1`
- **Format:** JSON
- **Authentication:** API Key required (free)
- **License:** Public Domain (CC0)

### 2.2 Getting an API Key

1. Visit: https://fdc.nal.usda.gov/api-key-signup/
2. Enter email, agree to terms
3. Receive API key instantly via email

**Note:** Store API key in environment variable, NOT in code.

### 2.3 Rate Limits

| Limit | Value |
|-------|-------|
| Requests per hour | 1,000 |
| Requests per day | Unlimited (fair use) |

Much more generous than Open Food Facts, but we'll primarily use this for seed data.

### 2.4 Endpoints

#### Search Foods

```
GET /fdc/v1/foods/search
```

**Parameters:**
- `api_key` (query): Your API key
- `query` (query): Search terms
- `pageSize` (query): Results per page (default 50, max 200)
- `pageNumber` (query): Page number
- `dataType` (query): Filter by data type

**Data Types:**
- `Foundation` — Generic/raw ingredients
- `SR Legacy` — Standard Reference (legacy)
- `Branded` — Branded products
- `Survey (FNDDS)` — What Americans eat

**Example:**
```typescript
const response = await fetch(
  `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${API_KEY}&query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy&pageSize=25`
);
```

#### Get Food by FDC ID

```
GET /fdc/v1/food/{fdcId}
```

### 2.5 TypeScript Types

```typescript
// types/usda.ts

export interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
}

export interface USDAFoodPortion {
  id: number;
  gramWeight: number;
  amount: number;
  measureUnit: {
    name: string;
    abbreviation: string;
  };
  portionDescription: string;
}

export interface USDAFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  dataType: string;
  foodNutrients: USDANutrient[];
  foodPortions?: USDAFoodPortion[];
  servingSize?: number;
  servingSizeUnit?: string;
}

export interface USDASearchResponse {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: USDAFood[];
}
```

### 2.6 Mapping to Domain Model

```typescript
// services/usdaService.ts

// USDA Nutrient IDs
const NUTRIENT_IDS = {
  ENERGY: 1008,      // Energy (kcal)
  PROTEIN: 1003,     // Protein
  FAT: 1004,         // Total lipid (fat)
  CARBS: 1005,       // Carbohydrate, by difference
  FIBER: 1079,       // Fiber, total dietary
  SUGARS: 2000,      // Sugars, total
  SODIUM: 1093,      // Sodium, Na
};

export function mapUSDAFoodToFoodItem(food: USDAFood): FoodItem {
  const getNutrient = (id: number): number | undefined => {
    const nutrient = food.foodNutrients.find(n => n.nutrientId === id);
    return nutrient?.value;
  };
  
  // Default serving is 100g for USDA data
  let servingSize = 100;
  let servingUnit = 'g';
  
  // Use first portion if available
  if (food.foodPortions && food.foodPortions.length > 0) {
    const portion = food.foodPortions[0];
    servingSize = portion.gramWeight;
    servingUnit = portion.measureUnit?.abbreviation ?? 'g';
  }
  
  // Nutrients are per 100g, scale to serving size
  const scale = servingSize / 100;
  
  return {
    id: generateUUID(),
    name: food.description,
    brand: food.brandOwner ?? food.brandName ?? undefined,
    barcode: undefined,
    
    calories: Math.round((getNutrient(NUTRIENT_IDS.ENERGY) ?? 0) * scale),
    protein: Math.round(((getNutrient(NUTRIENT_IDS.PROTEIN) ?? 0) * scale) * 10) / 10,
    carbs: Math.round(((getNutrient(NUTRIENT_IDS.CARBS) ?? 0) * scale) * 10) / 10,
    fat: Math.round(((getNutrient(NUTRIENT_IDS.FAT) ?? 0) * scale) * 10) / 10,
    fiber: getNutrient(NUTRIENT_IDS.FIBER) !== undefined 
      ? Math.round((getNutrient(NUTRIENT_IDS.FIBER)! * scale) * 10) / 10 
      : undefined,
    sugar: getNutrient(NUTRIENT_IDS.SUGARS) !== undefined
      ? Math.round((getNutrient(NUTRIENT_IDS.SUGARS)! * scale) * 10) / 10
      : undefined,
    sodium: getNutrient(NUTRIENT_IDS.SODIUM) !== undefined
      ? Math.round((getNutrient(NUTRIENT_IDS.SODIUM)! * scale))
      : undefined,
    
    servingSize,
    servingUnit,
    servingSizeGrams: servingSize,
    
    source: 'usda',
    sourceId: food.fdcId.toString(),
    isVerified: true,
    isUserCreated: false,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

### 2.7 Seed Data Strategy

Rather than hitting USDA API at runtime, we'll:

1. **Pre-download** 300-500 common foods
2. **Ship with app** as JSON seed file
3. **Insert on first launch** into SQLite

```typescript
// db/seed/commonFoods.ts

export const SEED_FOODS: Partial<FoodItem>[] = [
  // Fruits
  { name: 'Apple, raw', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, servingSize: 182, servingUnit: 'medium', source: 'usda' },
  { name: 'Banana, raw', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, servingSize: 118, servingUnit: 'medium', source: 'usda' },
  // ... 300+ more items
];

export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  const existingCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM food_items WHERE source = ?',
    ['seed']
  );
  
  if (existingCount?.count === 0) {
    console.log('Seeding database with common foods...');
    
    for (const food of SEED_FOODS) {
      await db.runAsync(
        `INSERT INTO food_items (id, name, calories, protein, carbs, fat, serving_size, serving_unit, source, is_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'seed', 1, datetime('now'), datetime('now'))`,
        [generateUUID(), food.name, food.calories, food.protein, food.carbs, food.fat, food.servingSize, food.servingUnit]
      );
    }
    
    console.log(`Seeded ${SEED_FOODS.length} foods.`);
  }
}
```

---

## 3. Unified Search Strategy

```typescript
// services/searchService.ts

/**
 * Search priority:
 * 1. Local database (instant, no rate limits)
 * 2. Open Food Facts (if user explicitly requests "Search online")
 * 
 * We NEVER do search-as-you-type against Open Food Facts.
 * Local search is fast enough and doesn't risk rate limiting.
 */

export interface SearchResult {
  foods: FoodItem[];
  hasMore: boolean;
  source: 'local' | 'api';
}

export async function searchFoods(
  query: string,
  options: { limit?: number; includeOnline?: boolean } = {}
): Promise<SearchResult> {
  const { limit = 50, includeOnline = false } = options;
  
  // Always search local first
  const localResults = await foodRepository.search(query, limit);
  
  // If we have enough local results, return them
  if (localResults.length >= 10 || !includeOnline) {
    return {
      foods: localResults,
      hasMore: localResults.length === limit,
      source: 'local',
    };
  }
  
  // User explicitly requested online search
  if (includeOnline && (await isOnline())) {
    try {
      const apiResults = await openFoodFactsApi.search(query, limit);
      
      // Merge and dedupe
      const merged = mergeAndDedupeResults(localResults, apiResults);
      
      // Cache API results
      for (const food of apiResults) {
        await foodRepository.upsert(food);
      }
      
      return {
        foods: merged.slice(0, limit),
        hasMore: apiResults.length === limit,
        source: 'api',
      };
    } catch (error) {
      // Fall back to local results if API fails
      console.error('Online search failed:', error);
      return {
        foods: localResults,
        hasMore: localResults.length === limit,
        source: 'local',
      };
    }
  }
  
  return {
    foods: localResults,
    hasMore: localResults.length === limit,
    source: 'local',
  };
}

function mergeAndDedupeResults(local: FoodItem[], api: FoodItem[]): FoodItem[] {
  const seen = new Set(local.map(f => f.barcode ?? f.name.toLowerCase()));
  const unique = [...local];
  
  for (const food of api) {
    const key = food.barcode ?? food.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(food);
    }
  }
  
  return unique;
}
```

---

## 4. Attribution Requirements

### Open Food Facts

Must display attribution in the app. Options:

1. **In About/Settings screen:**
   ```
   Food data provided by Open Food Facts
   https://openfoodfacts.org
   Data available under Open Database License
   ```

2. **On food detail screen** (optional):
   ```
   Source: Open Food Facts
   ```

### USDA

Recommended citation (in About screen):

```
U.S. Department of Agriculture, Agricultural Research Service.
FoodData Central, 2019. fdc.nal.usda.gov.
```

---

## 5. Offline Mode

```typescript
// hooks/useNetworkStatus.ts

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    
    return () => unsubscribe();
  }, []);
  
  return isOnline;
}
```

**Offline Behavior:**

| Feature | Offline Support |
|---------|-----------------|
| Search foods | ✅ Local only |
| Barcode scan | ⚠️ Cached only (show message if not found) |
| Log food | ✅ Full support |
| View history | ✅ Full support |
| Goals/tracking | ✅ Full support |
| Weekly reflection | ✅ Full support |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-25 | Initial API specification |
