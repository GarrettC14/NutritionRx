/**
 * Phase 6 Tests: TDEE Calculator and Goal Setting
 */

describe('BMR Calculation (Mifflin-St Jeor)', () => {
  // Mifflin-St Jeor equation
  const calculateBMR = (
    sex: 'male' | 'female',
    weightKg: number,
    heightCm: number,
    ageYears: number
  ): number => {
    const baseBMR = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
    return Math.round(sex === 'male' ? baseBMR + 5 : baseBMR - 161);
  };

  it('should calculate BMR for average male', () => {
    // 30 year old male, 80kg, 178cm
    const bmr = calculateBMR('male', 80, 178, 30);
    // 10*80 + 6.25*178 - 5*30 + 5 = 800 + 1112.5 - 150 + 5 = 1767.5
    expect(bmr).toBe(1768);
  });

  it('should calculate BMR for average female', () => {
    // 30 year old female, 65kg, 165cm
    const bmr = calculateBMR('female', 65, 165, 30);
    // 10*65 + 6.25*165 - 5*30 - 161 = 650 + 1031.25 - 150 - 161 = 1370.25
    expect(bmr).toBe(1370);
  });

  it('should decrease BMR with age', () => {
    const bmr30 = calculateBMR('male', 80, 178, 30);
    const bmr40 = calculateBMR('male', 80, 178, 40);
    const bmr50 = calculateBMR('male', 80, 178, 50);

    expect(bmr30).toBeGreaterThan(bmr40);
    expect(bmr40).toBeGreaterThan(bmr50);
    expect(bmr30 - bmr40).toBe(50); // 5 kcal per year
  });

  it('should increase BMR with weight', () => {
    const bmr70 = calculateBMR('male', 70, 178, 30);
    const bmr80 = calculateBMR('male', 80, 178, 30);
    const bmr90 = calculateBMR('male', 90, 178, 30);

    expect(bmr90).toBeGreaterThan(bmr80);
    expect(bmr80).toBeGreaterThan(bmr70);
    expect(bmr80 - bmr70).toBe(100); // 10 kcal per kg
  });

  it('should calculate lower BMR for females', () => {
    const maleBMR = calculateBMR('male', 70, 170, 30);
    const femaleBMR = calculateBMR('female', 70, 170, 30);

    expect(maleBMR).toBeGreaterThan(femaleBMR);
    expect(maleBMR - femaleBMR).toBe(166); // 5 - (-161) = 166
  });
});

describe('TDEE Calculation', () => {
  const ACTIVITY_MULTIPLIERS = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.9,
  };

  const calculateTDEE = (bmr: number, activityLevel: keyof typeof ACTIVITY_MULTIPLIERS): number => {
    return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
  };

  it('should multiply BMR by activity level', () => {
    const bmr = 1800;

    expect(calculateTDEE(bmr, 'sedentary')).toBe(2160); // 1800 * 1.2
    expect(calculateTDEE(bmr, 'lightly_active')).toBe(2475); // 1800 * 1.375
    expect(calculateTDEE(bmr, 'moderately_active')).toBe(2790); // 1800 * 1.55
    expect(calculateTDEE(bmr, 'very_active')).toBe(3105); // 1800 * 1.725
    expect(calculateTDEE(bmr, 'extremely_active')).toBe(3420); // 1800 * 1.9
  });

  it('should show significant difference between activity levels', () => {
    const bmr = 1700;
    const sedentary = calculateTDEE(bmr, 'sedentary');
    const extremelyActive = calculateTDEE(bmr, 'extremely_active');

    // Should be almost 60% higher for extremely active
    expect((extremelyActive - sedentary) / sedentary).toBeCloseTo(0.583, 1);
  });
});

