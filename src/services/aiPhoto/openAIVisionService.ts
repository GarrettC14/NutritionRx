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

// Constants
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 1000;
const IMAGE_MAX_SIZE = 1024;
const IMAGE_QUALITY = 0.8;

// System prompt for food recognition
const SYSTEM_PROMPT = `You are a food nutrition analyst. Analyze the image and identify all food items visible. For each food item:

1. Identify the food name
2. Estimate the portion size based on visual cues
3. Estimate the nutrition values (calories, protein, carbs, fat)

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
      "confidence": "high" | "medium" | "low"
    }
  ],
  "notes": "optional notes about the analysis"
}

Important guidelines:
- Be specific about food items (e.g., "grilled chicken breast" not just "chicken")
- Estimate portions conservatively based on typical serving sizes
- If confidence is low, mention it in the notes
- If no food is detected, return {"foods": [], "notes": "No food items detected"}
- Round all numbers to whole values`;

// Generate unique ID
const generateId = (): string => {
  return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Process image for API
export async function processImageForAPI(
  imageUri: string
): Promise<ProcessedImage> {
  try {
    // Resize and compress the image
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
      throw new Error('Failed to convert image to base64');
    }

    return {
      uri: manipResult.uri,
      base64: manipResult.base64,
      width: manipResult.width,
      height: manipResult.height,
      mimeType: 'image/jpeg',
    };
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error('Failed to process image');
  }
}

// Parse OpenAI response to DetectedFood array
function parseOpenAIResponse(content: string): ParsedFoodResponse {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (!parsed.foods || !Array.isArray(parsed.foods)) {
      throw new Error('Invalid response structure');
    }

    return parsed as ParsedFoodResponse;
  } catch (error) {
    console.error('Failed to parse OpenAI response:', error);
    console.error('Raw content:', content);
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
  apiKey: string,
  processedImage: ProcessedImage
): Promise<AIPhotoAnalysis> {
  const analysisId = generateId();

  try {
    const requestBody: OpenAIVisionRequest = {
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
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
      ],
      max_tokens: MAX_TOKENS,
      temperature: 0.3, // Lower temperature for more consistent results
    };

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: OpenAIVisionResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenAI');
    }

    const content = data.choices[0].message.content;
    const parsed = parseOpenAIResponse(content);
    const detectedFoods = convertToDetectedFoods(parsed);

    return {
      id: analysisId,
      imageUri: processedImage.uri,
      timestamp: new Date(),
      status: detectedFoods.length > 0 ? 'completed' : 'no_food_detected',
      detectedFoods,
      totalEstimatedNutrition: calculateTotalNutrition(detectedFoods),
      rawResponse: content,
    };
  } catch (error) {
    console.error('OpenAI Vision analysis error:', error);
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
  apiKey: string,
  imageUri: string
): Promise<AIPhotoAnalysis> {
  const processedImage = await processImageForAPI(imageUri);
  return analyzeImage(apiKey, processedImage);
}

// Export the service object for consistency with other services
export const openAIVisionService = {
  processImageForAPI,
  analyzeImage,
  analyzeFood,
};
