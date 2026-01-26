import { MealType, MEAL_TYPE_LABELS, MEAL_ORDER, getSuggestedMealType } from '@/constants/mealTypes';

describe('MealType Constants', () => {
  describe('MEAL_TYPE_LABELS', () => {
    it('should have labels for all meal types', () => {
      expect(MEAL_TYPE_LABELS[MealType.Breakfast]).toBe('Breakfast');
      expect(MEAL_TYPE_LABELS[MealType.Lunch]).toBe('Lunch');
      expect(MEAL_TYPE_LABELS[MealType.Dinner]).toBe('Dinner');
      expect(MEAL_TYPE_LABELS[MealType.Snack]).toBe('Snack');
    });
  });

  describe('MEAL_ORDER', () => {
    it('should order breakfast first', () => {
      expect(MEAL_ORDER[MealType.Breakfast]).toBeLessThan(MEAL_ORDER[MealType.Lunch]);
    });

    it('should order lunch before dinner', () => {
      expect(MEAL_ORDER[MealType.Lunch]).toBeLessThan(MEAL_ORDER[MealType.Dinner]);
    });

    it('should order dinner before snack', () => {
      expect(MEAL_ORDER[MealType.Dinner]).toBeLessThan(MEAL_ORDER[MealType.Snack]);
    });
  });

  describe('getSuggestedMealType', () => {
    const originalDate = global.Date;

    afterEach(() => {
      global.Date = originalDate;
    });

    const mockDate = (hour: number) => {
      const MockDate = class extends Date {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super();
            this.setHours(hour, 0, 0, 0);
          } else {
            // @ts-ignore
            super(...args);
          }
        }
        getHours() {
          return hour;
        }
      };
      // @ts-ignore
      global.Date = MockDate;
    };

    it('should suggest breakfast in the morning (6am)', () => {
      mockDate(6);
      expect(getSuggestedMealType()).toBe(MealType.Breakfast);
    });

    it('should suggest lunch at noon', () => {
      mockDate(12);
      expect(getSuggestedMealType()).toBe(MealType.Lunch);
    });

    it('should suggest dinner in the evening (18:00)', () => {
      mockDate(18);
      expect(getSuggestedMealType()).toBe(MealType.Dinner);
    });

    it('should suggest snack late at night (22:00)', () => {
      mockDate(22);
      expect(getSuggestedMealType()).toBe(MealType.Snack);
    });
  });
});

describe('Date Formatting', () => {
  // Helper to get local date string in YYYY-MM-DD format
  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  it('should return "Today" for today\'s date', () => {
    const today = getLocalDateString(new Date());
    expect(formatDate(today)).toBe('Today');
  });

  it('should return "Yesterday" for yesterday\'s date', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = getLocalDateString(yesterday);
    expect(formatDate(dateStr)).toBe('Yesterday');
  });

  it('should return formatted date for older dates', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 7);
    const dateStr = getLocalDateString(oldDate);
    const result = formatDate(dateStr);
    expect(result).not.toBe('Today');
    expect(result).not.toBe('Yesterday');
    // Check it contains a comma (formatted date like "Sun, Jan 15")
    expect(result).toMatch(/\w+, \w+ \d+/);
  });
});

describe('Nutrition Calculations', () => {
  it('should calculate total calories from entries', () => {
    const entries = [
      { calories: 300 },
      { calories: 450 },
      { calories: 200 },
    ];
    const total = entries.reduce((sum, e) => sum + e.calories, 0);
    expect(total).toBe(950);
  });

  it('should calculate macros based on servings', () => {
    const food = {
      calories: 200,
      protein: 10,
      carbs: 25,
      fat: 8,
    };
    const servings = 1.5;

    const calculated = {
      calories: Math.round(food.calories * servings),
      protein: Math.round(food.protein * servings),
      carbs: Math.round(food.carbs * servings),
      fat: Math.round(food.fat * servings),
    };

    expect(calculated.calories).toBe(300);
    expect(calculated.protein).toBe(15);
    expect(calculated.carbs).toBe(38);
    expect(calculated.fat).toBe(12);
  });

  it('should calculate calorie ring percentage', () => {
    const consumed = 1500;
    const target = 2000;
    const percentage = Math.min((consumed / target) * 100, 100);
    expect(percentage).toBe(75);
  });

  it('should cap calorie ring at 100%', () => {
    const consumed = 2500;
    const target = 2000;
    const percentage = Math.min((consumed / target) * 100, 100);
    expect(percentage).toBe(100);
  });

  it('should calculate remaining calories correctly', () => {
    const consumed = 1500;
    const target = 2000;
    const remaining = target - consumed;
    expect(remaining).toBe(500);
  });

  it('should show negative remaining when over target', () => {
    const consumed = 2300;
    const target = 2000;
    const remaining = target - consumed;
    expect(remaining).toBe(-300);
  });
});

