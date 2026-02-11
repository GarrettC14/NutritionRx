/**
 * RDA (Recommended Dietary Allowance) Tables
 * Reference values by age, gender, and life stage based on USDA/NIH data
 */

import { NutrientRDA, Gender, AgeGroup, LifeStage } from '@/types/micronutrients';

// ============================================================
// Type for RDA Lookup Structure
// ============================================================

type RDAValue = {
  rda: number;
  ul?: number;  // Tolerable Upper Intake Level
  ai?: number;  // Adequate Intake (when RDA not established)
};

type GenderRDAMap = {
  male: Record<AgeGroup, RDAValue>;
  female: Record<AgeGroup, RDAValue>;
};

// ============================================================
// RDA Data by Nutrient
// Values based on NIH Office of Dietary Supplements and USDA
// ============================================================

// --- VITAMINS ---

const vitaminCRDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 40, ul: undefined },
    '7-12mo': { ai: 50, ul: undefined },
    '1-3y': { rda: 15, ul: 400 },
    '4-8y': { rda: 25, ul: 650 },
    '9-13y': { rda: 45, ul: 1200 },
    '14-18y': { rda: 75, ul: 1800 },
    '19-30y': { rda: 90, ul: 2000 },
    '31-50y': { rda: 90, ul: 2000 },
    '51-70y': { rda: 90, ul: 2000 },
    '71+y': { rda: 90, ul: 2000 },
  },
  female: {
    '0-6mo': { ai: 40, ul: undefined },
    '7-12mo': { ai: 50, ul: undefined },
    '1-3y': { rda: 15, ul: 400 },
    '4-8y': { rda: 25, ul: 650 },
    '9-13y': { rda: 45, ul: 1200 },
    '14-18y': { rda: 65, ul: 1800 },
    '19-30y': { rda: 75, ul: 2000 },
    '31-50y': { rda: 75, ul: 2000 },
    '51-70y': { rda: 75, ul: 2000 },
    '71+y': { rda: 75, ul: 2000 },
  },
};

const vitaminARDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 400, ul: 600 },
    '7-12mo': { ai: 500, ul: 600 },
    '1-3y': { rda: 300, ul: 600 },
    '4-8y': { rda: 400, ul: 900 },
    '9-13y': { rda: 600, ul: 1700 },
    '14-18y': { rda: 900, ul: 2800 },
    '19-30y': { rda: 900, ul: 3000 },
    '31-50y': { rda: 900, ul: 3000 },
    '51-70y': { rda: 900, ul: 3000 },
    '71+y': { rda: 900, ul: 3000 },
  },
  female: {
    '0-6mo': { ai: 400, ul: 600 },
    '7-12mo': { ai: 500, ul: 600 },
    '1-3y': { rda: 300, ul: 600 },
    '4-8y': { rda: 400, ul: 900 },
    '9-13y': { rda: 600, ul: 1700 },
    '14-18y': { rda: 700, ul: 2800 },
    '19-30y': { rda: 700, ul: 3000 },
    '31-50y': { rda: 700, ul: 3000 },
    '51-70y': { rda: 700, ul: 3000 },
    '71+y': { rda: 700, ul: 3000 },
  },
};

const vitaminDRDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 10, ul: 25 },
    '7-12mo': { ai: 10, ul: 38 },
    '1-3y': { rda: 15, ul: 63 },
    '4-8y': { rda: 15, ul: 75 },
    '9-13y': { rda: 15, ul: 100 },
    '14-18y': { rda: 15, ul: 100 },
    '19-30y': { rda: 15, ul: 100 },
    '31-50y': { rda: 15, ul: 100 },
    '51-70y': { rda: 15, ul: 100 },
    '71+y': { rda: 20, ul: 100 },
  },
  female: {
    '0-6mo': { ai: 10, ul: 25 },
    '7-12mo': { ai: 10, ul: 38 },
    '1-3y': { rda: 15, ul: 63 },
    '4-8y': { rda: 15, ul: 75 },
    '9-13y': { rda: 15, ul: 100 },
    '14-18y': { rda: 15, ul: 100 },
    '19-30y': { rda: 15, ul: 100 },
    '31-50y': { rda: 15, ul: 100 },
    '51-70y': { rda: 15, ul: 100 },
    '71+y': { rda: 20, ul: 100 },
  },
};

const vitaminERDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 4, ul: undefined },
    '7-12mo': { ai: 5, ul: undefined },
    '1-3y': { rda: 6, ul: 200 },
    '4-8y': { rda: 7, ul: 300 },
    '9-13y': { rda: 11, ul: 600 },
    '14-18y': { rda: 15, ul: 800 },
    '19-30y': { rda: 15, ul: 1000 },
    '31-50y': { rda: 15, ul: 1000 },
    '51-70y': { rda: 15, ul: 1000 },
    '71+y': { rda: 15, ul: 1000 },
  },
  female: {
    '0-6mo': { ai: 4, ul: undefined },
    '7-12mo': { ai: 5, ul: undefined },
    '1-3y': { rda: 6, ul: 200 },
    '4-8y': { rda: 7, ul: 300 },
    '9-13y': { rda: 11, ul: 600 },
    '14-18y': { rda: 15, ul: 800 },
    '19-30y': { rda: 15, ul: 1000 },
    '31-50y': { rda: 15, ul: 1000 },
    '51-70y': { rda: 15, ul: 1000 },
    '71+y': { rda: 15, ul: 1000 },
  },
};

const vitaminKRDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 2, ul: undefined },
    '7-12mo': { ai: 2.5, ul: undefined },
    '1-3y': { ai: 30, ul: undefined },
    '4-8y': { ai: 55, ul: undefined },
    '9-13y': { ai: 60, ul: undefined },
    '14-18y': { ai: 75, ul: undefined },
    '19-30y': { ai: 120, ul: undefined },
    '31-50y': { ai: 120, ul: undefined },
    '51-70y': { ai: 120, ul: undefined },
    '71+y': { ai: 120, ul: undefined },
  },
  female: {
    '0-6mo': { ai: 2, ul: undefined },
    '7-12mo': { ai: 2.5, ul: undefined },
    '1-3y': { ai: 30, ul: undefined },
    '4-8y': { ai: 55, ul: undefined },
    '9-13y': { ai: 60, ul: undefined },
    '14-18y': { ai: 75, ul: undefined },
    '19-30y': { ai: 90, ul: undefined },
    '31-50y': { ai: 90, ul: undefined },
    '51-70y': { ai: 90, ul: undefined },
    '71+y': { ai: 90, ul: undefined },
  },
};

// B Vitamins
const thiaminRDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 0.2, ul: undefined },
    '7-12mo': { ai: 0.3, ul: undefined },
    '1-3y': { rda: 0.5, ul: undefined },
    '4-8y': { rda: 0.6, ul: undefined },
    '9-13y': { rda: 0.9, ul: undefined },
    '14-18y': { rda: 1.2, ul: undefined },
    '19-30y': { rda: 1.2, ul: undefined },
    '31-50y': { rda: 1.2, ul: undefined },
    '51-70y': { rda: 1.2, ul: undefined },
    '71+y': { rda: 1.2, ul: undefined },
  },
  female: {
    '0-6mo': { ai: 0.2, ul: undefined },
    '7-12mo': { ai: 0.3, ul: undefined },
    '1-3y': { rda: 0.5, ul: undefined },
    '4-8y': { rda: 0.6, ul: undefined },
    '9-13y': { rda: 0.9, ul: undefined },
    '14-18y': { rda: 1.0, ul: undefined },
    '19-30y': { rda: 1.1, ul: undefined },
    '31-50y': { rda: 1.1, ul: undefined },
    '51-70y': { rda: 1.1, ul: undefined },
    '71+y': { rda: 1.1, ul: undefined },
  },
};

const riboflavinRDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 0.3, ul: undefined },
    '7-12mo': { ai: 0.4, ul: undefined },
    '1-3y': { rda: 0.5, ul: undefined },
    '4-8y': { rda: 0.6, ul: undefined },
    '9-13y': { rda: 0.9, ul: undefined },
    '14-18y': { rda: 1.3, ul: undefined },
    '19-30y': { rda: 1.3, ul: undefined },
    '31-50y': { rda: 1.3, ul: undefined },
    '51-70y': { rda: 1.3, ul: undefined },
    '71+y': { rda: 1.3, ul: undefined },
  },
  female: {
    '0-6mo': { ai: 0.3, ul: undefined },
    '7-12mo': { ai: 0.4, ul: undefined },
    '1-3y': { rda: 0.5, ul: undefined },
    '4-8y': { rda: 0.6, ul: undefined },
    '9-13y': { rda: 0.9, ul: undefined },
    '14-18y': { rda: 1.0, ul: undefined },
    '19-30y': { rda: 1.1, ul: undefined },
    '31-50y': { rda: 1.1, ul: undefined },
    '51-70y': { rda: 1.1, ul: undefined },
    '71+y': { rda: 1.1, ul: undefined },
  },
};

const niacinRDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 2, ul: undefined },
    '7-12mo': { ai: 4, ul: undefined },
    '1-3y': { rda: 6, ul: 10 },
    '4-8y': { rda: 8, ul: 15 },
    '9-13y': { rda: 12, ul: 20 },
    '14-18y': { rda: 16, ul: 30 },
    '19-30y': { rda: 16, ul: 35 },
    '31-50y': { rda: 16, ul: 35 },
    '51-70y': { rda: 16, ul: 35 },
    '71+y': { rda: 16, ul: 35 },
  },
  female: {
    '0-6mo': { ai: 2, ul: undefined },
    '7-12mo': { ai: 4, ul: undefined },
    '1-3y': { rda: 6, ul: 10 },
    '4-8y': { rda: 8, ul: 15 },
    '9-13y': { rda: 12, ul: 20 },
    '14-18y': { rda: 14, ul: 30 },
    '19-30y': { rda: 14, ul: 35 },
    '31-50y': { rda: 14, ul: 35 },
    '51-70y': { rda: 14, ul: 35 },
    '71+y': { rda: 14, ul: 35 },
  },
};

const vitaminB6RDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 0.1, ul: undefined },
    '7-12mo': { ai: 0.3, ul: undefined },
    '1-3y': { rda: 0.5, ul: 30 },
    '4-8y': { rda: 0.6, ul: 40 },
    '9-13y': { rda: 1.0, ul: 60 },
    '14-18y': { rda: 1.3, ul: 80 },
    '19-30y': { rda: 1.3, ul: 100 },
    '31-50y': { rda: 1.3, ul: 100 },
    '51-70y': { rda: 1.7, ul: 100 },
    '71+y': { rda: 1.7, ul: 100 },
  },
  female: {
    '0-6mo': { ai: 0.1, ul: undefined },
    '7-12mo': { ai: 0.3, ul: undefined },
    '1-3y': { rda: 0.5, ul: 30 },
    '4-8y': { rda: 0.6, ul: 40 },
    '9-13y': { rda: 1.0, ul: 60 },
    '14-18y': { rda: 1.2, ul: 80 },
    '19-30y': { rda: 1.3, ul: 100 },
    '31-50y': { rda: 1.3, ul: 100 },
    '51-70y': { rda: 1.5, ul: 100 },
    '71+y': { rda: 1.5, ul: 100 },
  },
};

const folateRDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 65, ul: undefined },
    '7-12mo': { ai: 80, ul: undefined },
    '1-3y': { rda: 150, ul: 300 },
    '4-8y': { rda: 200, ul: 400 },
    '9-13y': { rda: 300, ul: 600 },
    '14-18y': { rda: 400, ul: 800 },
    '19-30y': { rda: 400, ul: 1000 },
    '31-50y': { rda: 400, ul: 1000 },
    '51-70y': { rda: 400, ul: 1000 },
    '71+y': { rda: 400, ul: 1000 },
  },
  female: {
    '0-6mo': { ai: 65, ul: undefined },
    '7-12mo': { ai: 80, ul: undefined },
    '1-3y': { rda: 150, ul: 300 },
    '4-8y': { rda: 200, ul: 400 },
    '9-13y': { rda: 300, ul: 600 },
    '14-18y': { rda: 400, ul: 800 },
    '19-30y': { rda: 400, ul: 1000 },
    '31-50y': { rda: 400, ul: 1000 },
    '51-70y': { rda: 400, ul: 1000 },
    '71+y': { rda: 400, ul: 1000 },
  },
};

const vitaminB12RDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 0.4, ul: undefined },
    '7-12mo': { ai: 0.5, ul: undefined },
    '1-3y': { rda: 0.9, ul: undefined },
    '4-8y': { rda: 1.2, ul: undefined },
    '9-13y': { rda: 1.8, ul: undefined },
    '14-18y': { rda: 2.4, ul: undefined },
    '19-30y': { rda: 2.4, ul: undefined },
    '31-50y': { rda: 2.4, ul: undefined },
    '51-70y': { rda: 2.4, ul: undefined },
    '71+y': { rda: 2.4, ul: undefined },
  },
  female: {
    '0-6mo': { ai: 0.4, ul: undefined },
    '7-12mo': { ai: 0.5, ul: undefined },
    '1-3y': { rda: 0.9, ul: undefined },
    '4-8y': { rda: 1.2, ul: undefined },
    '9-13y': { rda: 1.8, ul: undefined },
    '14-18y': { rda: 2.4, ul: undefined },
    '19-30y': { rda: 2.4, ul: undefined },
    '31-50y': { rda: 2.4, ul: undefined },
    '51-70y': { rda: 2.4, ul: undefined },
    '71+y': { rda: 2.4, ul: undefined },
  },
};

// --- MINERALS ---

const calciumRDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 200, ul: 1000 },
    '7-12mo': { ai: 260, ul: 1500 },
    '1-3y': { rda: 700, ul: 2500 },
    '4-8y': { rda: 1000, ul: 2500 },
    '9-13y': { rda: 1300, ul: 3000 },
    '14-18y': { rda: 1300, ul: 3000 },
    '19-30y': { rda: 1000, ul: 2500 },
    '31-50y': { rda: 1000, ul: 2500 },
    '51-70y': { rda: 1000, ul: 2000 },
    '71+y': { rda: 1200, ul: 2000 },
  },
  female: {
    '0-6mo': { ai: 200, ul: 1000 },
    '7-12mo': { ai: 260, ul: 1500 },
    '1-3y': { rda: 700, ul: 2500 },
    '4-8y': { rda: 1000, ul: 2500 },
    '9-13y': { rda: 1300, ul: 3000 },
    '14-18y': { rda: 1300, ul: 3000 },
    '19-30y': { rda: 1000, ul: 2500 },
    '31-50y': { rda: 1000, ul: 2500 },
    '51-70y': { rda: 1200, ul: 2000 },
    '71+y': { rda: 1200, ul: 2000 },
  },
};

const ironRDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 0.27, ul: 40 },
    '7-12mo': { rda: 11, ul: 40 },
    '1-3y': { rda: 7, ul: 40 },
    '4-8y': { rda: 10, ul: 40 },
    '9-13y': { rda: 8, ul: 40 },
    '14-18y': { rda: 11, ul: 45 },
    '19-30y': { rda: 8, ul: 45 },
    '31-50y': { rda: 8, ul: 45 },
    '51-70y': { rda: 8, ul: 45 },
    '71+y': { rda: 8, ul: 45 },
  },
  female: {
    '0-6mo': { ai: 0.27, ul: 40 },
    '7-12mo': { rda: 11, ul: 40 },
    '1-3y': { rda: 7, ul: 40 },
    '4-8y': { rda: 10, ul: 40 },
    '9-13y': { rda: 8, ul: 40 },
    '14-18y': { rda: 15, ul: 45 },
    '19-30y': { rda: 18, ul: 45 },
    '31-50y': { rda: 18, ul: 45 },
    '51-70y': { rda: 8, ul: 45 },
    '71+y': { rda: 8, ul: 45 },
  },
};

const magnesiumRDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 30, ul: undefined },
    '7-12mo': { ai: 75, ul: undefined },
    '1-3y': { rda: 80, ul: 65 },
    '4-8y': { rda: 130, ul: 110 },
    '9-13y': { rda: 240, ul: 350 },
    '14-18y': { rda: 410, ul: 350 },
    '19-30y': { rda: 400, ul: 350 },
    '31-50y': { rda: 420, ul: 350 },
    '51-70y': { rda: 420, ul: 350 },
    '71+y': { rda: 420, ul: 350 },
  },
  female: {
    '0-6mo': { ai: 30, ul: undefined },
    '7-12mo': { ai: 75, ul: undefined },
    '1-3y': { rda: 80, ul: 65 },
    '4-8y': { rda: 130, ul: 110 },
    '9-13y': { rda: 240, ul: 350 },
    '14-18y': { rda: 360, ul: 350 },
    '19-30y': { rda: 310, ul: 350 },
    '31-50y': { rda: 320, ul: 350 },
    '51-70y': { rda: 320, ul: 350 },
    '71+y': { rda: 320, ul: 350 },
  },
};

const zincRDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 2, ul: 4 },
    '7-12mo': { rda: 3, ul: 5 },
    '1-3y': { rda: 3, ul: 7 },
    '4-8y': { rda: 5, ul: 12 },
    '9-13y': { rda: 8, ul: 23 },
    '14-18y': { rda: 11, ul: 34 },
    '19-30y': { rda: 11, ul: 40 },
    '31-50y': { rda: 11, ul: 40 },
    '51-70y': { rda: 11, ul: 40 },
    '71+y': { rda: 11, ul: 40 },
  },
  female: {
    '0-6mo': { ai: 2, ul: 4 },
    '7-12mo': { rda: 3, ul: 5 },
    '1-3y': { rda: 3, ul: 7 },
    '4-8y': { rda: 5, ul: 12 },
    '9-13y': { rda: 8, ul: 23 },
    '14-18y': { rda: 9, ul: 34 },
    '19-30y': { rda: 8, ul: 40 },
    '31-50y': { rda: 8, ul: 40 },
    '51-70y': { rda: 8, ul: 40 },
    '71+y': { rda: 8, ul: 40 },
  },
};

const potassiumRDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 400, ul: undefined },
    '7-12mo': { ai: 860, ul: undefined },
    '1-3y': { ai: 2000, ul: undefined },
    '4-8y': { ai: 2300, ul: undefined },
    '9-13y': { ai: 2500, ul: undefined },
    '14-18y': { ai: 3000, ul: undefined },
    '19-30y': { ai: 3400, ul: undefined },
    '31-50y': { ai: 3400, ul: undefined },
    '51-70y': { ai: 3400, ul: undefined },
    '71+y': { ai: 3400, ul: undefined },
  },
  female: {
    '0-6mo': { ai: 400, ul: undefined },
    '7-12mo': { ai: 860, ul: undefined },
    '1-3y': { ai: 2000, ul: undefined },
    '4-8y': { ai: 2300, ul: undefined },
    '9-13y': { ai: 2300, ul: undefined },
    '14-18y': { ai: 2300, ul: undefined },
    '19-30y': { ai: 2600, ul: undefined },
    '31-50y': { ai: 2600, ul: undefined },
    '51-70y': { ai: 2600, ul: undefined },
    '71+y': { ai: 2600, ul: undefined },
  },
};

const sodiumRDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 110, ul: undefined },
    '7-12mo': { ai: 370, ul: undefined },
    '1-3y': { ai: 800, ul: 1500 },
    '4-8y': { ai: 1000, ul: 1900 },
    '9-13y': { ai: 1200, ul: 2200 },
    '14-18y': { ai: 1500, ul: 2300 },
    '19-30y': { ai: 1500, ul: 2300 },
    '31-50y': { ai: 1500, ul: 2300 },
    '51-70y': { ai: 1300, ul: 2300 },
    '71+y': { ai: 1200, ul: 2300 },
  },
  female: {
    '0-6mo': { ai: 110, ul: undefined },
    '7-12mo': { ai: 370, ul: undefined },
    '1-3y': { ai: 800, ul: 1500 },
    '4-8y': { ai: 1000, ul: 1900 },
    '9-13y': { ai: 1200, ul: 2200 },
    '14-18y': { ai: 1500, ul: 2300 },
    '19-30y': { ai: 1500, ul: 2300 },
    '31-50y': { ai: 1500, ul: 2300 },
    '51-70y': { ai: 1300, ul: 2300 },
    '71+y': { ai: 1200, ul: 2300 },
  },
};

const seleniumRDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 15, ul: 45 },
    '7-12mo': { ai: 20, ul: 60 },
    '1-3y': { rda: 20, ul: 90 },
    '4-8y': { rda: 30, ul: 150 },
    '9-13y': { rda: 40, ul: 280 },
    '14-18y': { rda: 55, ul: 400 },
    '19-30y': { rda: 55, ul: 400 },
    '31-50y': { rda: 55, ul: 400 },
    '51-70y': { rda: 55, ul: 400 },
    '71+y': { rda: 55, ul: 400 },
  },
  female: {
    '0-6mo': { ai: 15, ul: 45 },
    '7-12mo': { ai: 20, ul: 60 },
    '1-3y': { rda: 20, ul: 90 },
    '4-8y': { rda: 30, ul: 150 },
    '9-13y': { rda: 40, ul: 280 },
    '14-18y': { rda: 55, ul: 400 },
    '19-30y': { rda: 55, ul: 400 },
    '31-50y': { rda: 55, ul: 400 },
    '51-70y': { rda: 55, ul: 400 },
    '71+y': { rda: 55, ul: 400 },
  },
};

// --- OTHER NUTRIENTS ---

const fiberRDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 0, ul: undefined },
    '7-12mo': { ai: 0, ul: undefined },
    '1-3y': { ai: 19, ul: undefined },
    '4-8y': { ai: 25, ul: undefined },
    '9-13y': { ai: 31, ul: undefined },
    '14-18y': { ai: 38, ul: undefined },
    '19-30y': { ai: 38, ul: undefined },
    '31-50y': { ai: 38, ul: undefined },
    '51-70y': { ai: 30, ul: undefined },
    '71+y': { ai: 30, ul: undefined },
  },
  female: {
    '0-6mo': { ai: 0, ul: undefined },
    '7-12mo': { ai: 0, ul: undefined },
    '1-3y': { ai: 19, ul: undefined },
    '4-8y': { ai: 25, ul: undefined },
    '9-13y': { ai: 26, ul: undefined },
    '14-18y': { ai: 26, ul: undefined },
    '19-30y': { ai: 25, ul: undefined },
    '31-50y': { ai: 25, ul: undefined },
    '51-70y': { ai: 21, ul: undefined },
    '71+y': { ai: 21, ul: undefined },
  },
};

const cholineRDA: GenderRDAMap = {
  male: {
    '0-6mo': { ai: 125, ul: undefined },
    '7-12mo': { ai: 150, ul: undefined },
    '1-3y': { ai: 200, ul: 1000 },
    '4-8y': { ai: 250, ul: 1000 },
    '9-13y': { ai: 375, ul: 2000 },
    '14-18y': { ai: 550, ul: 3000 },
    '19-30y': { ai: 550, ul: 3500 },
    '31-50y': { ai: 550, ul: 3500 },
    '51-70y': { ai: 550, ul: 3500 },
    '71+y': { ai: 550, ul: 3500 },
  },
  female: {
    '0-6mo': { ai: 125, ul: undefined },
    '7-12mo': { ai: 150, ul: undefined },
    '1-3y': { ai: 200, ul: 1000 },
    '4-8y': { ai: 250, ul: 1000 },
    '9-13y': { ai: 375, ul: 2000 },
    '14-18y': { ai: 400, ul: 3000 },
    '19-30y': { ai: 425, ul: 3500 },
    '31-50y': { ai: 425, ul: 3500 },
    '51-70y': { ai: 425, ul: 3500 },
    '71+y': { ai: 425, ul: 3500 },
  },
};

