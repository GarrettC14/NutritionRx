/**
 * Unit tests for openAIVisionService
 *
 * Tests image processing, OpenAI response parsing, food detection conversion,
 * micronutrient mapping, and the combined analyzeFood convenience wrapper.
 */

import { SaveFormat } from 'expo-image-manipulator';
import type { ProcessedImage, OpenAIVisionResponse } from '@/types/ai-photo';

// ── Mocks ──

const mockManipulateAsync = jest.fn();
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: (...args: unknown[]) => mockManipulateAsync(...args),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

const mockProxyOpenAIChat = jest.fn();
jest.mock('@/services/backendService', () => ({
  proxyOpenAIChat: (...args: unknown[]) => mockProxyOpenAIChat(...args),
}));

jest.mock('@/constants/trackedNutrients', () => {
  const map = new Map([
    ['vitamin_c', { id: 'vitamin_c', name: 'Vitamin C', unit: 'mg', category: 'vitamins' }],
    ['iron', { id: 'iron', name: 'Iron', unit: 'mg', category: 'minerals' }],
    ['fiber', { id: 'fiber', name: 'Fiber', unit: 'g', category: 'other' }],
    ['calcium', { id: 'calcium', name: 'Calcium', unit: 'mg', category: 'minerals' }],
  ]);
  return {
    __esModule: true,
    TRACKED_NUTRIENT_MAP: map,
    TRACKED_NUTRIENTS: [...map.values()],
    TRACKED_NUTRIENT_IDS: new Set(map.keys()),
  };
});

// ── Import under test (after mocks) ──

import {
  processImageForAPI,
  analyzeImage,
  analyzeFood,
} from '@/services/aiPhoto/openAIVisionService';

// ── Helpers ──

function makeProcessedImage(overrides?: Partial<ProcessedImage>): ProcessedImage {
  return {
    uri: 'file:///processed.jpg',
    base64: 'aGVsbG8=', // "hello" in base64
    width: 1024,
    height: 1024,
    mimeType: 'image/jpeg',
    ...overrides,
  };
}

function makeOpenAIResponse(content: string): OpenAIVisionResponse {
  return {
    id: 'chatcmpl-test',
    object: 'chat.completion',
    created: 1700000000,
    model: 'gpt-4o-mini',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
  };
}

function makeValidFoodJSON(overrides?: Record<string, unknown>): string {
  return JSON.stringify({
    foods: [
      {
        name: 'Grilled Chicken Breast',
        portion: '6 oz',
        calories: 284,
        protein: 53,
        carbs: 0,
        fat: 6,
        confidence: 'high',
        micronutrients: {
          vitamin_c: 0,
          iron: 1.1,
          calcium: 15,
        },
      },
    ],
    notes: 'Single protein source',
    ...overrides,
  });
}

// ── Setup ──

