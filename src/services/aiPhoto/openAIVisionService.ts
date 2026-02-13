/**
 * OpenAI Vision Service for Food Recognition
 * Uses GPT-4o-mini to analyze food images and extract nutrition information
 */

import * as ImageManipulator from 'expo-image-manipulator';
import {
  OpenAIVisionRequest,
  OpenAIVisionResponse,
  DetectedFood,
  ProcessedImage,
  AIPhotoAnalysis,
  ParsedFoodResponse,
} from '@/types/ai-photo';
import { TRACKED_NUTRIENT_MAP } from '@/constants/trackedNutrients';
import { NutrientInsert } from '@/repositories/micronutrientRepository';
import { proxyOpenAIChat } from '@/services/backendService';

// Constants
const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 1500;
const IMAGE_MAX_SIZE = 1024;
const IMAGE_QUALITY = 0.8;

// System prompt for food recognition
const SYSTEM_PROMPT = `You are a food nutrition analyst. Analyze the image and identify all food items visible. For each food item:

1. Identify the food name
2. Estimate the portion size based on visual cues
3. Estimate the nutrition values (calories, protein, carbs, fat)
4. Estimate key micronutrient amounts for the given portion

Respond ONLY with valid JSON in this exact format:
{
  "foods": [
    {
      "name": "food name",
      "portion": "portion description (e.g., '1 cup', 'medium size')",
      "calories": number,
      "protein": number (grams),
      "carbs": number (grams),
      "fat": number (grams),
      "confidence": "high" | "medium" | "low",
      "micronutrients": {
        "vitamin_c": number (mg),
        "vitamin_a": number (mcg RAE),
        "vitamin_d": number (mcg),
        "vitamin_e": number (mg),
        "vitamin_k": number (mcg),
        "thiamin": number (mg),
        "riboflavin": number (mg),
        "niacin": number (mg),
        "vitamin_b6": number (mg),
        "folate": number (mcg DFE),
        "vitamin_b12": number (mcg),
        "calcium": number (mg),
        "iron": number (mg),
        "magnesium": number (mg),
        "zinc": number (mg),
        "potassium": number (mg),
        "sodium": number (mg),
        "selenium": number (mcg),
        "phosphorus": number (mg),
        "copper": number (mg),
        "fiber": number (g),
        "choline": number (mg)
      }
    }
  ],
  "notes": "optional notes about the analysis"
}

Important guidelines:
- Be specific about food items (e.g., "grilled chicken breast" not just "chicken")
- Estimate portions conservatively based on typical serving sizes
- If confidence is low, mention it in the notes
- If no food is detected, return {"foods": [], "notes": "No food items detected"}
- Round macro values to whole numbers
- Only include micronutrients you can estimate with reasonable confidence; omit those you cannot
- Use standard reference values (USDA SR) for micronutrient estimates`;

// Generate unique ID
const generateId = (): string => {
  return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Map GPT micronutrient keys to NutrientInsert[], filtering to tracked nutrients only.
function parseMicronutrientsFromGPT(
  micros: Record<string, number> | undefined
): NutrientInsert[] {
  if (!micros) return [];

  const results: NutrientInsert[] = [];
  for (const [key, amount] of Object.entries(micros)) {
    if (typeof amount !== 'number' || amount <= 0) continue;

    const tracked = TRACKED_NUTRIENT_MAP.get(key);
    if (!tracked) continue;

    results.push({
      nutrientId: tracked.id,
      amount,
      unit: tracked.unit,
    });
  }

  return results;
}

// Process image for API
export async function processImageForAPI(
  imageUri: string
): Promise<ProcessedImage> {
  if (__DEV__) console.log(`[LLM:Vision] processImageForAPI() — imageUri=${imageUri.substring(0, 80)}...`);
  const processStart = Date.now();
  try {
    // Resize and compress the image
    if (__DEV__) console.log(`[LLM:Vision] Resizing to ${IMAGE_MAX_SIZE}x${IMAGE_MAX_SIZE}, quality=${IMAGE_QUALITY}`);
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: IMAGE_MAX_SIZE,
            height: IMAGE_MAX_SIZE,
          },
        },
      ],
      {
        compress: IMAGE_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    if (!manipResult.base64) {
      if (__DEV__) console.error('[LLM:Vision] processImageForAPI → no base64 in result');
      throw new Error('Failed to convert image to base64');
    }

    if (__DEV__) console.log(`[LLM:Vision] Image processed in ${Date.now() - processStart}ms — ${manipResult.width}x${manipResult.height}, base64Length=${manipResult.base64.length}`);
    return {
      uri: manipResult.uri,
      base64: manipResult.base64,
      width: manipResult.width,
      height: manipResult.height,
      mimeType: 'image/jpeg',
    };
  } catch (error) {
    if (__DEV__) console.error('[LLM:Vision] processImageForAPI → ERROR:', error);
    throw new Error('Failed to process image');
  }
}

