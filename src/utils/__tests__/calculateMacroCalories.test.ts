import {
  calculateMacroCalories,
  getCalorieDelta,
} from '../calculateMacroCalories';

describe('calculateMacroCalories', () => {
  it('uses basic 4-4-9 formula when fiber and alcohol are omitted', () => {
    // protein=100, carbs=200, fat=50
    // 100*4 + 200*4 + 50*9 = 400 + 800 + 450 = 1650
    expect(calculateMacroCalories(100, 200, 50)).toBe(1650);
  });

  it('accounts for fiber (Atwater 2 cal/g) and subtracts fiber from carbs', () => {
    // protein=50, carbs=100, fat=30, fiber=10
    // safeFiber=10, netCarbs=100-10=90
    // 50*4 + 90*4 + 10*2 + 30*9 = 200 + 360 + 20 + 270 = 850
    expect(calculateMacroCalories(50, 100, 30, 10)).toBe(850);
  });

  it('accounts for alcohol at 7 cal/g', () => {
    // protein=0, carbs=0, fat=0, fiber=0, alcohol=14
    // 0 + 0 + 0 + 0 + 14*7 = 98
    expect(calculateMacroCalories(0, 0, 0, 0, 14)).toBe(98);
  });

  it('returns 0 when all inputs are zero', () => {
    expect(calculateMacroCalories(0, 0, 0, 0, 0)).toBe(0);
  });

  it('returns 0 when called with zeros and defaults', () => {
    expect(calculateMacroCalories(0, 0, 0)).toBe(0);
  });

  it('clamps negative fiber to 0', () => {
    // protein=50, carbs=100, fat=30, fiber=-5
    // safeFiber=max(0,-5)=0, netCarbs=max(0,100-0)=100
    // 50*4 + 100*4 + 0*2 + 30*9 = 200 + 400 + 0 + 270 = 870
    expect(calculateMacroCalories(50, 100, 30, -5)).toBe(870);
  });

  it('clamps netCarbs to 0 when fiber exceeds carbs', () => {
    // protein=5, carbs=5, fat=0, fiber=10
    // safeFiber=10, netCarbs=max(0,5-10)=0
    // 5*4 + 0*4 + 10*2 + 0*9 = 20 + 0 + 20 + 0 = 40
    expect(calculateMacroCalories(5, 5, 0, 10)).toBe(40);
  });

  it('applies Math.round to the result', () => {
    // protein=1, carbs=1, fat=1, fiber=0, alcohol=1
    // 1*4 + 1*4 + 0*2 + 1*9 + 1*7 = 4 + 4 + 0 + 9 + 7 = 24 (exact)
    expect(calculateMacroCalories(1, 1, 1, 0, 1)).toBe(24);

    // Construct a case that produces a fractional value:
    // protein=1, carbs=0, fat=0, fiber=0, alcohol=0 = 4 (exact int)
    // Better: use fiber to create an odd subtraction
    // protein=0, carbs=3, fat=0, fiber=1, alcohol=0
    // netCarbs=2, fiberCal=2 => 0 + 2*4 + 2 + 0 + 0 = 10 (still int)
    // The formula with integers always produces integers since all Atwater
    // factors are integers. The Math.round is a safeguard for floating-point,
    // so let's verify with a fractional input:
    // protein=1.3, carbs=2.7, fat=0.1
    // 1.3*4 + 2.7*4 + 0.1*9 = 5.2 + 10.8 + 0.9 = 16.9 => round => 17
    expect(calculateMacroCalories(1.3, 2.7, 0.1)).toBe(17);
  });

  it('rounds down for values just below .5', () => {
    // protein=1.1, carbs=0, fat=0 => 1.1*4 = 4.4 => round => 4
    expect(calculateMacroCalories(1.1, 0, 0)).toBe(4);
  });

  it('rounds up for values at .5', () => {
    // Need result exactly at .5
    // protein=0, carbs=0, fat=0, fiber=0, alcohol=0.5
    // 0.5*7 = 3.5 => Math.round(3.5) = 4
    expect(calculateMacroCalories(0, 0, 0, 0, 0.5)).toBe(4);
  });

  it('combines protein, carbs, fat, fiber, and alcohol together', () => {
    // protein=30, carbs=50, fat=20, fiber=5, alcohol=10
    // safeFiber=5, netCarbs=50-5=45
    // 30*4 + 45*4 + 5*2 + 20*9 + 10*7 = 120 + 180 + 10 + 180 + 70 = 560
    expect(calculateMacroCalories(30, 50, 20, 5, 10)).toBe(560);
  });
});

describe('getCalorieDelta', () => {
  it('returns positive delta when macro-calculated exceeds label', () => {
    // macros: protein=100, carbs=200, fat=50 => 1650
    // label: 1500
    // delta: 1650 - 1500 = 150
    expect(getCalorieDelta(1500, 100, 200, 50)).toBe(150);
  });

  it('returns negative delta when label exceeds macro-calculated', () => {
    // macros: protein=100, carbs=200, fat=50 => 1650
    // label: 1800
    // delta: 1650 - 1800 = -150
    expect(getCalorieDelta(1800, 100, 200, 50)).toBe(-150);
  });

  it('returns zero when label matches macro-calculated exactly', () => {
    // macros: protein=100, carbs=200, fat=50 => 1650
    // label: 1650
    expect(getCalorieDelta(1650, 100, 200, 50)).toBe(0);
  });

  it('accounts for fiber in the delta calculation', () => {
    // macros: protein=50, carbs=100, fat=30, fiber=10 => 850
    // label: 800
    // delta: 850 - 800 = 50
    expect(getCalorieDelta(800, 50, 100, 30, 10)).toBe(50);
  });

  it('uses fiber=0 by default', () => {
    // Without fiber: protein=50, carbs=100, fat=30 => 50*4+100*4+30*9 = 200+400+270 = 870
    // With fiber=0 explicitly should match
    expect(getCalorieDelta(870, 50, 100, 30)).toBe(0);
    expect(getCalorieDelta(870, 50, 100, 30, 0)).toBe(0);
  });
});