beforeEach(() => {
  jest.clearAllMocks();
  // Suppress console.log/error from __DEV__ logging in the service
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ============================================================
// processImageForAPI
// ============================================================

describe('processImageForAPI', () => {
  it('returns a ProcessedImage with base64 on success', async () => {
    mockManipulateAsync.mockResolvedValueOnce({
      uri: 'file:///resized.jpg',
      base64: 'cmVzaXplZA==',
      width: 1024,
      height: 768,
    });

    const result = await processImageForAPI('file:///photo.jpg');

    expect(result).toEqual({
      uri: 'file:///resized.jpg',
      base64: 'cmVzaXplZA==',
      width: 1024,
      height: 768,
      mimeType: 'image/jpeg',
    });
  });

  it('calls manipulateAsync with correct resize and compression options', async () => {
    mockManipulateAsync.mockResolvedValueOnce({
      uri: 'file:///resized.jpg',
      base64: 'abc123',
      width: 1024,
      height: 1024,
    });

    await processImageForAPI('file:///photo.jpg');

    expect(mockManipulateAsync).toHaveBeenCalledWith(
      'file:///photo.jpg',
      [{ resize: { width: 1024, height: 1024 } }],
      { compress: 0.8, format: 'jpeg', base64: true },
    );
  });

  it('throws when base64 is missing from manipulator result', async () => {
    mockManipulateAsync.mockResolvedValueOnce({
      uri: 'file:///resized.jpg',
      base64: undefined,
      width: 1024,
      height: 768,
    });

    await expect(processImageForAPI('file:///photo.jpg')).rejects.toThrow(
      'Failed to process image',
    );
  });

  it('throws when manipulateAsync rejects', async () => {
    mockManipulateAsync.mockRejectedValueOnce(new Error('Disk full'));

    await expect(processImageForAPI('file:///photo.jpg')).rejects.toThrow(
      'Failed to process image',
    );
  });
});

// ============================================================
// analyzeImage
// ============================================================

describe('analyzeImage', () => {
  // ── Success paths ──

  it('returns status "completed" with detected foods on valid response', async () => {
    mockProxyOpenAIChat.mockResolvedValueOnce(
      makeOpenAIResponse(makeValidFoodJSON()),
    );

    const result = await analyzeImage(makeProcessedImage());

    expect(result.status).toBe('completed');
    expect(result.detectedFoods).toHaveLength(1);
    expect(result.detectedFoods[0].name).toBe('Grilled Chicken Breast');
    expect(result.totalEstimatedNutrition).toEqual({
      calories: 284,
      protein: 53,
      carbs: 0,
      fat: 6,
    });
    expect(result.rawResponse).toBeDefined();
    expect(result.imageUri).toBe('file:///processed.jpg');
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.id).toMatch(/^ai_/);
  });

  it('returns status "no_food_detected" when foods array is empty', async () => {
    const json = JSON.stringify({ foods: [], notes: 'No food items detected' });
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());

    expect(result.status).toBe('no_food_detected');
    expect(result.detectedFoods).toHaveLength(0);
    expect(result.totalEstimatedNutrition).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });

  it('returns multiple detected foods and sums their nutrition', async () => {
    const json = JSON.stringify({
      foods: [
        {
          name: 'Rice',
          portion: '1 cup',
          calories: 206,
          protein: 4,
          carbs: 45,
          fat: 0,
          confidence: 'high',
        },
        {
          name: 'Chicken Curry',
          portion: '1 serving',
          calories: 350,
          protein: 28,
          carbs: 10,
          fat: 22,
          confidence: 'medium',
        },
      ],
      notes: 'Plate with rice and curry',
    });
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());

    expect(result.status).toBe('completed');
    expect(result.detectedFoods).toHaveLength(2);
    expect(result.totalEstimatedNutrition).toEqual({
      calories: 556,
      protein: 32,
      carbs: 55,
      fat: 22,
    });
  });

  // ── Failure paths ──

  it('returns status "failed" when API returns no choices', async () => {
    mockProxyOpenAIChat.mockResolvedValueOnce({
      id: 'chatcmpl-empty',
      object: 'chat.completion',
      created: 1700000000,
      model: 'gpt-4o-mini',
      choices: [],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    });

    const result = await analyzeImage(makeProcessedImage());

    expect(result.status).toBe('failed');
    expect(result.error).toBe('No response from OpenAI');
    expect(result.detectedFoods).toHaveLength(0);
  });

  it('returns status "failed" when choices is undefined', async () => {
    mockProxyOpenAIChat.mockResolvedValueOnce({
      id: 'chatcmpl-empty',
      object: 'chat.completion',
      created: 1700000000,
      model: 'gpt-4o-mini',
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    });

    const result = await analyzeImage(makeProcessedImage());

    expect(result.status).toBe('failed');
    expect(result.error).toBe('No response from OpenAI');
  });

  it('returns status "failed" with error message when proxyOpenAIChat rejects', async () => {
    mockProxyOpenAIChat.mockRejectedValueOnce(new Error('Network timeout'));

    const result = await analyzeImage(makeProcessedImage());

    expect(result.status).toBe('failed');
    expect(result.error).toBe('Network timeout');
    expect(result.detectedFoods).toHaveLength(0);
    expect(result.totalEstimatedNutrition).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });

  it('returns status "failed" with generic message for non-Error throws', async () => {
    mockProxyOpenAIChat.mockRejectedValueOnce('some string error');

    const result = await analyzeImage(makeProcessedImage());

    expect(result.status).toBe('failed');
    expect(result.error).toBe('Analysis failed');
  });

  it('sends correct request structure to proxyOpenAIChat', async () => {
    mockProxyOpenAIChat.mockResolvedValueOnce(
      makeOpenAIResponse(makeValidFoodJSON()),
    );

    const image = makeProcessedImage({ base64: 'dGVzdA==', mimeType: 'image/jpeg' });
    await analyzeImage(image);

    expect(mockProxyOpenAIChat).toHaveBeenCalledTimes(1);
    const [messages, options] = mockProxyOpenAIChat.mock.calls[0];

    // System message
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('food nutrition analyst');

    // User message with image
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toBeInstanceOf(Array);
    expect(messages[1].content[0].type).toBe('text');
    expect(messages[1].content[1].type).toBe('image_url');
    expect(messages[1].content[1].image_url.url).toBe(
      'data:image/jpeg;base64,dGVzdA==',
    );
    expect(messages[1].content[1].image_url.detail).toBe('high');

    // Options
    expect(options).toEqual({
      model: 'gpt-4o-mini',
      max_tokens: 1500,
      temperature: 0.3,
      timeoutMs: 30000,
    });
  });
});

