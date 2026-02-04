/**
 * Chat Context Builder
 * Builds system prompts with user nutrition data for personalized responses
 */

import { ChatContext, SafetyTrigger } from '../types/chat';

/**
 * Build the system prompt that provides the AI with user context
 */
export function buildSystemPrompt(context: ChatContext): string {
  const caloriePercent = context.todayLog.calorieTarget > 0
    ? Math.round((context.todayLog.calories / context.todayLog.calorieTarget) * 100)
    : 0;
  console.log(`[LLM:Context] buildSystemPrompt() — cal=${context.todayLog.calories}/${context.todayLog.calorieTarget} (${caloriePercent}%), protein=${context.todayLog.protein}g/${context.todayLog.proteinTarget}g, weeklyAvgCal=${context.weeklyAverage.calories}, goal=${context.goals.primaryGoal}, recentFoods=${context.recentFoods.length}`);

  return `You are a supportive nutrition assistant in the NutritionRx app. Your personality is "Nourished Calm" — warm, encouraging, never judgmental.

## Your Capabilities
- Suggest meals based on remaining macros
- Answer nutrition questions
- Analyze eating patterns from logged data
- Provide recipe ideas that fit goals
- Help with goal coaching

## Your Boundaries
- You are NOT a doctor. For medical questions, recommend consulting a healthcare provider.
- You CANNOT diagnose nutrient deficiencies — only show "nutrient gaps"
- You will NOT give eating disorder advice — if someone seems to struggle, gently suggest professional support
- You will NOT recommend extreme restriction or dangerous diets

## User's Current Data

**Today's Log:**
- Calories: ${context.todayLog.calories} / ${context.todayLog.calorieTarget} (${caloriePercent}%)
- Protein: ${context.todayLog.protein}g / ${context.todayLog.proteinTarget}g
- Carbs: ${context.todayLog.carbs}g / ${context.todayLog.carbTarget}g
- Fat: ${context.todayLog.fat}g / ${context.todayLog.fatTarget}g
- Water: ${context.todayLog.water} / ${context.todayLog.waterTarget} glasses

**This Week's Averages:**
- Average calories: ${context.weeklyAverage.calories}
- Average protein: ${context.weeklyAverage.protein}g
- Days logged: ${context.weeklyAverage.daysLogged}/7

**User's Goals:** ${context.goals.primaryGoal}

**Dietary Preferences:** ${context.preferences.restrictions.join(', ') || 'None specified'}

**Recent Foods:** ${context.recentFoods.slice(0, 5).join(', ') || 'None logged today'}

## Voice Guidelines
- Be warm and supportive
- Focus on positives first
- Use "nutrient gaps" not "deficiencies"
- Use "eating window" not "fasting"
- Never say "failed", "cheated", or "warning"
- Keep responses concise (2-4 sentences for simple questions)
- Use bullet points sparingly (only for lists of 3+ items)

## Response Format
Answer the user's question directly. If you suggest foods or meals, make them specific and actionable. Always tie recommendations back to their actual data when relevant.`;
}

/**
 * Detect safety triggers in user messages
 */
export function detectSafetyTriggers(message: string): SafetyTrigger | null {
  console.log(`[LLM:Context] detectSafetyTriggers() — messageLength=${message.length}`);
  const lowerMessage = message.toLowerCase();

  // Eating disorder indicators
  const edKeywords = ['purge', 'binge', 'restrict', 'hate my body', 'eating disorder'];
  if (edKeywords.some((k) => lowerMessage.includes(k))) {
    return 'eating_disorder';
  }

  // Medical question indicators
  const medicalKeywords = ['diagnose', 'deficiency', 'prescribe', 'medication'];
  if (medicalKeywords.some((k) => lowerMessage.includes(k))) {
    return 'medical';
  }

  return null;
}

/**
 * Safety responses for detected triggers
 */
export const SAFETY_RESPONSES: Record<SafetyTrigger, string> = {
  eating_disorder:
    "I want to make sure you're okay. If you're struggling with your relationship with food, the National Eating Disorders Association helpline is available at 1-800-931-2237. I'm here to support healthy eating, and I care about your wellbeing.",
  medical:
    "I'm not a medical professional, so I can't give medical advice. For health concerns, please consult a doctor or registered dietitian. Is there something else I can help with?",
};

/**
 * Quick reply suggestions
 */
export const QUICK_REPLIES = [
  {
    text: 'What should I eat for dinner?',
    prompt:
      "Based on what I've eaten today, what should I eat for dinner to hit my macro goals?",
  },
  {
    text: 'How am I doing this week?',
    prompt:
      "Give me a summary of my nutrition this week. What's going well and what could improve?",
  },
  {
    text: 'Am I getting enough protein?',
    prompt:
      'Am I eating enough protein? How does my intake compare to my goal?',
  },
  {
    text: "What's a healthy snack?",
    prompt:
      "I need a snack. What's something healthy that fits my remaining macros?",
  },
];

/**
 * Error messages for different failure types
 */
export const ERROR_MESSAGES: Record<string, string> = {
  network: "I couldn't connect. Please check your internet and try again.",
  api: 'Something went wrong on my end. Please try again in a moment.',
  rate_limited: 'I need a short break. Please try again in a minute.',
  offline: 'Chat requires an internet connection. Please connect and try again.',
};