// ============================================================
// Pregnancy/Lactation Adjustments
// ============================================================

interface PregnancyLactationAdjustment {
  nutrientId: string;
  pregnantRDA: number;
  lactatingRDA: number;
  pregnantUL?: number;
  lactatingUL?: number;
}

export const PREGNANCY_LACTATION_ADJUSTMENTS: PregnancyLactationAdjustment[] = [
  { nutrientId: 'vitamin_c', pregnantRDA: 85, lactatingRDA: 120 },
  { nutrientId: 'vitamin_a', pregnantRDA: 770, lactatingRDA: 1300, pregnantUL: 3000, lactatingUL: 3000 },
  { nutrientId: 'vitamin_d', pregnantRDA: 15, lactatingRDA: 15 },
  { nutrientId: 'vitamin_e', pregnantRDA: 15, lactatingRDA: 19 },
  { nutrientId: 'vitamin_k', pregnantRDA: 90, lactatingRDA: 90 },
  { nutrientId: 'thiamin', pregnantRDA: 1.4, lactatingRDA: 1.4 },
  { nutrientId: 'riboflavin', pregnantRDA: 1.4, lactatingRDA: 1.6 },
  { nutrientId: 'niacin', pregnantRDA: 18, lactatingRDA: 17 },
  { nutrientId: 'vitamin_b6', pregnantRDA: 1.9, lactatingRDA: 2.0 },
  { nutrientId: 'folate', pregnantRDA: 600, lactatingRDA: 500 },
  { nutrientId: 'vitamin_b12', pregnantRDA: 2.6, lactatingRDA: 2.8 },
  { nutrientId: 'calcium', pregnantRDA: 1000, lactatingRDA: 1000 },
  { nutrientId: 'iron', pregnantRDA: 27, lactatingRDA: 9 },
  { nutrientId: 'magnesium', pregnantRDA: 350, lactatingRDA: 310 },
  { nutrientId: 'zinc', pregnantRDA: 11, lactatingRDA: 12 },
  { nutrientId: 'choline', pregnantRDA: 450, lactatingRDA: 550 },
];

// ============================================================
// Master RDA Lookup Map
// ============================================================