// ============================================================
// parseOpenAIResponse (tested via analyzeImage)
// ============================================================

describe('parseOpenAIResponse (via analyzeImage)', () => {
  it('extracts JSON from pure JSON response', async () => {
    const json = makeValidFoodJSON();
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());

    expect(result.status).toBe('completed');
    expect(result.detectedFoods[0].name).toBe('Grilled Chicken Breast');
  });

  it('extracts JSON embedded in surrounding text', async () => {
    const content = `Here is my analysis of the food:\n${makeValidFoodJSON()}\nI hope that helps!`;
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(content));

    const result = await analyzeImage(makeProcessedImage());

    expect(result.status).toBe('completed');
    expect(result.detectedFoods[0].name).toBe('Grilled Chicken Breast');
  });

  it('returns no_food_detected when response has no JSON', async () => {
    mockProxyOpenAIChat.mockResolvedValueOnce(
      makeOpenAIResponse('I cannot analyze this image. It appears to be a landscape photo.'),
    );

    const result = await analyzeImage(makeProcessedImage());

    // parseOpenAIResponse returns {foods: [], notes: 'Failed to parse response'}
    // which leads to no_food_detected
    expect(result.status).toBe('no_food_detected');
    expect(result.detectedFoods).toHaveLength(0);
  });

  it('returns no_food_detected when JSON has invalid structure (missing foods array)', async () => {
    const json = JSON.stringify({ items: [{ name: 'Apple' }] });
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());

    expect(result.status).toBe('no_food_detected');
    expect(result.detectedFoods).toHaveLength(0);
  });

  it('returns no_food_detected for malformed JSON', async () => {
    mockProxyOpenAIChat.mockResolvedValueOnce(
      makeOpenAIResponse('{ "foods": [ { "name": "Apple" broken json'),
    );

    const result = await analyzeImage(makeProcessedImage());

    expect(result.status).toBe('no_food_detected');
  });

  it('extracts JSON from markdown code block', async () => {
    const content = '```json\n' + makeValidFoodJSON() + '\n```';
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(content));

    const result = await analyzeImage(makeProcessedImage());

    expect(result.status).toBe('completed');
    expect(result.detectedFoods[0].name).toBe('Grilled Chicken Breast');
  });
});

// ============================================================
// convertToDetectedFoods (tested via analyzeImage)
// ============================================================

describe('convertToDetectedFoods (via analyzeImage)', () => {
  it('maps confidence "high" to 0.9', async () => {
    const json = makeValidFoodJSON();
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());

    expect(result.detectedFoods[0].confidence).toBe(0.9);
  });

  it('maps confidence "medium" to 0.7', async () => {
    const json = JSON.stringify({
      foods: [
        { name: 'Pasta', portion: '1 plate', calories: 400, protein: 12, carbs: 60, fat: 14, confidence: 'medium' },
      ],
    });
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());

    expect(result.detectedFoods[0].confidence).toBe(0.7);
  });

  it('maps confidence "low" to 0.5', async () => {
    const json = JSON.stringify({
      foods: [
        { name: 'Mystery Sauce', portion: '2 tbsp', calories: 50, protein: 1, carbs: 8, fat: 2, confidence: 'low' },
      ],
    });
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());

    expect(result.detectedFoods[0].confidence).toBe(0.5);
  });

  it('rounds nutrition values to whole numbers', async () => {
    const json = JSON.stringify({
      foods: [
        { name: 'Yogurt', portion: '1 cup', calories: 149.7, protein: 8.3, carbs: 11.6, fat: 7.9, confidence: 'high' },
      ],
    });
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());

    expect(result.detectedFoods[0].nutrition).toEqual({
      calories: 150,
      protein: 8,
      carbs: 12,
      fat: 8,
    });
  });

  it('handles null/undefined macro values by defaulting to 0', async () => {
    const json = JSON.stringify({
      foods: [
        { name: 'Water', portion: '1 glass', calories: null, protein: undefined, carbs: 0, fat: null, confidence: 'high' },
      ],
    });
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());

    expect(result.detectedFoods[0].nutrition).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });

  it('sets estimatedPortion correctly', async () => {
    const json = makeValidFoodJSON();
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());

    expect(result.detectedFoods[0].estimatedPortion).toEqual({
      amount: 1,
      unit: 'serving',
      description: '6 oz',
    });
  });

  it('generates unique IDs starting with "ai_"', async () => {
    const json = JSON.stringify({
      foods: [
        { name: 'Apple', portion: '1 medium', calories: 95, protein: 0, carbs: 25, fat: 0, confidence: 'high' },
        { name: 'Banana', portion: '1 medium', calories: 105, protein: 1, carbs: 27, fat: 0, confidence: 'high' },
      ],
    });
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());

    expect(result.detectedFoods[0].id).toMatch(/^ai_/);
    expect(result.detectedFoods[1].id).toMatch(/^ai_/);
    // IDs should be different
    expect(result.detectedFoods[0].id).not.toBe(result.detectedFoods[1].id);
  });
});

