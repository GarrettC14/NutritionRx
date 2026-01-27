import {
  NUTRITION_DISCLAIMER_CONTENT,
  DisclaimerContent,
  DisclaimerSection
} from '@/features/legal/content/nutritionrx';
import { LEGAL_DISCLAIMER_VERSION } from '@/features/legal/config/legal';

describe('Legal Content', () => {
  describe('LEGAL_DISCLAIMER_VERSION', () => {
    it('should be a valid semver version string', () => {
      const semverRegex = /^\d+\.\d+\.\d+$/;
      expect(LEGAL_DISCLAIMER_VERSION).toMatch(semverRegex);
    });

    it('should be defined and non-empty', () => {
      expect(LEGAL_DISCLAIMER_VERSION).toBeDefined();
      expect(LEGAL_DISCLAIMER_VERSION.length).toBeGreaterThan(0);
    });

    it('should be at least version 1.0.0', () => {
      const [major] = LEGAL_DISCLAIMER_VERSION.split('.').map(Number);
      expect(major).toBeGreaterThanOrEqual(1);
    });
  });

  describe('NUTRITION_DISCLAIMER_CONTENT', () => {
    it('should have required top-level properties', () => {
      expect(NUTRITION_DISCLAIMER_CONTENT).toHaveProperty('introText');
      expect(NUTRITION_DISCLAIMER_CONTENT).toHaveProperty('buttonText');
      expect(NUTRITION_DISCLAIMER_CONTENT).toHaveProperty('sections');
    });

    it('should have non-empty introText', () => {
      expect(NUTRITION_DISCLAIMER_CONTENT.introText).toBeDefined();
      expect(NUTRITION_DISCLAIMER_CONTENT.introText.length).toBeGreaterThan(10);
    });

    it('should have non-empty buttonText', () => {
      expect(NUTRITION_DISCLAIMER_CONTENT.buttonText).toBeDefined();
      expect(NUTRITION_DISCLAIMER_CONTENT.buttonText.length).toBeGreaterThan(0);
    });

    it('should have at least 3 sections', () => {
      expect(NUTRITION_DISCLAIMER_CONTENT.sections).toBeInstanceOf(Array);
      expect(NUTRITION_DISCLAIMER_CONTENT.sections.length).toBeGreaterThanOrEqual(3);
    });

    describe('sections', () => {
      it('each section should have required properties', () => {
        NUTRITION_DISCLAIMER_CONTENT.sections.forEach((section, index) => {
          expect(section).toHaveProperty('icon');
          expect(section).toHaveProperty('title');
          expect(section).toHaveProperty('body');
        });
      });

      it('each section should have a non-empty icon', () => {
        NUTRITION_DISCLAIMER_CONTENT.sections.forEach((section) => {
          expect(section.icon).toBeDefined();
          expect(section.icon.length).toBeGreaterThan(0);
        });
      });

      it('each section should have a non-empty title', () => {
        NUTRITION_DISCLAIMER_CONTENT.sections.forEach((section) => {
          expect(section.title).toBeDefined();
          expect(section.title.length).toBeGreaterThan(0);
        });
      });

      it('each section should have body as string or string array', () => {
        NUTRITION_DISCLAIMER_CONTENT.sections.forEach((section) => {
          const isString = typeof section.body === 'string';
          const isStringArray = Array.isArray(section.body) &&
            section.body.every(item => typeof item === 'string');

          expect(isString || isStringArray).toBe(true);
        });
      });

      it('body content should not be empty', () => {
        NUTRITION_DISCLAIMER_CONTENT.sections.forEach((section) => {
          if (typeof section.body === 'string') {
            expect(section.body.length).toBeGreaterThan(0);
          } else {
            expect(section.body.length).toBeGreaterThan(0);
            section.body.forEach(item => {
              expect(item.length).toBeGreaterThan(0);
            });
          }
        });
      });
    });

    describe('content integrity', () => {
      it('should include "Food is Fuel" section', () => {
        const foodSection = NUTRITION_DISCLAIMER_CONTENT.sections.find(
          s => s.title.toLowerCase().includes('food') || s.title.toLowerCase().includes('fuel')
        );
        expect(foodSection).toBeDefined();
      });

      it('should include "Wellbeing" section', () => {
        const wellbeingSection = NUTRITION_DISCLAIMER_CONTENT.sections.find(
          s => s.title.toLowerCase().includes('wellbeing') || s.title.toLowerCase().includes('well-being')
        );
        expect(wellbeingSection).toBeDefined();
      });

      it('should include "Fine Print" or legal section', () => {
        const legalSection = NUTRITION_DISCLAIMER_CONTENT.sections.find(
          s => s.title.toLowerCase().includes('fine print') ||
               s.title.toLowerCase().includes('legal') ||
               s.title.toLowerCase().includes('disclaimer')
        );
        expect(legalSection).toBeDefined();
      });

      it('should mention consulting professionals', () => {
        const allText = NUTRITION_DISCLAIMER_CONTENT.sections
          .map(s => typeof s.body === 'string' ? s.body : s.body.join(' '))
          .join(' ')
          .toLowerCase();

        const hasConsultAdvice =
          allText.includes('doctor') ||
          allText.includes('dietitian') ||
          allText.includes('professional') ||
          allText.includes('consult');

        expect(hasConsultAdvice).toBe(true);
      });

      it('should mention that app is educational, not medical treatment', () => {
        const allText = NUTRITION_DISCLAIMER_CONTENT.sections
          .map(s => typeof s.body === 'string' ? s.body : s.body.join(' '))
          .join(' ')
          .toLowerCase();

        const hasEducationalDisclaimer =
          allText.includes('educational') ||
          allText.includes('not medical') ||
          allText.includes('not a prescription');

        expect(hasEducationalDisclaimer).toBe(true);
      });

      it('should mention disordered eating awareness', () => {
        const allText = NUTRITION_DISCLAIMER_CONTENT.sections
          .map(s => typeof s.body === 'string' ? s.body : s.body.join(' '))
          .join(' ')
          .toLowerCase();

        const hasDisorderedEatingAwareness =
          allText.includes('disordered eating') ||
          allText.includes('eating disorder');

        expect(hasDisorderedEatingAwareness).toBe(true);
      });

      it('should mention estimates or approximations', () => {
        const allText = NUTRITION_DISCLAIMER_CONTENT.sections
          .map(s => typeof s.body === 'string' ? s.body : s.body.join(' '))
          .join(' ')
          .toLowerCase();

        const hasEstimatesDisclaimer =
          allText.includes('estimate') ||
          allText.includes('approximat');

        expect(hasEstimatesDisclaimer).toBe(true);
      });
    });
  });

  describe('type definitions', () => {
    it('should satisfy DisclaimerContent interface', () => {
      const content: DisclaimerContent = NUTRITION_DISCLAIMER_CONTENT;
      expect(content).toBeDefined();
      expect(content.introText).toBeDefined();
      expect(content.buttonText).toBeDefined();
      expect(content.sections).toBeDefined();
    });

    it('each section should satisfy DisclaimerSection interface', () => {
      NUTRITION_DISCLAIMER_CONTENT.sections.forEach((section) => {
        const typedSection: DisclaimerSection = section;
        expect(typedSection.icon).toBeDefined();
        expect(typedSection.title).toBeDefined();
        expect(typedSection.body).toBeDefined();
      });
    });
  });
});

