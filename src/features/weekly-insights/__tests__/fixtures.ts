/**
 * Test Fixtures for Weekly Insights
 * Reusable data sets for testing analyzers, scorers, and prompt builders
 */

import type { WeeklyCollectedData, DayData } from '../types/weeklyInsights.types';

function makeDay(overrides: Partial<DayData>): DayData {
  return {
    date: '2025-01-19',
    dayOfWeek: 0,
    dayName: 'Sunday',
    isLogged: false,
    isComplete: false,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    water: 0,
    mealCount: 0,
    foods: [],
    ...overrides,
  };
}

function makeWeekData(overrides: Partial<WeeklyCollectedData>): WeeklyCollectedData {
  return {
    weekStartDate: '2025-01-19',
    weekEndDate: '2025-01-25',
    days: [],
    loggedDayCount: 0,
    completeDayCount: 0,
    avgCalories: 0,
    avgProtein: 0,
    avgCarbs: 0,
    avgFat: 0,
    avgFiber: 0,
    avgWater: 0,
    avgMealCount: 0,
    totalMeals: 0,
    calorieTarget: 2000,
    proteinTarget: 150,
    waterTarget: 2500,
    priorWeek: null,
    twoWeeksAgo: null,
    deficiencyAlerts: [] as never[],
    dataConfidence: 0,
    loggingStreak: 0,
    ...overrides,
  };
}

/** 7 days, all logged, all on-target, good water, 3 meals/day */
export const PERFECT_WEEK: WeeklyCollectedData = makeWeekData({
  days: [
    makeDay({ date: '2025-01-19', dayOfWeek: 0, dayName: 'Sunday', isLogged: true, isComplete: true, calories: 2000, protein: 150, carbs: 250, fat: 65, water: 2500, mealCount: 3, foods: ['Chicken', 'Rice', 'Broccoli'] }),
    makeDay({ date: '2025-01-20', dayOfWeek: 1, dayName: 'Monday', isLogged: true, isComplete: true, calories: 1950, protein: 145, carbs: 240, fat: 63, water: 2600, mealCount: 3, foods: ['Eggs', 'Salmon', 'Salad'] }),
    makeDay({ date: '2025-01-21', dayOfWeek: 2, dayName: 'Tuesday', isLogged: true, isComplete: true, calories: 2050, protein: 155, carbs: 260, fat: 67, water: 2400, mealCount: 3, foods: ['Oatmeal', 'Turkey', 'Pasta'] }),
    makeDay({ date: '2025-01-22', dayOfWeek: 3, dayName: 'Wednesday', isLogged: true, isComplete: true, calories: 1980, protein: 148, carbs: 245, fat: 64, water: 2700, mealCount: 3, foods: ['Yogurt', 'Steak', 'Veggies'] }),
    makeDay({ date: '2025-01-23', dayOfWeek: 4, dayName: 'Thursday', isLogged: true, isComplete: true, calories: 2020, protein: 152, carbs: 255, fat: 66, water: 2500, mealCount: 3, foods: ['Smoothie', 'Tuna', 'Rice Bowl'] }),
    makeDay({ date: '2025-01-24', dayOfWeek: 5, dayName: 'Friday', isLogged: true, isComplete: true, calories: 2010, protein: 150, carbs: 248, fat: 65, water: 2600, mealCount: 3, foods: ['Banana', 'Chicken Wrap', 'Stir Fry'] }),
    makeDay({ date: '2025-01-25', dayOfWeek: 6, dayName: 'Saturday', isLogged: true, isComplete: true, calories: 1990, protein: 149, carbs: 252, fat: 65, water: 2500, mealCount: 3, foods: ['Pancakes', 'Burger', 'Soup'] }),
  ],
  loggedDayCount: 7,
  completeDayCount: 7,
  avgCalories: 2000,
  avgProtein: 150,
  avgCarbs: 250,
  avgFat: 65,
  avgFiber: 0,
  avgWater: 2543,
  avgMealCount: 3,
  totalMeals: 21,
  dataConfidence: 1.0,
  loggingStreak: 14,
});