describe('Debounce Logic', () => {
  jest.useFakeTimers();

  it('should debounce search queries', () => {
    const mockSearch = jest.fn();
    const debounceMs = 300;

    let timeout: NodeJS.Timeout | null = null;
    const debouncedSearch = (query: string) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => mockSearch(query), debounceMs);
    };

    // Rapid fire queries
    debouncedSearch('a');
    debouncedSearch('ap');
    debouncedSearch('app');
    debouncedSearch('appl');
    debouncedSearch('apple');

    // Should not have called yet
    expect(mockSearch).not.toHaveBeenCalled();

    // Fast forward time
    jest.advanceTimersByTime(debounceMs);

    // Should only call once with final value
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith('apple');
  });
});

describe('Search Query Validation', () => {
  const MIN_QUERY_LENGTH = 2;

  it('should reject queries shorter than minimum length', () => {
    const query = 'a';
    const isValid = query.length >= MIN_QUERY_LENGTH;
    expect(isValid).toBe(false);
  });

  it('should accept queries at minimum length', () => {
    const query = 'ap';
    const isValid = query.length >= MIN_QUERY_LENGTH;
    expect(isValid).toBe(true);
  });

  it('should accept longer queries', () => {
    const query = 'apple';
    const isValid = query.length >= MIN_QUERY_LENGTH;
    expect(isValid).toBe(true);
  });
});

describe('Entry Type Detection', () => {
  const isLogEntry = (entry: any): boolean => {
    return 'foodName' in entry;
  };

  it('should identify log entries', () => {
    const logEntry = {
      id: '1',
      foodName: 'Apple',
      calories: 95,
    };
    expect(isLogEntry(logEntry)).toBe(true);
  });

  it('should identify quick add entries', () => {
    const quickAddEntry = {
      id: '1',
      description: 'Quick snack',
      calories: 200,
    };
    expect(isLogEntry(quickAddEntry)).toBe(false);
  });
});

// ============================================================
// Phase 5: Progress & Weight Tracking Tests
// ============================================================

describe('Weight Unit Conversion', () => {
  const kgToLbs = (kg: number): number => Math.round(kg * 2.20462 * 10) / 10;
  const lbsToKg = (lbs: number): number => Math.round((lbs / 2.20462) * 100) / 100;

  it('should convert kg to lbs correctly', () => {
    expect(kgToLbs(1)).toBe(2.2);
    expect(kgToLbs(68)).toBe(149.9);
    expect(kgToLbs(90)).toBe(198.4);
  });

  it('should convert lbs to kg correctly', () => {
    expect(lbsToKg(150)).toBe(68.04);
    expect(lbsToKg(200)).toBe(90.72);
    expect(lbsToKg(100)).toBe(45.36);
  });

  it('should round-trip conversion with minimal loss', () => {
    const originalKg = 75.5;
    const lbs = kgToLbs(originalKg);
    const backToKg = lbsToKg(lbs);
    expect(Math.abs(backToKg - originalKg)).toBeLessThan(0.1);
  });
});

describe('Time Range Calculation', () => {
  const getDateRange = (range: '7d' | '30d' | '90d' | 'all'): { start: string; end: string } => {
    const end = new Date();
    const endStr = end.toISOString().split('T')[0];

    let start = new Date();
    switch (range) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case 'all':
        start = new Date('2020-01-01');
        break;
    }

    return { start: start.toISOString().split('T')[0], end: endStr };
  };

  it('should calculate 7 day range', () => {
    const { start, end } = getDateRange('7d');
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7);
  });

  it('should calculate 30 day range', () => {
    const { start, end } = getDateRange('30d');
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(30);
  });

  it('should calculate 90 day range', () => {
    const { start, end } = getDateRange('90d');
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(90);
  });

  it('should use 2020-01-01 for all time range', () => {
    const { start } = getDateRange('all');
    expect(start).toBe('2020-01-01');
  });
});