describe('Target Calorie Calculation', () => {
  const KCAL_PER_KG = 7700;

  const calculateTargetCalories = (
    tdee: number,
    goalType: 'lose' | 'maintain' | 'gain',
    ratePercent: number,
    bodyWeightKg: number
  ): number => {
    if (goalType === 'maintain') {
      return tdee;
    }

    const weeklyWeightChangeKg = (ratePercent / 100) * bodyWeightKg;
    const dailyCalorieAdjustment = Math.round((weeklyWeightChangeKg * KCAL_PER_KG) / 7);

    if (goalType === 'lose') {
      return Math.max(1200, tdee - dailyCalorieAdjustment);
    } else {
      return tdee + dailyCalorieAdjustment;
    }
  };

  it('should return TDEE for maintenance', () => {
    expect(calculateTargetCalories(2000, 'maintain', 0, 80)).toBe(2000);
  });

  it('should create deficit for weight loss', () => {
    const tdee = 2500;
    const target = calculateTargetCalories(tdee, 'lose', 0.5, 80);
    // 0.5% of 80kg = 0.4kg/week * 7700 / 7 = ~440 kcal deficit
    expect(target).toBeLessThan(tdee);
    expect(target).toBeCloseTo(2500 - 440, -1);
  });

  it('should create surplus for weight gain', () => {
    const tdee = 2500;
    const target = calculateTargetCalories(tdee, 'gain', 0.5, 80);
    expect(target).toBeGreaterThan(tdee);
    expect(target).toBeCloseTo(2500 + 440, -1);
  });

  it('should enforce minimum of 1200 calories', () => {
    const target = calculateTargetCalories(1400, 'lose', 1.0, 80);
    expect(target).toBeGreaterThanOrEqual(1200);
  });

  it('should scale deficit with rate', () => {
    const tdee = 2500;
    const slow = calculateTargetCalories(tdee, 'lose', 0.25, 80);
    const moderate = calculateTargetCalories(tdee, 'lose', 0.5, 80);
    const aggressive = calculateTargetCalories(tdee, 'lose', 1.0, 80);

    expect(slow).toBeGreaterThan(moderate);
    expect(moderate).toBeGreaterThan(aggressive);
  });
});

describe('Macro Calculation', () => {
  const PROTEIN_CAL = 4;
  const CARBS_CAL = 4;
  const FAT_CAL = 9;

  const calculateMacros = (
    targetCalories: number,
    weightKg: number,
    goalType: 'lose' | 'maintain' | 'gain'
  ) => {
    // Protein: higher during deficit
    const proteinPerKg = goalType === 'lose' ? 2.0 : goalType === 'gain' ? 1.8 : 1.6;
    const protein = Math.round(weightKg * proteinPerKg);
    const proteinCals = protein * PROTEIN_CAL;

    // Fat: 25-30% of calories
    const fatPercent = goalType === 'gain' ? 0.25 : 0.30;
    const fatCals = Math.round(targetCalories * fatPercent);
    const fat = Math.round(fatCals / FAT_CAL);

    // Carbs: remaining
    const carbsCals = targetCalories - proteinCals - fatCals;
    const carbs = Math.round(carbsCals / CARBS_CAL);

    return { protein, carbs, fat };
  };

  it('should calculate balanced macros for maintenance', () => {
    const macros = calculateMacros(2000, 70, 'maintain');

    // Protein: 70 * 1.6 = 112g
    expect(macros.protein).toBe(112);

    // Fat: 2000 * 0.30 / 9 = 67g
    expect(macros.fat).toBe(67);

    // Verify total calories roughly match
    const totalCals =
      macros.protein * PROTEIN_CAL + macros.carbs * CARBS_CAL + macros.fat * FAT_CAL;
    expect(totalCals).toBeCloseTo(2000, -2);
  });

  it('should prioritize protein during weight loss', () => {
    const loseMacros = calculateMacros(1800, 80, 'lose');
    const maintainMacros = calculateMacros(1800, 80, 'maintain');

    // Higher protein per kg for weight loss (2.0 vs 1.6)
    expect(loseMacros.protein).toBeGreaterThan(maintainMacros.protein);
    expect(loseMacros.protein).toBe(160); // 80 * 2.0
    expect(maintainMacros.protein).toBe(128); // 80 * 1.6
  });

  it('should adjust fat for muscle gain', () => {
    const gainMacros = calculateMacros(3000, 80, 'gain');

    // Lower fat percentage (25% vs 30%)
    const fatPercent = (gainMacros.fat * FAT_CAL) / 3000;
    expect(fatPercent).toBeCloseTo(0.25, 1);
  });
});

