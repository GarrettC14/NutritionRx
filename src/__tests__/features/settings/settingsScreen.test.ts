/**
 * Settings Screen Tests
 * Tests for the settings screen structure and Macro Cycling integration (Feature 1)
 *
 * These tests verify the settings screen's imports and configuration are correct,
 * and that the PremiumSettingsRow is properly used for macro cycling.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Settings Screen - Macro Cycling Settings Link (Feature 1)', () => {
  let settingsSource: string;

  beforeAll(() => {
    const filePath = path.resolve(__dirname, '../../../app/(tabs)/settings.tsx');
    settingsSource = fs.readFileSync(filePath, 'utf-8');
  });

  describe('PremiumSettingsRow Import', () => {
    it('should import PremiumSettingsRow from premium components', () => {
      expect(settingsSource).toContain(
        "import { PremiumSettingsRow } from '@/components/premium/PremiumSettingsRow'"
      );
    });
  });

  describe('Macro Cycling Row Configuration', () => {
    it('should include a PremiumSettingsRow for Macro Cycling', () => {
      expect(settingsSource).toContain('<PremiumSettingsRow');
      expect(settingsSource).toContain('Macro Cycling');
    });

    it('should use "repeat-outline" icon', () => {
      // Extract the PremiumSettingsRow block
      const rowMatch = settingsSource.match(
        /<PremiumSettingsRow[\s\S]*?Macro Cycling[\s\S]*?\/>/
      );
      expect(rowMatch).toBeTruthy();
      expect(rowMatch![0]).toContain('repeat-outline');
    });

    it('should have subtitle "Different targets for training vs rest days"', () => {
      expect(settingsSource).toContain(
        'Different targets for training vs rest days'
      );
    });

    it('should link to /macro-cycling-setup route', () => {
      const rowMatch = settingsSource.match(
        /<PremiumSettingsRow[\s\S]*?Macro Cycling[\s\S]*?\/>/
      );
      expect(rowMatch).toBeTruthy();
      expect(rowMatch![0]).toContain('/macro-cycling-setup');
    });

    it('should use context="planning" for paywall', () => {
      const rowMatch = settingsSource.match(
        /<PremiumSettingsRow[\s\S]*?Macro Cycling[\s\S]*?\/>/
      );
      expect(rowMatch).toBeTruthy();
      expect(rowMatch![0]).toContain('context="planning"');
    });
  });

  describe('Placement in YOUR PLAN section', () => {
    it('should appear in the YOUR PLAN section', () => {
      // Find YOUR PLAN section
      const yourPlanIndex = settingsSource.indexOf('YOUR PLAN');
      const trackingIndex = settingsSource.indexOf('TRACKING');
      const macroCyclingIndex = settingsSource.indexOf('Macro Cycling');

      expect(yourPlanIndex).toBeGreaterThan(-1);
      expect(trackingIndex).toBeGreaterThan(-1);
      expect(macroCyclingIndex).toBeGreaterThan(yourPlanIndex);
      expect(macroCyclingIndex).toBeLessThan(trackingIndex);
    });

    it('should appear after Meal Planning', () => {
      const mealPlanningIndex = settingsSource.indexOf('Meal Planning');
      const macroCyclingIndex = settingsSource.indexOf('Macro Cycling');

      expect(mealPlanningIndex).toBeGreaterThan(-1);
      expect(macroCyclingIndex).toBeGreaterThan(mealPlanningIndex);
    });

    it('should appear after Nutrition Preferences', () => {
      const nutritionIndex = settingsSource.indexOf('Nutrition Preferences');
      const macroCyclingIndex = settingsSource.indexOf('Macro Cycling');

      expect(nutritionIndex).toBeGreaterThan(-1);
      expect(macroCyclingIndex).toBeGreaterThan(nutritionIndex);
    });
  });

  describe('Settings Screen Section Structure', () => {
    it('should have PREMIUM section', () => {
      expect(settingsSource).toMatch(/PREMIUM/);
    });

    it('should have YOUR PLAN section', () => {
      expect(settingsSource).toMatch(/YOUR PLAN/);
    });

    it('should have TRACKING section', () => {
      expect(settingsSource).toMatch(/TRACKING/);
    });

    it('should have PROFILE section', () => {
      expect(settingsSource).toMatch(/PROFILE/);
    });

    it('should have CONNECTIONS section', () => {
      expect(settingsSource).toMatch(/CONNECTIONS/);
    });

    it('should have SUPPORT section', () => {
      expect(settingsSource).toMatch(/SUPPORT/);
    });

    it('should have all YOUR PLAN items in correct order', () => {
      const goalIndex = settingsSource.indexOf('Your Goal');
      const nutritionIndex = settingsSource.indexOf('Nutrition Preferences');
      const mealPlanIndex = settingsSource.indexOf('Meal Planning');
      const macroCyclingIndex = settingsSource.indexOf('Macro Cycling');

      expect(goalIndex).toBeLessThan(nutritionIndex);
      expect(nutritionIndex).toBeLessThan(mealPlanIndex);
      expect(mealPlanIndex).toBeLessThan(macroCyclingIndex);
    });
  });
});

describe('PremiumSettingsRow Component', () => {
  let premiumRowSource: string;

  beforeAll(() => {
    const filePath = path.resolve(
      __dirname,
      '../../../components/premium/PremiumSettingsRow.tsx'
    );
    premiumRowSource = fs.readFileSync(filePath, 'utf-8');
  });

  describe('Props Interface', () => {
    it('should accept label prop', () => {
      expect(premiumRowSource).toContain('label: string');
    });

    it('should accept optional icon prop', () => {
      expect(premiumRowSource).toContain('icon?:');
    });

    it('should accept optional href prop', () => {
      expect(premiumRowSource).toContain('href?:');
    });

    it('should accept optional context prop', () => {
      expect(premiumRowSource).toContain('context?:');
    });

    it('should accept optional subtitle prop', () => {
      expect(premiumRowSource).toContain('subtitle?:');
    });
  });

  describe('Premium Logic', () => {
    it('should use useSubscriptionStore for premium check', () => {
      expect(premiumRowSource).toContain('useSubscriptionStore');
      expect(premiumRowSource).toContain('isPremium');
    });

    it('should navigate to href when premium user taps', () => {
      expect(premiumRowSource).toContain('isPremium && href');
      expect(premiumRowSource).toContain('router.push(href');
    });

    it('should navigate to paywall when non-premium user taps', () => {
      expect(premiumRowSource).toContain('/paywall?context=');
    });

    it('should default context to "general"', () => {
      expect(premiumRowSource).toContain("context = 'general'");
    });

    it('should show lock icon for non-premium users', () => {
      expect(premiumRowSource).toContain('lock-closed');
      expect(premiumRowSource).toContain('!isPremium');
    });

    it('should always show chevron-forward', () => {
      expect(premiumRowSource).toContain('chevron-forward');
    });
  });
});
