import { detectParser, getParser } from '@/services/nutritionImport/parsers';
import { MyFitnessPalParser } from '@/services/nutritionImport/parsers/myfitnesspal';
import { CronometerParser } from '@/services/nutritionImport/parsers/cronometer';
import { LoseItParser } from '@/services/nutritionImport/parsers/loseit';

describe('Parser Detection', () => {
  describe('detectParser', () => {
    it('should detect MyFitnessPal format', () => {
      const headers = ['Date', 'Meal', 'Calories', 'Fat (g)', 'Protein (g)', 'Carbohydrates (g)'];
      const result = detectParser(headers);
      expect(result).not.toBeNull();
      expect(result!.source).toBe('myfitnesspal');
      expect(result!.parser).toBeInstanceOf(MyFitnessPalParser);
    });

    it('should detect Cronometer format', () => {
      const headers = ['Day', 'Group', 'Food Name', 'Amount', 'Energy (kcal)', 'Protein (g)'];
      const result = detectParser(headers);
      expect(result).not.toBeNull();
      expect(result!.source).toBe('cronometer');
      expect(result!.parser).toBeInstanceOf(CronometerParser);
    });

    it('should detect Lose It! format', () => {
      const headers = ['Date', 'Name', 'Type', 'Quantity', 'Calories', 'Fat (g)'];
      const result = detectParser(headers);
      expect(result).not.toBeNull();
      expect(result!.source).toBe('loseit');
      expect(result!.parser).toBeInstanceOf(LoseItParser);
    });

    it('should return null for unrecognized format', () => {
      const headers = ['Random', 'Headers', 'That', 'Dont', 'Match'];
      const result = detectParser(headers);
      expect(result).toBeNull();
    });

    it('should return null for empty headers', () => {
      const result = detectParser([]);
      expect(result).toBeNull();
    });

    it('should prioritize MFP over Lose It! when both could match', () => {
      // MFP has Date, Meal, Calories - Lose It! has Date, Name, Type
      // A file with just Date, Meal, Calories should be detected as MFP
      const headers = ['Date', 'Meal', 'Calories'];
      const result = detectParser(headers);
      expect(result).not.toBeNull();
      expect(result!.source).toBe('myfitnesspal');
    });
  });

  describe('getParser', () => {
    it('should return MyFitnessPalParser for myfitnesspal source', () => {
      const parser = getParser('myfitnesspal');
      expect(parser).not.toBeNull();
      expect(parser).toBeInstanceOf(MyFitnessPalParser);
    });

    it('should return CronometerParser for cronometer source', () => {
      const parser = getParser('cronometer');
      expect(parser).not.toBeNull();
      expect(parser).toBeInstanceOf(CronometerParser);
    });

    it('should return LoseItParser for loseit source', () => {
      const parser = getParser('loseit');
      expect(parser).not.toBeNull();
      expect(parser).toBeInstanceOf(LoseItParser);
    });

    it('should return null for unknown source', () => {
      const parser = getParser('unknown');
      expect(parser).toBeNull();
    });
  });
});