// ============================================================
// parseMicronutrientsFromGPT (tested via analyzeImage)
// ============================================================

describe('parseMicronutrientsFromGPT (via analyzeImage)', () => {
  it('maps known nutrient keys to NutrientInsert objects', async () => {
    const json = JSON.stringify({
      foods: [
        {
          name: 'Orange',
          portion: '1 medium',
          calories: 62,
          protein: 1,
          carbs: 15,
          fat: 0,
          confidence: 'high',
          micronutrients: {
            vitamin_c: 70,
            iron: 0.2,
          },
        },
      ],
    });
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());
    const micros = result.detectedFoods[0].micronutrients;

    expect(micros).toEqual(
      expect.arrayContaining([
        { nutrientId: 'vitamin_c', amount: 70, unit: 'mg' },
        { nutrientId: 'iron', amount: 0.2, unit: 'mg' },
      ]),
    );
    expect(micros).toHaveLength(2);
  });

  it('skips unknown nutrient keys not in TRACKED_NUTRIENT_MAP', async () => {
    const json = JSON.stringify({
      foods: [
        {
          name: 'Kale',
          portion: '1 cup',
          calories: 33,
          protein: 3,
          carbs: 6,
          fat: 0,
          confidence: 'high',
          micronutrients: {
            vitamin_c: 80,
            manganese: 0.5, // not in our mock map
            chromium: 0.01, // not in our mock map
          },
        },
      ],
    });
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());
    const micros = result.detectedFoods[0].micronutrients;

    expect(micros).toHaveLength(1);
    expect(micros![0].nutrientId).toBe('vitamin_c');
  });

  it('skips zero amounts', async () => {
    const json = JSON.stringify({
      foods: [
        {
          name: 'Apple',
          portion: '1 medium',
          calories: 95,
          protein: 0,
          carbs: 25,
          fat: 0,
          confidence: 'high',
          micronutrients: {
            vitamin_c: 8,
            iron: 0, // should be skipped (amount <= 0)
            calcium: 11,
          },
        },
      ],
    });
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());
    const micros = result.detectedFoods[0].micronutrients;

    const nutrientIds = micros!.map((m) => m.nutrientId);
    expect(nutrientIds).toContain('vitamin_c');
    expect(nutrientIds).toContain('calcium');
    expect(nutrientIds).not.toContain('iron');
    expect(micros).toHaveLength(2);
  });

  it('skips negative amounts', async () => {
    const json = JSON.stringify({
      foods: [
        {
          name: 'Test Food',
          portion: '1 serving',
          calories: 100,
          protein: 5,
          carbs: 10,
          fat: 3,
          confidence: 'high',
          micronutrients: {
            vitamin_c: -5,
            iron: 2,
          },
        },
      ],
    });
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());
    const micros = result.detectedFoods[0].micronutrients;

    expect(micros).toHaveLength(1);
    expect(micros![0].nutrientId).toBe('iron');
  });

  it('handles undefined micronutrients gracefully', async () => {
    const json = JSON.stringify({
      foods: [
        {
          name: 'Plain Bread',
          portion: '1 slice',
          calories: 79,
          protein: 3,
          carbs: 15,
          fat: 1,
          confidence: 'high',
          // no micronutrients field
        },
      ],
    });
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());
    const micros = result.detectedFoods[0].micronutrients;

    expect(micros).toEqual([]);
  });

  it('preserves the correct unit from TRACKED_NUTRIENT_MAP', async () => {
    const json = JSON.stringify({
      foods: [
        {
          name: 'Oatmeal',
          portion: '1 cup',
          calories: 150,
          protein: 5,
          carbs: 27,
          fat: 3,
          confidence: 'high',
          micronutrients: {
            fiber: 4,
            calcium: 21,
          },
        },
      ],
    });
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());
    const micros = result.detectedFoods[0].micronutrients!;

    const fiberEntry = micros.find((m) => m.nutrientId === 'fiber');
    const calciumEntry = micros.find((m) => m.nutrientId === 'calcium');

    expect(fiberEntry!.unit).toBe('g');
    expect(calciumEntry!.unit).toBe('mg');
  });
});

