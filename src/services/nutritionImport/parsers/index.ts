import { ImportSource } from '@/types/nutritionImport';
import { NutritionCSVParser } from './types';
import { MyFitnessPalParser } from './myfitnesspal';
import { CronometerParser } from './cronometer';
import { LoseItParser } from './loseit';
import { MacroFactorParser } from './macrofactor';
import { NutritionRxParser, parseNutritionRxJSON, isNutritionRxJSON } from './nutritionrx';

export { NutritionCSVParser, parserUtils } from './types';
export { MyFitnessPalParser } from './myfitnesspal';
export { CronometerParser } from './cronometer';
export { LoseItParser } from './loseit';
export { MacroFactorParser } from './macrofactor';
export { NutritionRxParser, parseNutritionRxJSON, isNutritionRxJSON } from './nutritionrx';

/**
 * All available parsers
 */
const parsers: { source: ImportSource; parser: NutritionCSVParser }[] = [
  { source: 'myfitnesspal', parser: new MyFitnessPalParser() },
  { source: 'cronometer', parser: new CronometerParser() },
  { source: 'loseit', parser: new LoseItParser() },
  { source: 'macrofactor', parser: new MacroFactorParser() },
  { source: 'nutritionrx', parser: new NutritionRxParser() },
];

/**
 * Detect which parser can handle the given CSV headers
 */
export function detectParser(headers: string[]): { source: ImportSource; parser: NutritionCSVParser } | null {
  for (const { source, parser } of parsers) {
    if (parser.detect(headers)) {
      return { source, parser };
    }
  }
  return null;
}

/**
 * Get a specific parser by source
 */
export function getParser(source: ImportSource): NutritionCSVParser | null {
  const found = parsers.find((p) => p.source === source);
  return found?.parser ?? null;
}
