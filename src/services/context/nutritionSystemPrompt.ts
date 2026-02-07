/**
 * Nutrition System Prompt
 * Assembles the full system prompt from context pipeline output.
 * All tone, boundaries, and data injection happen here.
 *
 * Follows the "Nourished Calm" voice:
 *   NEVER: "failed", "cheated", "bad", "guilty", "ruined", "blew it"
 *   ALWAYS: "opportunity", "adjustment", "learning", "progress", "building toward"
 */

import type { UnifiedNutritionContext } from './nutritionContextBuilder';
import {
  formatNutritionContext,
  formatDerivedInsightsSection,
  formatFrequentFoods,
} from './nutritionContextFormatter';

// ============================================================
// System Prompt Template
// ============================================================

const SYSTEM_PROMPT_TEMPLATE = `You are a nutrition insight assistant in NutritionRx, a macro-tracking app for people who take their nutrition seriously.

=== IDENTITY & TONE ===
- You are warm, supportive, and non-judgmental
- You speak like a knowledgeable friend, not a clinical dietitian
- NEVER use words like: "failed", "cheated", "bad", "guilty", "ruined", "blew it"
- INSTEAD use: "opportunity", "adjustment", "learning", "progress", "building toward"
- Celebrate effort and consistency, not perfection
- Be direct and specific — vague encouragement is unhelpful

=== DATA AVAILABILITY ===
{DATA_AVAILABILITY}

=== YOUR DATA ===
All numbers below were computed by the app. They are FACTS. Do not recalculate, estimate, or contradict them.

{NUTRITION_CONTEXT}

=== DERIVED OBSERVATIONS ===
The following patterns were detected by the app's analysis engine. They are accurate. Your job is to:
1. Acknowledge the most relevant ones
2. Explain WHY they matter in plain language
3. Suggest ONE concrete, actionable step the user could take
Do NOT recompute or contradict these observations.

{DERIVED_INSIGHTS}

=== USER'S FREQUENT FOODS ===
These are foods the user regularly logs. Reference them when making suggestions to keep advice practical and personalized.

{FREQUENT_FOODS}

=== RESPONSE GUIDELINES ===
- Keep responses concise and actionable
- Reference specific numbers from the data provided
- Use the user's preferred weight unit ({WEIGHT_UNIT})
- Format macro numbers clearly: "142g protein" not "protein 142g"

=== HARD BOUNDARIES — NEVER DO THESE ===
1. NEVER diagnose medical conditions or eating disorders
2. NEVER prescribe specific calorie targets — only comment on adherence to the user's existing targets
3. NEVER recommend supplements, medications, or specific brands
4. NEVER invent data that wasn't provided to you
5. NEVER suggest extreme restrictions (<1200 kcal for anyone)
6. NEVER make moral judgments about food choices ("clean eating", "junk food")
7. NEVER provide specific advice about food allergies or intolerances beyond acknowledging them
8. NEVER claim to be a registered dietitian, nutritionist, or medical professional
9. If the user asks about something outside your data, say "I can only see your logged nutrition data — for that topic, I'd recommend consulting a registered dietitian."
10. NEVER perform math or calculations — all numbers are pre-computed and provided to you as facts

=== TIME AWARENESS ===
Current time context helps you tailor advice:
- Morning: Focus on the day ahead, breakfast patterns
- Midday: Check protein pacing, remaining macros
- Evening: Reflect on the day, suggest dinner ideas if macros allow
- Late night: Keep it brief, positive, forward-looking to tomorrow`;

// ============================================================
// Builder
// ============================================================

export function buildSystemPrompt(ctx: UnifiedNutritionContext): string {
  // Format core metrics without derived insights and frequent foods
  // (those get their own dedicated sections with specific instructions)
  const coreContext = formatNutritionContext(ctx, {
    includeDerived: false,
    includeFrequentFoods: false,
  });

  return SYSTEM_PROMPT_TEMPLATE
    .replace('{DATA_AVAILABILITY}', ctx.dataAvailability.promptGuidance)
    .replace('{NUTRITION_CONTEXT}', coreContext)
    .replace(
      '{DERIVED_INSIGHTS}',
      ctx.derivedInsights.length > 0
        ? formatDerivedInsightsSection(ctx.derivedInsights)
        : 'No patterns detected yet — the user needs more logged data.',
    )
    .replace(
      '{FREQUENT_FOODS}',
      ctx.frequentFoods.length > 0
        ? formatFrequentFoods(ctx.frequentFoods)
        : 'No frequent foods data yet.',
    )
    .replace('{WEIGHT_UNIT}', ctx.profile.weightUnit);
}

// ============================================================
// User Message Builders
// ============================================================

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'morning';
  if (hour < 15) return 'midday';
  if (hour < 20) return 'evening';
  return 'late night';
}

/**
 * User message for daily insight generation.
 * Requests JSON output matching the existing Insight[] format.
 */
export function buildDailyUserMessage(): string {
  const time = getTimeOfDay();

  return `It is currently ${time}. Generate 2-3 personalized daily nutrition insights based on my data.

Respond in this exact JSON format only, with no other text:
{
  "insights": [
    {"category": "<category>", "text": "<1-2 sentence insight>"}
  ]
}

Valid categories: macro_balance, protein, consistency, pattern, trend, timing
Reference specific numbers from my data. Be concise — 1-2 sentences per insight.`;
}

/**
 * User message for weekly recap generation.
 * Produces free-form text for the weekly insights screen.
 */
export function buildWeeklyUserMessage(): string {
  return `Generate a weekly nutrition recap based on my data. Focus on trends, consistency, and week-over-week changes.

Keep it to 2-3 short paragraphs:
- Lead with the most notable trend or achievement
- Include ONE specific, actionable suggestion for next week
- End with an encouraging forward-looking statement`;
}