/** Only 2 days logged */
export const SPARSE_WEEK: WeeklyCollectedData = makeWeekData({
  days: [
    makeDay({ date: '2025-01-19', dayOfWeek: 0, dayName: 'Sunday' }),
    makeDay({ date: '2025-01-20', dayOfWeek: 1, dayName: 'Monday', isLogged: true, isComplete: true, calories: 1800, protein: 100, carbs: 200, fat: 55, water: 1500, mealCount: 2, foods: ['Pasta', 'Salad'] }),
    makeDay({ date: '2025-01-21', dayOfWeek: 2, dayName: 'Tuesday' }),
    makeDay({ date: '2025-01-22', dayOfWeek: 3, dayName: 'Wednesday' }),
    makeDay({ date: '2025-01-23', dayOfWeek: 4, dayName: 'Thursday', isLogged: true, isComplete: true, calories: 2200, protein: 130, carbs: 280, fat: 70, water: 2000, mealCount: 3, foods: ['Burrito', 'Smoothie', 'Pizza'] }),
    makeDay({ date: '2025-01-24', dayOfWeek: 5, dayName: 'Friday' }),
    makeDay({ date: '2025-01-25', dayOfWeek: 6, dayName: 'Saturday' }),
  ],
  loggedDayCount: 2,
  completeDayCount: 2,
  avgCalories: 2000,
  avgProtein: 115,
  avgCarbs: 240,
  avgFat: 62.5,
  avgWater: 1750,
  avgMealCount: 2.5,
  totalMeals: 5,
  dataConfidence: 2 / 7,
  loggingStreak: 0,
});

/** Weekends much higher than weekdays */
export const WEEKEND_HEAVY: WeeklyCollectedData = makeWeekData({
  days: [
    makeDay({ date: '2025-01-19', dayOfWeek: 0, dayName: 'Sunday', isLogged: true, isComplete: true, calories: 3000, protein: 120, carbs: 400, fat: 100, water: 1800, mealCount: 4, foods: ['Brunch', 'Pizza', 'Beer', 'Cake'] }),
    makeDay({ date: '2025-01-20', dayOfWeek: 1, dayName: 'Monday', isLogged: true, isComplete: true, calories: 1800, protein: 140, carbs: 200, fat: 55, water: 2500, mealCount: 3, foods: ['Oatmeal', 'Chicken', 'Salad'] }),
    makeDay({ date: '2025-01-21', dayOfWeek: 2, dayName: 'Tuesday', isLogged: true, isComplete: true, calories: 1900, protein: 145, carbs: 210, fat: 58, water: 2600, mealCount: 3, foods: ['Eggs', 'Salmon', 'Rice'] }),
    makeDay({ date: '2025-01-22', dayOfWeek: 3, dayName: 'Wednesday', isLogged: true, isComplete: true, calories: 1850, protein: 142, carbs: 205, fat: 56, water: 2400, mealCount: 3, foods: ['Smoothie', 'Turkey', 'Pasta'] }),
    makeDay({ date: '2025-01-23', dayOfWeek: 4, dayName: 'Thursday', isLogged: true, isComplete: true, calories: 1900, protein: 148, carbs: 215, fat: 58, water: 2500, mealCount: 3, foods: ['Yogurt', 'Fish', 'Veggies'] }),
    makeDay({ date: '2025-01-24', dayOfWeek: 5, dayName: 'Friday', isLogged: true, isComplete: true, calories: 2100, protein: 135, carbs: 260, fat: 70, water: 2200, mealCount: 3, foods: ['Cereal', 'Burger', 'Wings'] }),
    makeDay({ date: '2025-01-25', dayOfWeek: 6, dayName: 'Saturday', isLogged: true, isComplete: true, calories: 2800, protein: 115, carbs: 380, fat: 95, water: 1500, mealCount: 4, foods: ['Pancakes', 'BBQ', 'Chips', 'Ice Cream'] }),
  ],
  loggedDayCount: 7,
  completeDayCount: 7,
  avgCalories: 2193,
  avgProtein: 135,
  avgCarbs: 267,
  avgFat: 70,
  avgWater: 2214,
  avgMealCount: 3.3,
  totalMeals: 23,
  dataConfidence: 1.0,
  loggingStreak: 7,
});

/** Declining calorie trend across the week */
export const DECLINING: WeeklyCollectedData = makeWeekData({
  days: [
    makeDay({ date: '2025-01-19', dayOfWeek: 0, dayName: 'Sunday', isLogged: true, isComplete: true, calories: 2400, protein: 160, carbs: 300, fat: 80, water: 2500, mealCount: 4, foods: ['Big Breakfast', 'Lunch', 'Snack', 'Dinner'] }),
    makeDay({ date: '2025-01-20', dayOfWeek: 1, dayName: 'Monday', isLogged: true, isComplete: true, calories: 2200, protein: 150, carbs: 270, fat: 72, water: 2400, mealCount: 3, foods: ['Oatmeal', 'Chicken', 'Stir Fry'] }),
    makeDay({ date: '2025-01-21', dayOfWeek: 2, dayName: 'Tuesday', isLogged: true, isComplete: true, calories: 2000, protein: 140, carbs: 240, fat: 65, water: 2300, mealCount: 3, foods: ['Eggs', 'Tuna', 'Rice'] }),
    makeDay({ date: '2025-01-22', dayOfWeek: 3, dayName: 'Wednesday', isLogged: true, isComplete: true, calories: 1800, protein: 130, carbs: 210, fat: 58, water: 2200, mealCount: 3, foods: ['Smoothie', 'Wrap', 'Soup'] }),
    makeDay({ date: '2025-01-23', dayOfWeek: 4, dayName: 'Thursday', isLogged: true, isComplete: true, calories: 1600, protein: 120, carbs: 180, fat: 50, water: 2100, mealCount: 2, foods: ['Cereal', 'Pasta'] }),
    makeDay({ date: '2025-01-24', dayOfWeek: 5, dayName: 'Friday', isLogged: true, isComplete: true, calories: 1400, protein: 100, carbs: 150, fat: 45, water: 2000, mealCount: 2, foods: ['Sandwich', 'Salad'] }),
    makeDay({ date: '2025-01-25', dayOfWeek: 6, dayName: 'Saturday', isLogged: true, isComplete: true, calories: 1200, protein: 80, carbs: 120, fat: 40, water: 1800, mealCount: 2, foods: ['Toast', 'Soup'] }),
  ],
  loggedDayCount: 7,
  completeDayCount: 7,
  avgCalories: 1800,
  avgProtein: 126,
  avgCarbs: 210,
  avgFat: 58.6,
  avgWater: 2186,
  avgMealCount: 2.7,
  totalMeals: 19,
  dataConfidence: 1.0,
  loggingStreak: 7,
});

