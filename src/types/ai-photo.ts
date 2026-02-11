/**
 * AI Photo Food Recognition Types
 * Types for OpenAI Vision-based food recognition
 */

// ============================================================
// AI Detection Results
// ============================================================

export interface DetectedFood {
  id: string;
  name: string;
  confidence: number; // 0-1
  estimatedPortion: EstimatedPortion;
  nutrition: EstimatedNutrition;
  micronutrients?: { nutrientId: string; amount: number; unit: string }[];
  matchedFoodId?: string; // If matched to existing food in database
}

export interface EstimatedPortion {
  amount: number;
  unit: string;
  description: string; // e.g., "about 1 cup" or "medium size"
}

export interface EstimatedNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
}

// ============================================================
// AI Photo Analysis Types
// ============================================================

export interface AIPhotoAnalysis {
  id: string;
  imageUri: string;
  timestamp: Date;
  status: AIAnalysisStatus;
  detectedFoods: DetectedFood[];
  totalEstimatedNutrition: EstimatedNutrition;
  rawResponse?: string; // For debugging
  error?: string;
}

export type AIAnalysisStatus =
  | 'pending'
  | 'analyzing'
  | 'completed'
  | 'failed'
  | 'no_food_detected';

// ============================================================
// Quota Types
// ============================================================

export interface AIPhotoQuota {
  dailyUsed: number;
  dailyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
  lastResetDate: string; // YYYY-MM-DD
  lastMonthlyResetDate: string; // YYYY-MM
}

export const AI_PHOTO_LIMITS = {
  DAILY_FREE: 10,
  MONTHLY_FREE: 200,
  DAILY_PREMIUM: 100,
  MONTHLY_PREMIUM: 3000,
} as const;

// ============================================================
// OpenAI API Types
// ============================================================

export interface OpenAIVisionRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens: number;
  temperature?: number;
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenAIContent[];
}

export interface OpenAIContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

export interface OpenAIVisionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================================
// Parsed Food Response
// ============================================================

export interface ParsedFoodResponse {
  foods: {
    name: string;
    portion: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence: 'high' | 'medium' | 'low';
    micronutrients?: Record<string, number>;
  }[];
  notes?: string;
}

// ============================================================
// Image Processing Types
// ============================================================

export interface ProcessedImage {
  uri: string;
  base64: string;
  width: number;
  height: number;
  mimeType: 'image/jpeg' | 'image/png';
}

export interface ImageCaptureOptions {
  source: 'camera' | 'gallery';
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
}

// ============================================================
// UI State Types
// ============================================================

export interface AIPhotoScreenState {
  step: 'capture' | 'preview' | 'analyzing' | 'results' | 'editing';
  capturedImage?: ProcessedImage;
  analysis?: AIPhotoAnalysis;
  selectedFoods: DetectedFood[];
  editingFood?: DetectedFood;
}

// ============================================================
// Action Types for Logging
// ============================================================

export interface LogDetectedFoodInput {
  detectedFood: DetectedFood;
  mealType: string;
  date: string;
  servings?: number;
  customName?: string;
  customNutrition?: Partial<EstimatedNutrition>;
}