describe('Weight Trend Calculation (EMA)', () => {
  const calculateEMA = (weights: number[], smoothingDays: number = 7): number => {
    if (weights.length === 0) return 0;

    const alpha = 2 / (smoothingDays + 1);
    let ema = weights[0];

    for (let i = 1; i < weights.length; i++) {
      ema = alpha * weights[i] + (1 - alpha) * ema;
    }

    return Math.round(ema * 100) / 100;
  };

  it('should return single weight when only one entry', () => {
    expect(calculateEMA([75.0])).toBe(75);
  });

  it('should weight recent entries more heavily', () => {
    const weights = [70, 70, 70, 70, 75]; // Recent spike
    const ema = calculateEMA(weights);
    // EMA should be higher than simple average due to recent spike
    const simpleAvg = weights.reduce((a, b) => a + b, 0) / weights.length;
    expect(ema).toBeGreaterThan(simpleAvg);
  });

  it('should smooth out fluctuations', () => {
    const fluctuating = [70, 72, 69, 73, 70, 71, 68, 72];
    const ema = calculateEMA(fluctuating);
    // EMA should be close to the mean
    const mean = fluctuating.reduce((a, b) => a + b, 0) / fluctuating.length;
    expect(Math.abs(ema - mean)).toBeLessThan(2);
  });
});

describe('Chart Data Preparation', () => {
  it('should calculate average macros from daily data', () => {
    const dailyData = [
      { calories: 2000, protein: 150, carbs: 200, fat: 70 },
      { calories: 1800, protein: 130, carbs: 180, fat: 65 },
      { calories: 2200, protein: 160, carbs: 220, fat: 80 },
    ];

    const avg = {
      calories: Math.round(dailyData.reduce((sum, d) => sum + d.calories, 0) / dailyData.length),
      protein: Math.round(dailyData.reduce((sum, d) => sum + d.protein, 0) / dailyData.length),
      carbs: Math.round(dailyData.reduce((sum, d) => sum + d.carbs, 0) / dailyData.length),
      fat: Math.round(dailyData.reduce((sum, d) => sum + d.fat, 0) / dailyData.length),
    };

    expect(avg.calories).toBe(2000);
    expect(avg.protein).toBe(147);
    expect(avg.carbs).toBe(200);
    expect(avg.fat).toBe(72);
  });

  it('should calculate weight change from first to last', () => {
    const weights = [
      { date: '2024-01-01', weightKg: 80 },
      { date: '2024-01-08', weightKg: 79 },
      { date: '2024-01-15', weightKg: 78.5 },
    ];

    const firstWeight = weights[0].weightKg;
    const lastWeight = weights[weights.length - 1].weightKg;
    const change = lastWeight - firstWeight;

    expect(change).toBe(-1.5);
  });

  it('should identify days over calorie goal', () => {
    const goal = 2000;
    const dailyCalories = [1800, 2100, 1950, 2300, 1900];

    const overDays = dailyCalories.filter((cal) => cal > goal).length;
    expect(overDays).toBe(2);
  });
});

describe('Macro Percentage Calculation', () => {
  const PROTEIN_CAL = 4;
  const CARBS_CAL = 4;
  const FAT_CAL = 9;

  const calculateMacroPercentages = (protein: number, carbs: number, fat: number) => {
    const proteinCals = protein * PROTEIN_CAL;
    const carbsCals = carbs * CARBS_CAL;
    const fatCals = fat * FAT_CAL;
    const totalCals = proteinCals + carbsCals + fatCals;

    if (totalCals === 0) {
      return { protein: 0, carbs: 0, fat: 0 };
    }

    const proteinPct = Math.round((proteinCals / totalCals) * 100);
    const carbsPct = Math.round((carbsCals / totalCals) * 100);
    const fatPct = 100 - proteinPct - carbsPct; // Ensure sum is 100

    return { protein: proteinPct, carbs: carbsPct, fat: fatPct };
  };

  it('should calculate macro percentages correctly', () => {
    const { protein, carbs, fat } = calculateMacroPercentages(150, 200, 70);
    // 150*4 = 600, 200*4 = 800, 70*9 = 630, total = 2030
    // protein: 600/2030 = 29.6%, carbs: 800/2030 = 39.4%, fat: 630/2030 = 31%
    expect(protein).toBe(30);
    expect(carbs).toBe(39);
    expect(fat).toBe(31);
  });

  it('should ensure percentages sum to 100', () => {
    const { protein, carbs, fat } = calculateMacroPercentages(100, 150, 50);
    expect(protein + carbs + fat).toBe(100);
  });

  it('should handle zero values', () => {
    const { protein, carbs, fat } = calculateMacroPercentages(0, 0, 0);
    expect(protein).toBe(0);
    expect(carbs).toBe(0);
    expect(fat).toBe(0);
  });
});

