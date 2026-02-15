import {
  voiceAssistantE2ESpecs,
  voiceResponseQualityTests,
} from '@/services/voiceAssistant/__fixtures__/voiceAssistantE2ESpecs';

describe('voiceAssistantE2ESpecs', () => {
  const expectedSpecKeys = [
    'addWaterDeepLink',
    'addMultipleWaterDeepLink',
    'quickAddCaloriesDeepLink',
    'quickAddWithMealDeepLink',
    'queryCaloriesDeepLink',
    'queryMacrosDeepLink',
    'logWeightDeepLink',
    'logWeightKilogramsDeepLink',
    'voiceAssistantSettingsNavigation',
    'voiceAssistantPlatformInfo',
    'hapticFeedbackToggle',
    'toastAutoDismiss',
    'invalidCaloriesError',
    'invalidWeightError',
    'waterCountUpdatesAfterVoice',
    'quickAddAppearsInFoodLog',
    'weightAppearsInProgress',
  ];

  it('has all expected spec keys', () => {
    const actualKeys = Object.keys(voiceAssistantE2ESpecs);
    for (const key of expectedSpecKeys) {
      expect(actualKeys).toContain(key);
    }
    expect(actualKeys).toHaveLength(expectedSpecKeys.length);
  });

  it('each spec has a description and steps array', () => {
    for (const [key, spec] of Object.entries(voiceAssistantE2ESpecs)) {
      expect(spec.description).toBeDefined();
      expect(typeof spec.description).toBe('string');
      expect(spec.description.length).toBeGreaterThan(0);

      expect(Array.isArray(spec.steps)).toBe(true);
      expect(spec.steps.length).toBeGreaterThan(0);
    }
  });

  it('each step has an action property', () => {
    for (const [key, spec] of Object.entries(voiceAssistantE2ESpecs)) {
      for (const step of spec.steps) {
        expect(step.action).toBeDefined();
        expect(typeof step.action).toBe('string');
        expect(step.action.length).toBeGreaterThan(0);
      }
    }
  });

  it('deep link specs contain valid nutritionrx:// URLs', () => {
    const deepLinkSpecs = Object.entries(voiceAssistantE2ESpecs).filter(([key]) =>
      key.toLowerCase().includes('deeplink')
    );

    expect(deepLinkSpecs.length).toBeGreaterThan(0);

    for (const [key, spec] of deepLinkSpecs) {
      const openDeepLinkSteps = spec.steps.filter(
        (step: any) => step.action === 'openDeepLink'
      );
      expect(openDeepLinkSteps.length).toBeGreaterThan(0);

      for (const step of openDeepLinkSteps) {
        expect((step as any).url).toBeDefined();
        expect((step as any).url).toMatch(/^nutritionrx:\/\//);
      }
    }
  });
});

describe('voiceResponseQualityTests', () => {
  describe('noJudgmentalLanguage', () => {
    it('has forbiddenPatterns and responsesToCheck arrays', () => {
      expect(voiceResponseQualityTests.noJudgmentalLanguage.forbiddenPatterns).toBeDefined();
      expect(Array.isArray(voiceResponseQualityTests.noJudgmentalLanguage.forbiddenPatterns)).toBe(
        true
      );
      expect(
        voiceResponseQualityTests.noJudgmentalLanguage.forbiddenPatterns.length
      ).toBeGreaterThan(0);

      expect(voiceResponseQualityTests.noJudgmentalLanguage.responsesToCheck).toBeDefined();
      expect(
        Array.isArray(voiceResponseQualityTests.noJudgmentalLanguage.responsesToCheck)
      ).toBe(true);
      expect(
        voiceResponseQualityTests.noJudgmentalLanguage.responsesToCheck.length
      ).toBeGreaterThan(0);
    });

    it('all responsesToCheck pass the no-judgmental-language check', () => {
      const { forbiddenPatterns, responsesToCheck } =
        voiceResponseQualityTests.noJudgmentalLanguage;

      for (const response of responsesToCheck) {
        for (const pattern of forbiddenPatterns) {
          expect(pattern.test(response)).toBe(false);
        }
      }
    });
  });

  describe('conciseResponses', () => {
    it('all sample responses are under maxLength', () => {
      const { maxLength, responsesToCheck } = voiceResponseQualityTests.conciseResponses;

      expect(typeof maxLength).toBe('number');
      expect(maxLength).toBeGreaterThan(0);

      for (const response of responsesToCheck) {
        expect(response.length).toBeLessThanOrEqual(maxLength);
      }
    });
  });

  describe('informativeResponses', () => {
    it('has requiredInfo for each response type', () => {
      const { requiredInfo } = voiceResponseQualityTests.informativeResponses;

      expect(requiredInfo).toBeDefined();
      expect(typeof requiredInfo).toBe('object');

      const expectedKeys = ['water', 'quickAdd', 'calorieQuery', 'macroQuery', 'weight'];
      for (const key of expectedKeys) {
        expect(requiredInfo).toHaveProperty(key);
        expect(Array.isArray((requiredInfo as any)[key])).toBe(true);
        expect((requiredInfo as any)[key].length).toBeGreaterThan(0);
      }
    });
  });
});
