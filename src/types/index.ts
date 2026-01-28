export * from './database';
export {
  // Re-export from domain excluding duplicate ActivityLevel
  type UserProfile,
  type DailyTotals,
  type DailySummary,
  type FoodItem,
  type LogEntry,
  type QuickAddEntry,
  type WeightEntry,
  type Goal,
  type GoalType,
  type WeeklyReflection,
  type DailyMetabolism,
  type DataQuality,
} from './domain';
export * from './mappers';
export * from './restaurant';