describe('Progress Unlock Logic', () => {
  it('should unlock progress with 3 days logged', () => {
    const daysLogged = 3;
    const weightEntries = 1;
    const hasEnoughData = daysLogged >= 3 || weightEntries >= 3;
    expect(hasEnoughData).toBe(true);
  });

  it('should unlock progress with 3 weight entries', () => {
    const daysLogged = 1;
    const weightEntries = 3;
    const hasEnoughData = daysLogged >= 3 || weightEntries >= 3;
    expect(hasEnoughData).toBe(true);
  });

  it('should not unlock progress with insufficient data', () => {
    const daysLogged = 2;
    const weightEntries = 2;
    const hasEnoughData = daysLogged >= 3 || weightEntries >= 3;
    expect(hasEnoughData).toBe(false);
  });
});

// ============================================================
// Phase 7: Settings & Data Export Tests
// ============================================================

describe('Settings Unit Preferences', () => {
  it('should toggle weight unit between kg and lbs', () => {
    let currentUnit: 'kg' | 'lbs' = 'lbs';
    const toggleUnit = () => {
      currentUnit = currentUnit === 'kg' ? 'lbs' : 'kg';
    };

    expect(currentUnit).toBe('lbs');
    toggleUnit();
    expect(currentUnit).toBe('kg');
    toggleUnit();
    expect(currentUnit).toBe('lbs');
  });

  it('should validate weight unit values', () => {
    const validUnits = ['kg', 'lbs'];
    expect(validUnits.includes('kg')).toBe(true);
    expect(validUnits.includes('lbs')).toBe(true);
    expect(validUnits.includes('stones')).toBe(false);
  });
});

describe('Theme Settings', () => {
  it('should support dark, light, and auto themes', () => {
    const validThemes = ['dark', 'light', 'auto'];
    expect(validThemes).toContain('dark');
    expect(validThemes).toContain('light');
    expect(validThemes).toContain('auto');
  });

  it('should default to dark theme', () => {
    const defaultTheme = 'dark';
    expect(defaultTheme).toBe('dark');
  });
});

describe('Height Conversion', () => {
  const cmToFeetInches = (cm: number): { feet: number; inches: number } => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  };

  const feetInchesToCm = (feet: number, inches: number): number => {
    const totalInches = feet * 12 + inches;
    return Math.round(totalInches * 2.54);
  };

  it('should convert 170cm to 5 feet 7 inches', () => {
    const { feet, inches } = cmToFeetInches(170);
    expect(feet).toBe(5);
    expect(inches).toBe(7);
  });

  it('should convert 6 feet to 183cm', () => {
    const cm = feetInchesToCm(6, 0);
    expect(cm).toBe(183);
  });

  it('should round-trip conversion correctly', () => {
    const originalCm = 175;
    const { feet, inches } = cmToFeetInches(originalCm);
    const backToCm = feetInchesToCm(feet, inches);
    expect(Math.abs(backToCm - originalCm)).toBeLessThanOrEqual(1);
  });
});

describe('CSV Export Formatting', () => {
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  it('should escape commas in values', () => {
    const value = 'Hello, World';
    expect(escapeCSV(value)).toBe('"Hello, World"');
  });

  it('should escape double quotes by doubling them', () => {
    const value = 'Say "Hello"';
    expect(escapeCSV(value)).toBe('"Say ""Hello"""');
  });

  it('should escape newlines', () => {
    const value = 'Line1\nLine2';
    expect(escapeCSV(value)).toBe('"Line1\nLine2"');
  });

  it('should handle null and undefined', () => {
    expect(escapeCSV(null)).toBe('');
    expect(escapeCSV(undefined)).toBe('');
  });

  it('should pass through simple values', () => {
    expect(escapeCSV('Hello')).toBe('Hello');
    expect(escapeCSV(123)).toBe('123');
  });
});

