import {
  USDA_NUTRIENT_MAP,
  APP_TO_USDA_MAP,
  MAPPED_NUTRIENT_COUNT,
} from '@/services/usda/nutrientMap';

describe('nutrientMap', () => {
  describe('USDA_NUTRIENT_MAP', () => {
    it('maps USDA IDs to app nutrient IDs (spot checks)', () => {
      expect(USDA_NUTRIENT_MAP[401]).toBe('vitamin_c');
      expect(USDA_NUTRIENT_MAP[303]).toBe('iron');
      expect(USDA_NUTRIENT_MAP[318]).toBe('vitamin_a');
      expect(USDA_NUTRIENT_MAP[291]).toBe('fiber');
      expect(USDA_NUTRIENT_MAP[606]).toBe('saturated_fat');
    });

    it('has all USDA IDs as positive numbers', () => {
      const usdaIds = Object.keys(USDA_NUTRIENT_MAP).map(Number);
      for (const id of usdaIds) {
        expect(id).toBeGreaterThan(0);
      }
    });

    it('has all app IDs as non-empty strings', () => {
      const appIds = Object.values(USDA_NUTRIENT_MAP);
      for (const id of appIds) {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      }
    });

    it('has no duplicate values (app IDs)', () => {
      const appIds = Object.values(USDA_NUTRIENT_MAP);
      const uniqueAppIds = new Set(appIds);
      expect(uniqueAppIds.size).toBe(appIds.length);
    });
  });

  describe('APP_TO_USDA_MAP', () => {
    it('is the reverse mapping (app ID to USDA ID)', () => {
      expect(APP_TO_USDA_MAP['vitamin_c']).toBe(401);
      expect(APP_TO_USDA_MAP['iron']).toBe(303);
      expect(APP_TO_USDA_MAP['vitamin_a']).toBe(318);
      expect(APP_TO_USDA_MAP['fiber']).toBe(291);
    });

    it('has no duplicate values (USDA IDs)', () => {
      const usdaIds = Object.values(APP_TO_USDA_MAP);
      const uniqueUsdaIds = new Set(usdaIds);
      expect(uniqueUsdaIds.size).toBe(usdaIds.length);
    });
  });

  describe('MAPPED_NUTRIENT_COUNT', () => {
    it('equals the number of entries in USDA_NUTRIENT_MAP', () => {
      expect(MAPPED_NUTRIENT_COUNT).toBe(Object.keys(USDA_NUTRIENT_MAP).length);
    });
  });

  describe('bidirectional consistency', () => {
    it('every USDA_NUTRIENT_MAP key has a corresponding APP_TO_USDA_MAP entry', () => {
      for (const [usdaIdStr, appId] of Object.entries(USDA_NUTRIENT_MAP)) {
        const usdaId = Number(usdaIdStr);
        expect(APP_TO_USDA_MAP[appId]).toBe(usdaId);
      }
    });

    it('every APP_TO_USDA_MAP key has a corresponding USDA_NUTRIENT_MAP entry', () => {
      for (const [appId, usdaId] of Object.entries(APP_TO_USDA_MAP)) {
        expect(USDA_NUTRIENT_MAP[usdaId]).toBe(appId);
      }
    });

    it('both maps have the same number of entries', () => {
      expect(Object.keys(APP_TO_USDA_MAP).length).toBe(
        Object.keys(USDA_NUTRIENT_MAP).length
      );
    });
  });
});