// Parse OpenAI response to DetectedFood array
function parseOpenAIResponse(content: string): ParsedFoodResponse {
  if (__DEV__) {
    console.log(`[LLM:Vision] parseOpenAIResponse() — contentLength=${content.length}`);
    console.log(`[LLM:Vision] Raw API content: "${content.substring(0, 400)}${content.length > 400 ? '...' : ''}"`);
  }
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      if (__DEV__) console.error('[LLM:Vision] No JSON found in response');
      throw new Error('No JSON found in response');
    }

    if (__DEV__) console.log(`[LLM:Vision] Extracted JSON (${jsonMatch[0].length} chars)`);
    const parsed = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (!parsed.foods || !Array.isArray(parsed.foods)) {
      if (__DEV__) console.error(`[LLM:Vision] Invalid response structure — keys: ${Object.keys(parsed).join(', ')}`);
      throw new Error('Invalid response structure');
    }

    if (__DEV__) {
      console.log(`[LLM:Vision] Parsed ${parsed.foods.length} foods: [${parsed.foods.map((f: any) => f.name).join(', ')}]`);
      if (parsed.notes) console.log(`[LLM:Vision] Notes: "${parsed.notes}"`);
    }
    return parsed as ParsedFoodResponse;
  } catch (error) {
    if (__DEV__) {
      console.error('[LLM:Vision] parseOpenAIResponse → ERROR:', error);
      console.error('[LLM:Vision] Failed raw content:', content.substring(0, 300));
    }
    return {
      foods: [],
      notes: 'Failed to parse response',
    };
  }
}

// Convert parsed response to DetectedFood array
function convertToDetectedFoods(parsed: ParsedFoodResponse): DetectedFood[] {
  return parsed.foods.map((food) => ({
    id: generateId(),
    name: food.name,
    confidence:
      food.confidence === 'high'
        ? 0.9
        : food.confidence === 'medium'
        ? 0.7
        : 0.5,
    estimatedPortion: {
      amount: 1,
      unit: 'serving',
      description: food.portion,
    },
    nutrition: {
      calories: Math.round(food.calories || 0),
      protein: Math.round(food.protein || 0),
      carbs: Math.round(food.carbs || 0),
      fat: Math.round(food.fat || 0),
    },
    micronutrients: parseMicronutrientsFromGPT(food.micronutrients),
  }));
}

// Calculate total nutrition from detected foods
function calculateTotalNutrition(
  foods: DetectedFood[]
): DetectedFood['nutrition'] {
  return foods.reduce(
    (total, food) => ({
      calories: total.calories + food.nutrition.calories,
      protein: total.protein + food.nutrition.protein,
      carbs: total.carbs + food.nutrition.carbs,
      fat: total.fat + food.nutrition.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

// Main API call
export async function analyzeImage(
  processedImage: ProcessedImage
): Promise<AIPhotoAnalysis> {
  const analysisId = generateId();
  if (__DEV__) console.log(`[LLM:Vision] analyzeImage() — id=${analysisId}, imageSize=${processedImage.width}x${processedImage.height}, base64Length=${processedImage.base64.length}`);
  const apiStart = Date.now();

  try {
    const messages = [
      {
        role: 'system' as const,
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user' as const,
        content: [
          {
            type: 'text',
            text: 'Analyze this food image and provide nutrition estimates.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${processedImage.mimeType};base64,${processedImage.base64}`,
              detail: 'high',
            },
          },
        ],
      },
    ];

    if (__DEV__) console.log(`[LLM:Vision] Sending request via proxy — model=${MODEL}, maxTokens=${MAX_TOKENS}`);
    const data: OpenAIVisionResponse = await proxyOpenAIChat(messages, {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.3,
      timeoutMs: 30000,
    });

    if (__DEV__) console.log(`[LLM:Vision] Proxy response parsed — choices=${data.choices?.length || 0}, usage=${JSON.stringify(data.usage || {})} (${Date.now() - apiStart}ms)`);

    if (!data.choices || data.choices.length === 0) {
      if (__DEV__) console.error('[LLM:Vision] No choices in response');
      throw new Error('No response from OpenAI');
    }

    const content = data.choices[0].message.content;
    const parsed = parseOpenAIResponse(content);
    const detectedFoods = convertToDetectedFoods(parsed);
    const totalNutrition = calculateTotalNutrition(detectedFoods);

    if (__DEV__) {
      console.log(`[LLM:Vision] analyzeImage COMPLETE in ${Date.now() - apiStart}ms — ${detectedFoods.length} foods detected`);
      detectedFoods.forEach((f, i) => {
        console.log(`[LLM:Vision]   Food ${i + 1}: "${f.name}" — ${f.nutrition.calories}cal, ${f.nutrition.protein}g P, ${f.nutrition.carbs}g C, ${f.nutrition.fat}g F (confidence=${f.confidence})`);
      });
      console.log(`[LLM:Vision]   Total: ${totalNutrition.calories}cal, ${totalNutrition.protein}g P, ${totalNutrition.carbs}g C, ${totalNutrition.fat}g F`);
    }

    return {
      id: analysisId,
      imageUri: processedImage.uri,
      timestamp: new Date(),
      status: detectedFoods.length > 0 ? 'completed' : 'no_food_detected',
      detectedFoods,
      totalEstimatedNutrition: totalNutrition,
      rawResponse: content,
    };
  } catch (error) {
    if (__DEV__) console.error(`[LLM:Vision] analyzeImage ERROR after ${Date.now() - apiStart}ms:`, error);
    return {
      id: analysisId,
      imageUri: processedImage.uri,
      timestamp: new Date(),
      status: 'failed',
      detectedFoods: [],
      totalEstimatedNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      error: error instanceof Error ? error.message : 'Analysis failed',
    };
  }
}

// Combined function for convenience
export async function analyzeFood(
  imageUri: string
): Promise<AIPhotoAnalysis> {
  if (__DEV__) console.log(`[LLM:Vision] analyzeFood() — imageUri=${imageUri.substring(0, 80)}...`);
  const processedImage = await processImageForAPI(imageUri);
  return analyzeImage(processedImage);
}

// Export the service object for consistency with other services
export const openAIVisionService = {
  processImageForAPI,
  analyzeImage,
  analyzeFood,
};