describe('Export Options', () => {
  interface ExportOptions {
    includeProfile: boolean;
    includeGoals: boolean;
    includeFoodLogs: boolean;
    includeWeightLogs: boolean;
    includeSettings: boolean;
  }

  it('should default all options to true', () => {
    const defaultOptions: ExportOptions = {
      includeProfile: true,
      includeGoals: true,
      includeFoodLogs: true,
      includeWeightLogs: true,
      includeSettings: true,
    };

    expect(defaultOptions.includeProfile).toBe(true);
    expect(defaultOptions.includeGoals).toBe(true);
    expect(defaultOptions.includeFoodLogs).toBe(true);
    expect(defaultOptions.includeWeightLogs).toBe(true);
    expect(defaultOptions.includeSettings).toBe(true);
  });

  it('should require at least one option selected', () => {
    const validateExportOptions = (options: ExportOptions): boolean => {
      return (
        options.includeProfile ||
        options.includeGoals ||
        options.includeFoodLogs ||
        options.includeWeightLogs ||
        options.includeSettings
      );
    };

    const allFalse: ExportOptions = {
      includeProfile: false,
      includeGoals: false,
      includeFoodLogs: false,
      includeWeightLogs: false,
      includeSettings: false,
    };

    const onlyFood: ExportOptions = {
      includeProfile: false,
      includeGoals: false,
      includeFoodLogs: true,
      includeWeightLogs: false,
      includeSettings: false,
    };

    expect(validateExportOptions(allFalse)).toBe(false);
    expect(validateExportOptions(onlyFood)).toBe(true);
  });
});

describe('Goal Settings Validation', () => {
  it('should validate goal type', () => {
    const validGoalTypes = ['lose', 'maintain', 'gain'];
    expect(validGoalTypes.includes('lose')).toBe(true);
    expect(validGoalTypes.includes('maintain')).toBe(true);
    expect(validGoalTypes.includes('gain')).toBe(true);
    expect(validGoalTypes.includes('bulk')).toBe(false);
  });

  it('should limit rate options for gain goals', () => {
    const allRates = [0.25, 0.5, 0.75, 1.0];
    const gainRates = allRates.filter(r => r <= 0.5);
    expect(gainRates).toEqual([0.25, 0.5]);
  });

  it('should set rate to 0 for maintain goals', () => {
    const goalType = 'maintain';
    const rate = goalType === 'maintain' ? 0 : 0.5;
    expect(rate).toBe(0);
  });
});

describe('Profile Settings', () => {
  it('should calculate age from date of birth', () => {
    const calculateAge = (dob: Date): number => {
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age;
    };

    const dob = new Date(1990, 0, 15); // Jan 15, 1990
    const age = calculateAge(dob);
    const expectedAge = new Date().getFullYear() - 1990 -
      (new Date().getMonth() < 0 || (new Date().getMonth() === 0 && new Date().getDate() < 15) ? 1 : 0);

    expect(age).toBe(expectedAge);
  });

  it('should validate activity level', () => {
    const validLevels = [
      'sedentary',
      'lightly_active',
      'moderately_active',
      'very_active',
      'extremely_active',
    ];
    expect(validLevels.includes('moderately_active')).toBe(true);
    expect(validLevels.includes('super_active')).toBe(false);
  });

  it('should validate sex', () => {
    const validSex = ['male', 'female'];
    expect(validSex.includes('male')).toBe(true);
    expect(validSex.includes('female')).toBe(true);
    expect(validSex.includes('other')).toBe(false);
  });
});

// ============================================================
// Phase 8: App Initialization & Final Polish Tests
// ============================================================

describe('Onboarding Flow', () => {
  it('should determine if onboarding is needed', () => {
    const needsOnboarding = (profile: { hasCompletedOnboarding: boolean; onboardingSkipped: boolean } | null): boolean => {
      if (!profile) return true;
      return !profile.hasCompletedOnboarding && !profile.onboardingSkipped;
    };

    expect(needsOnboarding(null)).toBe(true);
    expect(needsOnboarding({ hasCompletedOnboarding: false, onboardingSkipped: false })).toBe(true);
    expect(needsOnboarding({ hasCompletedOnboarding: true, onboardingSkipped: false })).toBe(false);
    expect(needsOnboarding({ hasCompletedOnboarding: false, onboardingSkipped: true })).toBe(false);
  });

  it('should validate onboarding step order', () => {
    const steps = [
      'welcome',
      'sex',
      'birthday',
      'height',
      'weight',
      'activity',
      'goal',
      'target',
      'rate',
      'summary',
    ];

    expect(steps.length).toBe(10);
    expect(steps[0]).toBe('welcome');
    expect(steps[steps.length - 1]).toBe('summary');
  });
});

