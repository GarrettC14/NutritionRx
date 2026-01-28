/**
 * Micronutrient Tracking Types
 * Types for comprehensive nutrient tracking (82+ nutrients)
 */

export type NutrientCategory =
  | 'vitamins'
  | 'minerals'
  | 'amino_acids'
  | 'fatty_acids'
  | 'other';

export type NutrientSubcategory =
  | 'water_soluble_vitamins'
  | 'fat_soluble_vitamins'
  | 'major_minerals'
  | 'trace_minerals'
  | 'essential_amino_acids'
  | 'non_essential_amino_acids'
  | 'omega_fatty_acids'
  | 'other_fats'
  | 'other_nutrients';

export interface NutrientDefinition {
  id: string;
  name: string;
  shortName: string;
  unit: 'mg' | 'mcg' | 'g' | 'IU';
  category: NutrientCategory;
  subcategory: NutrientSubcategory;
  description?: string;
  foodSources?: string[];
  isPremium: boolean;
}

export type Gender = 'male' | 'female';
export type AgeGroup =
  | '0-6mo' | '7-12mo'
  | '1-3y' | '4-8y'
  | '9-13y' | '14-18y'
  | '19-30y' | '31-50y' | '51-70y' | '71+y';

export type LifeStage = 'normal' | 'pregnant' | 'lactating';

export interface NutrientRDA {
  nutrientId: string;
  gender: Gender;
  ageGroup: AgeGroup;
  lifeStage: LifeStage;
  rda: number;
  ul?: number;
  ai?: number;
}

export interface NutrientTarget {
  nutrientId: string;
  targetAmount: number;
  upperLimit?: number;
  isCustom: boolean;
}

export interface NutrientIntake {
  nutrientId: string;
  amount: number;
  percentOfTarget: number;
  status: NutrientStatus;
}

export type NutrientStatus =
  | 'deficient'
  | 'low'
  | 'adequate'
  | 'optimal'
  | 'high'
  | 'excessive';

export interface DailyNutrientIntake {
  date: string;
  nutrients: NutrientIntake[];
  totalFoodsLogged: number;
  hasCompleteData: boolean;
}

export interface NutrientContributor {
  nutrientId: string;
  date: string;
  logEntryId: string;
  foodName: string;
  amount: number;
  percentOfDailyIntake: number;
}