// ============================================================
// calculateTotalNutrition (tested via analyzeImage)
// ============================================================

describe('calculateTotalNutrition (via analyzeImage)', () => {
  it('sums nutrition from multiple foods', async () => {
    const json = JSON.stringify({
      foods: [
        { name: 'Eggs', portion: '2 large', calories: 140, protein: 12, carbs: 1, fat: 10, confidence: 'high' },
        { name: 'Toast', portion: '2 slices', calories: 160, protein: 6, carbs: 30, fat: 2, confidence: 'high' },
        { name: 'Butter', portion: '1 tbsp', calories: 100, protein: 0, carbs: 0, fat: 11, confidence: 'medium' },
      ],
    });
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());

    expect(result.totalEstimatedNutrition).toEqual({
      calories: 400,
      protein: 18,
      carbs: 31,
      fat: 23,
    });
  });

  it('returns zeroes for a single food with zero macros', async () => {
    const json = JSON.stringify({
      foods: [
        { name: 'Black Coffee', portion: '1 cup', calories: 2, protein: 0, carbs: 0, fat: 0, confidence: 'high' },
      ],
    });
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());

    expect(result.totalEstimatedNutrition).toEqual({
      calories: 2,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });

  it('returns all zeroes for an empty foods array', async () => {
    const json = JSON.stringify({ foods: [] });
    mockProxyOpenAIChat.mockResolvedValueOnce(makeOpenAIResponse(json));

    const result = await analyzeImage(makeProcessedImage());

    expect(result.totalEstimatedNutrition).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });
});

// ============================================================
// analyzeFood (convenience wrapper)
// ============================================================

describe('analyzeFood', () => {
  it('combines processImageForAPI and analyzeImage', async () => {
    mockManipulateAsync.mockResolvedValueOnce({
      uri: 'file:///resized.jpg',
      base64: 'cHJvY2Vzc2Vk',
      width: 1024,
      height: 768,
    });
    mockProxyOpenAIChat.mockResolvedValueOnce(
      makeOpenAIResponse(makeValidFoodJSON()),
    );

    const result = await analyzeFood('file:///original.jpg');

    expect(mockManipulateAsync).toHaveBeenCalledTimes(1);
    expect(mockProxyOpenAIChat).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('completed');
    expect(result.detectedFoods).toHaveLength(1);
    expect(result.imageUri).toBe('file:///resized.jpg');
  });

  it('propagates processImageForAPI errors', async () => {
    mockManipulateAsync.mockRejectedValueOnce(new Error('File not found'));

    await expect(analyzeFood('file:///missing.jpg')).rejects.toThrow(
      'Failed to process image',
    );

    expect(mockProxyOpenAIChat).not.toHaveBeenCalled();
  });

  it('passes processed image base64 to the API', async () => {
    mockManipulateAsync.mockResolvedValueOnce({
      uri: 'file:///resized.jpg',
      base64: 'bXlCYXNlNjQ=',
      width: 512,
      height: 512,
    });
    mockProxyOpenAIChat.mockResolvedValueOnce(
      makeOpenAIResponse(makeValidFoodJSON()),
    );

    await analyzeFood('file:///photo.jpg');

    const [messages] = mockProxyOpenAIChat.mock.calls[0];
    const imageContent = messages[1].content[1];
    expect(imageContent.image_url.url).toBe(
      'data:image/jpeg;base64,bXlCYXNlNjQ=',
    );
  });

  it('returns failed status when analyzeImage API call fails', async () => {
    mockManipulateAsync.mockResolvedValueOnce({
      uri: 'file:///resized.jpg',
      base64: 'abc',
      width: 1024,
      height: 1024,
    });
    mockProxyOpenAIChat.mockRejectedValueOnce(new Error('Server error'));

    const result = await analyzeFood('file:///photo.jpg');

    expect(result.status).toBe('failed');
    expect(result.error).toBe('Server error');
  });
});