/** Zero data - no days logged */
export const EMPTY_WEEK: WeeklyCollectedData = makeWeekData({
  days: [
    makeDay({ date: '2025-01-19', dayOfWeek: 0, dayName: 'Sunday' }),
    makeDay({ date: '2025-01-20', dayOfWeek: 1, dayName: 'Monday' }),
    makeDay({ date: '2025-01-21', dayOfWeek: 2, dayName: 'Tuesday' }),
    makeDay({ date: '2025-01-22', dayOfWeek: 3, dayName: 'Wednesday' }),
    makeDay({ date: '2025-01-23', dayOfWeek: 4, dayName: 'Thursday' }),
    makeDay({ date: '2025-01-24', dayOfWeek: 5, dayName: 'Friday' }),
    makeDay({ date: '2025-01-25', dayOfWeek: 6, dayName: 'Saturday' }),
  ],
  loggedDayCount: 0,
  completeDayCount: 0,
  dataConfidence: 0,
});

/** Low protein week for protein-specific tests */
export const LOW_PROTEIN: WeeklyCollectedData = makeWeekData({
  days: [
    makeDay({ date: '2025-01-19', dayOfWeek: 0, dayName: 'Sunday', isLogged: true, isComplete: true, calories: 2000, protein: 60, carbs: 320, fat: 65, water: 2500, mealCount: 3, foods: ['Pasta', 'Bread', 'Rice'] }),
    makeDay({ date: '2025-01-20', dayOfWeek: 1, dayName: 'Monday', isLogged: true, isComplete: true, calories: 2100, protein: 55, carbs: 340, fat: 70, water: 2400, mealCount: 3, foods: ['Cereal', 'Sandwich', 'Pizza'] }),
    makeDay({ date: '2025-01-21', dayOfWeek: 2, dayName: 'Tuesday', isLogged: true, isComplete: true, calories: 1900, protein: 65, carbs: 300, fat: 62, water: 2300, mealCount: 3, foods: ['Oatmeal', 'Noodles', 'Tacos'] }),
    makeDay({ date: '2025-01-22', dayOfWeek: 3, dayName: 'Wednesday', isLogged: true, isComplete: true, calories: 2050, protein: 58, carbs: 330, fat: 68, water: 2200, mealCount: 3, foods: ['Toast', 'Fries', 'Ramen'] }),
    makeDay({ date: '2025-01-23', dayOfWeek: 4, dayName: 'Thursday', isLogged: true, isComplete: true, calories: 1950, protein: 62, carbs: 310, fat: 64, water: 2500, mealCount: 3, foods: ['Pancakes', 'Chips', 'Burger'] }),
    makeDay({ date: '2025-01-24', dayOfWeek: 5, dayName: 'Friday', isLogged: true, isComplete: true, calories: 2000, protein: 50, carbs: 325, fat: 66, water: 2100, mealCount: 3, foods: ['Bagel', 'Mac & Cheese', 'Fried Rice'] }),
    makeDay({ date: '2025-01-25', dayOfWeek: 6, dayName: 'Saturday', isLogged: true, isComplete: true, calories: 2200, protein: 70, carbs: 350, fat: 72, water: 2000, mealCount: 3, foods: ['Waffles', 'Nachos', 'Calzone'] }),
  ],
  loggedDayCount: 7,
  completeDayCount: 7,
  avgCalories: 2029,
  avgProtein: 60,
  avgCarbs: 325,
  avgFat: 67,
  avgWater: 2286,
  avgMealCount: 3,
  totalMeals: 21,
  dataConfidence: 1.0,
  loggingStreak: 7,
});

export { makeDay, makeWeekData };
