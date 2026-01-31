/**
 * Chat Feature Types
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  startedAt: Date;
  context: ChatContext;
}

export interface ChatContext {
  todayLog: DailyLogSummary;
  weeklyAverage: WeeklyAverage;
  goals: UserGoals;
  preferences: DietaryPreferences;
  recentFoods: string[];
}

export interface DailyLogSummary {
  calories: number;
  calorieTarget: number;
  protein: number;
  proteinTarget: number;
  carbs: number;
  carbTarget: number;
  fat: number;
  fatTarget: number;
  water: number;
  waterTarget: number;
}

export interface WeeklyAverage {
  calories: number;
  protein: number;
  daysLogged: number;
}

export interface UserGoals {
  primaryGoal: string;
}

export interface DietaryPreferences {
  restrictions: string[];
}

export interface QuickReply {
  text: string;     // What user sees
  prompt: string;   // What actually gets sent
}

export type SafetyTrigger = 'eating_disorder' | 'medical';

export interface ChatError {
  type: 'network' | 'api' | 'rate_limited' | 'offline';
  message: string;
}