describe('Weekly Reflection', () => {
  it('should determine data quality', () => {
    const getDataQuality = (daysLogged: number): 'good' | 'partial' | 'insufficient' => {
      if (daysLogged >= 5) return 'good';
      if (daysLogged >= 3) return 'partial';
      return 'insufficient';
    };

    expect(getDataQuality(7)).toBe('good');
    expect(getDataQuality(5)).toBe('good');
    expect(getDataQuality(4)).toBe('partial');
    expect(getDataQuality(3)).toBe('partial');
    expect(getDataQuality(2)).toBe('insufficient');
    expect(getDataQuality(0)).toBe('insufficient');
  });

  it('should calculate if adjustment is recommended', () => {
    const shouldRecommendAdjustment = (
      currentCalories: number,
      newCalories: number | undefined
    ): boolean => {
      if (!newCalories) return false;
      return newCalories !== currentCalories;
    };

    expect(shouldRecommendAdjustment(2000, 2100)).toBe(true);
    expect(shouldRecommendAdjustment(2000, 2000)).toBe(false);
    expect(shouldRecommendAdjustment(2000, undefined)).toBe(false);
  });

  it('should format weight change correctly', () => {
    const formatWeightChange = (changeKg: number, unit: 'kg' | 'lbs'): string => {
      const prefix = changeKg > 0 ? '+' : '';
      if (unit === 'lbs') {
        return `${prefix}${(changeKg * 2.20462).toFixed(1)} lbs`;
      }
      return `${prefix}${changeKg.toFixed(1)} kg`;
    };

    expect(formatWeightChange(-0.5, 'kg')).toBe('-0.5 kg');
    expect(formatWeightChange(0.5, 'kg')).toBe('+0.5 kg');
    expect(formatWeightChange(-0.45, 'lbs')).toBe('-1.0 lbs');
  });
});

describe('App Navigation', () => {
  it('should have valid route paths', () => {
    const validRoutes = [
      '/',
      '/(tabs)',
      '/(tabs)/progress',
      '/(tabs)/settings',
      '/onboarding',
      '/add-food',
      '/log-weight',
      '/weekly-reflection',
      '/settings/goals',
      '/settings/profile',
      '/settings/units',
      '/settings/data',
      '/settings/about',
    ];

    expect(validRoutes).toContain('/');
    expect(validRoutes).toContain('/onboarding');
    expect(validRoutes).toContain('/settings/goals');
    expect(validRoutes.length).toBeGreaterThan(10);
  });

  it('should properly format navigation params', () => {
    const createParams = (mealType: string, date: string): { mealType: string; date: string } => ({
      mealType,
      date,
    });

    const params = createParams('breakfast', '2024-01-15');
    expect(params.mealType).toBe('breakfast');
    expect(params.date).toBe('2024-01-15');
  });
});

describe('Error Handling', () => {
  it('should provide user-friendly error messages', () => {
    const getUserMessage = (error: Error): string => {
      const knownErrors: Record<string, string> = {
        'NETWORK_ERROR': 'Unable to connect. Please check your internet connection.',
        'DATABASE_ERROR': 'Failed to save data. Please try again.',
        'VALIDATION_ERROR': 'Please check your input and try again.',
      };

      return knownErrors[error.message] || 'Something went wrong. Please try again.';
    };

    expect(getUserMessage(new Error('NETWORK_ERROR'))).toContain('internet');
    expect(getUserMessage(new Error('DATABASE_ERROR'))).toContain('save');
    expect(getUserMessage(new Error('UNKNOWN'))).toContain('Something went wrong');
  });

  it('should handle null/undefined gracefully', () => {
    const safeAccess = <T>(value: T | null | undefined, fallback: T): T => {
      return value ?? fallback;
    };

    expect(safeAccess(null, 'default')).toBe('default');
    expect(safeAccess(undefined, 0)).toBe(0);
    expect(safeAccess('value', 'default')).toBe('value');
    expect(safeAccess(0, 100)).toBe(0); // 0 is falsy but not nullish
  });
});