export const RDA_BY_NUTRIENT: Record<string, GenderRDAMap> = {
  vitamin_c: vitaminCRDA,
  vitamin_a: vitaminARDA,
  vitamin_d: vitaminDRDA,
  vitamin_e: vitaminERDA,
  vitamin_k: vitaminKRDA,
  thiamin: thiaminRDA,
  riboflavin: riboflavinRDA,
  niacin: niacinRDA,
  vitamin_b6: vitaminB6RDA,
  folate: folateRDA,
  vitamin_b12: vitaminB12RDA,
  calcium: calciumRDA,
  iron: ironRDA,
  magnesium: magnesiumRDA,
  zinc: zincRDA,
  potassium: potassiumRDA,
  sodium: sodiumRDA,
  selenium: seleniumRDA,
  fiber: fiberRDA,
  choline: cholineRDA,
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get RDA value for a specific nutrient, gender, age group, and life stage
 */
export function getRDA(
  nutrientId: string,
  gender: Gender,
  ageGroup: AgeGroup,
  lifeStage: LifeStage = 'normal'
): RDAValue | null {
  const nutrientRDA = RDA_BY_NUTRIENT[nutrientId];
  if (!nutrientRDA) return null;

  const genderRDA = nutrientRDA[gender];
  if (!genderRDA) return null;

  const baseRDA = genderRDA[ageGroup];
  if (!baseRDA) return null;

  // Apply pregnancy/lactation adjustments if applicable
  if (gender === 'female' && lifeStage !== 'normal') {
    const adjustment = PREGNANCY_LACTATION_ADJUSTMENTS.find(a => a.nutrientId === nutrientId);
    if (adjustment) {
      if (lifeStage === 'pregnant') {
        return {
          rda: adjustment.pregnantRDA,
          ul: adjustment.pregnantUL ?? baseRDA.ul,
          ai: baseRDA.ai,
        };
      } else if (lifeStage === 'lactating') {
        return {
          rda: adjustment.lactatingRDA,
          ul: adjustment.lactatingUL ?? baseRDA.ul,
          ai: baseRDA.ai,
        };
      }
    }
  }

  return baseRDA;
}

/**
 * Get all RDA values for a user profile
 */
export function getAllRDAsForProfile(
  gender: Gender,
  ageGroup: AgeGroup,
  lifeStage: LifeStage = 'normal'
): NutrientRDA[] {
  const result: NutrientRDA[] = [];

  for (const nutrientId of Object.keys(RDA_BY_NUTRIENT)) {
    const rdaValue = getRDA(nutrientId, gender, ageGroup, lifeStage);
    if (rdaValue) {
      result.push({
        nutrientId,
        gender,
        ageGroup,
        lifeStage,
        rda: rdaValue.rda ?? rdaValue.ai ?? 0,
        ul: rdaValue.ul,
        ai: rdaValue.ai,
      });
    }
  }

  return result;
}

/**
 * Calculate age group from birth date
 */
export function getAgeGroupFromBirthDate(birthDate: Date): AgeGroup {
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ? age - 1
    : age;

  if (adjustedAge < 1) {
    const months = adjustedAge * 12 + monthDiff;
    return months <= 6 ? '0-6mo' : '7-12mo';
  }
  if (adjustedAge <= 3) return '1-3y';
  if (adjustedAge <= 8) return '4-8y';
  if (adjustedAge <= 13) return '9-13y';
  if (adjustedAge <= 18) return '14-18y';
  if (adjustedAge <= 30) return '19-30y';
  if (adjustedAge <= 50) return '31-50y';
  if (adjustedAge <= 70) return '51-70y';
  return '71+y';
}

/**
 * Default RDA values for common adult user (used as fallback)
 */
export const DEFAULT_ADULT_RDAS: Record<string, { rda: number; ul?: number }> = {
  vitamin_c: { rda: 90, ul: 2000 },
  vitamin_a: { rda: 900, ul: 3000 },
  vitamin_d: { rda: 15, ul: 100 },
  vitamin_e: { rda: 15, ul: 1000 },
  vitamin_k: { rda: 120 },
  thiamin: { rda: 1.2 },
  riboflavin: { rda: 1.3 },
  niacin: { rda: 16, ul: 35 },
  vitamin_b6: { rda: 1.3, ul: 100 },
  folate: { rda: 400, ul: 1000 },
  vitamin_b12: { rda: 2.4 },
  calcium: { rda: 1000, ul: 2500 },
  iron: { rda: 8, ul: 45 },
  magnesium: { rda: 420, ul: 350 },
  zinc: { rda: 11, ul: 40 },
  potassium: { rda: 3400 },
  sodium: { rda: 1500, ul: 2300 },
  selenium: { rda: 55, ul: 400 },
  phosphorus: { rda: 700, ul: 4000 },
  copper: { rda: 0.9, ul: 10 },
  manganese: { rda: 2.3, ul: 11 },
  fiber: { rda: 38 },
  choline: { rda: 550, ul: 3500 },
  saturated_fat: { rda: 20 }, // ~10% of 2000 cal diet
  cholesterol: { rda: 300 },
  omega_3_ala: { rda: 1.6 },
  omega_3_epa: { rda: 0.25 },
  omega_3_dha: { rda: 0.25 },
};