describe('Content accessibility', () => {
  it('should have reasonable text length for mobile readability', () => {
    const MAX_SECTION_LENGTH = 1000; // characters

    NUTRITION_DISCLAIMER_CONTENT.sections.forEach((section) => {
      const bodyLength = typeof section.body === 'string'
        ? section.body.length
        : section.body.join('').length;

      expect(bodyLength).toBeLessThan(MAX_SECTION_LENGTH);
    });
  });

  it('should use simple, clear language (no overly long words)', () => {
    const MAX_AVG_WORD_LENGTH = 8;

    const allText = NUTRITION_DISCLAIMER_CONTENT.sections
      .map(s => typeof s.body === 'string' ? s.body : s.body.join(' '))
      .join(' ');

    const words = allText.split(/\s+/).filter(w => w.length > 0);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;

    expect(avgWordLength).toBeLessThan(MAX_AVG_WORD_LENGTH);
  });

  it('button text should be action-oriented', () => {
    const actionWords = ['start', 'begin', 'continue', 'proceed', 'accept', 'agree', 'let'];
    const buttonTextLower = NUTRITION_DISCLAIMER_CONTENT.buttonText.toLowerCase();

    const hasActionWord = actionWords.some(word => buttonTextLower.includes(word));
    expect(hasActionWord).toBe(true);
  });
});