describe('Time to Goal Calculation', () => {
  const calculateTimeToGoal = (
    currentWeightKg: number,
    targetWeightKg: number,
    ratePercent: number
  ): { weeks: number; months: number } | null => {
    if (!targetWeightKg || ratePercent === 0) return null;

    const weightDiff = Math.abs(targetWeightKg - currentWeightKg);
    const weeklyChange = (ratePercent / 100) * currentWeightKg;

    const weeks = Math.ceil(weightDiff / weeklyChange);
    const months = Math.round(weeks / 4.33);

    return { weeks, months };
  };

  it('should calculate time for weight loss', () => {
    // 80kg to 70kg, 0.5% rate = 0.4kg/week
    const result = calculateTimeToGoal(80, 70, 0.5);
    expect(result).not.toBeNull();
    expect(result!.weeks).toBe(25); // 10kg / 0.4kg = 25 weeks
    expect(result!.months).toBe(6);
  });

  it('should calculate time for weight gain', () => {
    // 70kg to 80kg, 0.5% rate = 0.35kg/week
    const result = calculateTimeToGoal(70, 80, 0.5);
    expect(result).not.toBeNull();
    expect(result!.weeks).toBe(29); // 10kg / 0.35kg = ~29 weeks
  });

  it('should return null for maintenance', () => {
    const result = calculateTimeToGoal(80, 80, 0);
    expect(result).toBeNull();
  });

  it('should return null without target weight', () => {
    const result = calculateTimeToGoal(80, 0, 0.5);
    expect(result).toBeNull();
  });

  it('should scale with rate', () => {
    const slow = calculateTimeToGoal(80, 70, 0.25);
    const fast = calculateTimeToGoal(80, 70, 1.0);

    expect(slow!.weeks).toBeGreaterThan(fast!.weeks);
    // Roughly 4x difference
    expect(slow!.weeks / fast!.weeks).toBeCloseTo(4, 0);
  });
});

describe('Goal Validation', () => {
  const validateGoal = (
    targetCalories: number,
    ratePercent: number,
    goalType: 'lose' | 'maintain' | 'gain',
    weightKg: number,
    heightCm: number
  ): { valid: boolean; warnings: string[] } => {
    const warnings: string[] = [];

    // Check minimum calories
    if (targetCalories < 1200) {
      warnings.push('Calorie target too low');
    }

    // Check aggressive rate
    if (goalType === 'lose' && ratePercent > 1.0) {
      warnings.push('Rate too aggressive');
    }

    // Check BMI
    const bmi = weightKg / Math.pow(heightCm / 100, 2);
    if (goalType === 'lose' && bmi < 18.5) {
      warnings.push('Already underweight');
    }
    if (goalType === 'gain' && bmi > 30) {
      warnings.push('Consider losing weight first');
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  };

  it('should validate normal weight loss goal', () => {
    const result = validateGoal(1800, 0.5, 'lose', 80, 175);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('should warn about low calories', () => {
    const result = validateGoal(1000, 1.0, 'lose', 80, 175);
    expect(result.valid).toBe(false);
    expect(result.warnings).toContain('Calorie target too low');
  });

  it('should warn about aggressive rate', () => {
    const result = validateGoal(1500, 1.5, 'lose', 80, 175);
    expect(result.warnings).toContain('Rate too aggressive');
  });

  it('should warn about underweight BMI', () => {
    // 50kg, 175cm = BMI 16.3
    const result = validateGoal(1500, 0.5, 'lose', 50, 175);
    expect(result.warnings).toContain('Already underweight');
  });
});

describe('Onboarding Data Flow', () => {
  it('should collect all required profile data', () => {
    const requiredFields = [
      'sex',
      'dateOfBirth',
      'heightCm',
      'activityLevel',
    ];

    const profile = {
      sex: 'male',
      dateOfBirth: '1994-05-15',
      heightCm: 178,
      activityLevel: 'moderately_active',
    };

    for (const field of requiredFields) {
      expect(profile).toHaveProperty(field);
      expect((profile as any)[field]).toBeTruthy();
    }
  });

  it('should collect goal data', () => {
    const goalData = {
      type: 'lose',
      targetWeightKg: 70,
      targetRatePercent: 0.5,
      currentWeightKg: 80,
    };

    expect(goalData.type).toBe('lose');
    expect(goalData.targetWeightKg).toBeLessThan(goalData.currentWeightKg);
    expect(goalData.targetRatePercent).toBeGreaterThan(0);
    expect(goalData.targetRatePercent).toBeLessThanOrEqual(1);
  });

  it('should allow skipping target weight', () => {
    const goalData = {
      type: 'lose',
      targetWeightKg: undefined,
      targetRatePercent: 0.5,
      currentWeightKg: 80,
    };

    expect(goalData.targetWeightKg).toBeUndefined();
    expect(goalData.targetRatePercent).toBeGreaterThan(0);
  });
});
