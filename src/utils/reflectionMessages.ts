import { WeightUnit } from '@/repositories';

type GoalType = 'lose' | 'gain' | 'maintain';
type Sentiment = 'positive' | 'neutral' | 'negative' | null;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeightChange(changeKg: number, unit: WeightUnit): string {
  if (unit === 'kg') {
    return `${Math.round(Math.abs(changeKg) * 10) / 10} kg`;
  }
  return `${Math.round(Math.abs(changeKg) * 2.20462 * 10) / 10} lbs`;
}

function formatWeight(kg: number, unit: WeightUnit): string {
  if (unit === 'kg') {
    return `${Math.round(kg * 10) / 10} kg`;
  }
  return `${Math.round(kg * 2.20462)} lbs`;
}

export function getProgressMessage(
  isFirstReflection: boolean,
  weightChangeKg: number | null,
  goalType: GoalType,
  currentWeightKg: number,
  daysSinceLastReflection: number,
  targetWeightKg: number | null,
  estimatedCompletionDate: string | null,
  unitPreference: WeightUnit,
): string {
  // Priority 1: First reflection
  if (isFirstReflection) {
    return "Welcome to your first weekly reflection! Going forward, we'll check in like this each week to keep your plan tuned to you.";
  }

  // Priority 8: Very overdue
  if (daysSinceLastReflection >= 14) {
    const weeks = Math.round(daysSinceLastReflection / 7);
    return `It's been a little while! A lot can happen in ${weeks} weeks, so we've updated your plan to match where you are now.`;
  }

  if (weightChangeKg === null || goalType === 'maintain') {
    return 'Your plan is looking good.';
  }

  const absChange = Math.abs(weightChangeKg);
  const percentChange = (absChange / currentWeightKg) * 100;

  // Priority 6: Lost too fast
  if (goalType === 'lose' && weightChangeKg < 0 && percentChange > 1.0) {
    return "You made a lot of progress this week! To keep things sustainable, we've nudged your calories up slightly.";
  }

  // Priority 7: Gained too fast
  if (goalType === 'gain' && weightChangeKg > 0 && percentChange > 0.5) {
    return "Your weight went up more than expected. We've adjusted your surplus down a bit to keep the gain lean.";
  }

  // Priority 2: Positive loss
  if (goalType === 'lose' && weightChangeKg < 0) {
    let msg = `You've lost about ${formatWeightChange(weightChangeKg, unitPreference)} this week.`;
    if (estimatedCompletionDate && targetWeightKg) {
      msg += ` Aiming for ${formatWeight(targetWeightKg, unitPreference)} around ${formatDate(estimatedCompletionDate)}.`;
    }
    return msg;
  }

  // Priority 3: Positive gain
  if (goalType === 'gain' && weightChangeKg > 0) {
    let msg = `You've gained about ${formatWeightChange(weightChangeKg, unitPreference)} this week — nice work.`;
    if (estimatedCompletionDate && targetWeightKg) {
      msg += ` Aiming for ${formatWeight(targetWeightKg, unitPreference)} around ${formatDate(estimatedCompletionDate)}.`;
    }
    return msg;
  }

  // Priority 4: Stable (within ±0.1 kg)
  if (absChange < 0.1) {
    return "Your weight held steady this week. Plateaus are a normal part of the process — your body may be adjusting.";
  }

  // Priority 5: Wrong direction
  return "Your weight shifted a bit this week — that's completely normal and happens to everyone. Bodies fluctuate day to day. Your plan stays the course.";
}

export type SentimentPattern = 'tough_streak' | 'recovery' | 'positive_streak' | null;

export function checkSentimentPatterns(
  recentSentiments: Array<{ sentiment: Sentiment; reflectedAt: string }>
): SentimentPattern {
  if (recentSentiments.length < 3) return null;

  const last3 = recentSentiments.slice(0, 3);
  const negativeCount = last3.filter(s => s.sentiment === 'negative').length;
  const positiveCount = last3.filter(s => s.sentiment === 'positive').length;

  if (negativeCount === 3) return 'tough_streak';
  if (last3[0].sentiment === 'positive' && negativeCount >= 2) return 'recovery';
  if (positiveCount === 3) return 'positive_streak';

  return null;
}
