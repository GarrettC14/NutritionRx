/**
 * Restaurant Premium Gating Tests (Feature 2)
 * Tests that:
 * 1. Banner CTA navigates to paywall (not console.log)
 * 2. Food detail screen gates logging for non-premium users
 * 3. Premium badge shows on log button for non-premium users
 * 4. Non-premium users can still browse freely
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Restaurant Premium Gating (Feature 2)', () => {
  let restaurantListSource: string;
  let foodDetailSource: string;

  beforeAll(() => {
    restaurantListSource = fs.readFileSync(
      path.resolve(__dirname, '../../../app/restaurant/index.tsx'),
      'utf-8'
    );
    foodDetailSource = fs.readFileSync(
      path.resolve(__dirname, '../../../app/restaurant/food/[foodId].tsx'),
      'utf-8'
    );
  });

  describe('Restaurant List Screen - Banner CTA Fix', () => {
    it('should not contain console.log for navigation', () => {
      // The old broken behavior: console.log('Navigate to premium')
      expect(restaurantListSource).not.toContain("console.log('Navigate to premium')");
    });

    it('should navigate to paywall on banner upgrade press', () => {
      expect(restaurantListSource).toContain("/paywall?context=nutrition");
    });

    it('should use router.push for paywall navigation', () => {
      expect(restaurantListSource).toContain("router.push('/paywall?context=nutrition')");
    });

    it('should show premium banner for non-premium users', () => {
      expect(restaurantListSource).toContain('!isPremium && showPremiumBanner');
      expect(restaurantListSource).toContain('PremiumBanner');
    });

    it('should import PremiumBanner', () => {
      expect(restaurantListSource).toContain('PremiumBanner');
    });

    it('should import usePremium hook', () => {
      expect(restaurantListSource).toContain('usePremium');
    });

    it('should have dismissible banner', () => {
      expect(restaurantListSource).toContain('setShowPremiumBanner(false)');
      expect(restaurantListSource).toContain('onDismiss');
    });

    it('should use compact banner variant', () => {
      expect(restaurantListSource).toContain('variant="compact"');
    });
  });

  describe('Food Detail Screen - Logging Gate', () => {
    it('should import useSubscriptionStore', () => {
      expect(foodDetailSource).toContain("useSubscriptionStore");
      expect(foodDetailSource).toContain("@/stores/subscriptionStore");
    });

    it('should destructure isPremium from subscription store', () => {
      expect(foodDetailSource).toContain('isPremium');
      expect(foodDetailSource).toContain('useSubscriptionStore');
    });

    it('should check isPremium before logging food', () => {
      // The handleSave function should check isPremium first
      const handleSaveMatch = foodDetailSource.match(
        /const handleSave[\s\S]*?\n  };/
      );
      expect(handleSaveMatch).toBeTruthy();
      const handleSaveBody = handleSaveMatch![0];

      // isPremium check should come BEFORE logFood call
      const premiumCheckIndex = handleSaveBody.indexOf('!isPremium');
      const logFoodIndex = handleSaveBody.indexOf('logFood');

      expect(premiumCheckIndex).toBeGreaterThan(-1);
      expect(logFoodIndex).toBeGreaterThan(-1);
      expect(premiumCheckIndex).toBeLessThan(logFoodIndex);
    });

    it('should redirect non-premium users to paywall with nutrition context', () => {
      expect(foodDetailSource).toContain("router.push('/paywall?context=nutrition')");
    });

    it('should return early after paywall redirect (no logging)', () => {
      // After the paywall redirect, there should be a return statement
      const handleSaveMatch = foodDetailSource.match(
        /const handleSave[\s\S]*?\n  };/
      );
      expect(handleSaveMatch).toBeTruthy();
      const handleSaveBody = handleSaveMatch![0];

      // Find the premium check block
      const premiumBlock = handleSaveBody.match(
        /if \(!isPremium\)[\s\S]*?return;/
      );
      expect(premiumBlock).toBeTruthy();
      expect(premiumBlock![0]).toContain("router.push('/paywall?context=nutrition')");
      expect(premiumBlock![0]).toContain('return');
    });
  });

  describe('Food Detail Screen - Premium Badge on Button', () => {
    it('should import PremiumBadge component', () => {
      expect(foodDetailSource).toContain('PremiumBadge');
      expect(foodDetailSource).toContain("@/components/premium/PremiumBadge");
    });

    it('should conditionally render PremiumBadge for non-premium users', () => {
      expect(foodDetailSource).toContain('!isPremium');
      expect(foodDetailSource).toContain('PremiumBadge');
    });

    it('should use small size for PremiumBadge', () => {
      expect(foodDetailSource).toContain('size="small"');
    });

    it('should position badge as overlay on button', () => {
      expect(foodDetailSource).toContain('premiumBadgeOverlay');
      expect(foodDetailSource).toContain("position: 'absolute'");
    });
  });

  describe('Food Detail Screen - Browse Access', () => {
    it('should still display food details (no gating on view)', () => {
      // Food card should render for all users
      expect(foodDetailSource).toContain('foodCard');
      expect(foodDetailSource).toContain('food.name');
      expect(foodDetailSource).toContain('food.restaurantName');
    });

    it('should show nutrition preview for all users', () => {
      expect(foodDetailSource).toContain('nutritionCard');
      expect(foodDetailSource).toContain('calculatedNutrition.calories');
      expect(foodDetailSource).toContain('calculatedNutrition.protein');
    });

    it('should show meal type selector for all users', () => {
      expect(foodDetailSource).toContain('mealSelector');
      expect(foodDetailSource).toContain('Breakfast');
      expect(foodDetailSource).toContain('Lunch');
      expect(foodDetailSource).toContain('Dinner');
      expect(foodDetailSource).toContain('Snack');
    });

    it('should show quantity input for all users', () => {
      expect(foodDetailSource).toContain('quantityInput');
      expect(foodDetailSource).toContain('handleQuantityChange');
    });
  });

  describe('Soft Gate Pattern Verification', () => {
    it('should not gate restaurant list access', () => {
      // Restaurant list should NOT check isPremium for rendering
      // (it only uses it for the banner display)
      const isPremiumUsages = restaurantListSource.match(/isPremium/g);
      expect(isPremiumUsages).toBeTruthy();

      // It should only be used for banner conditional, not for route blocking
      expect(restaurantListSource).not.toContain('if (!isPremium) return');
      expect(restaurantListSource).not.toContain('if(!isPremium)return');
    });

    it('should not gate food detail viewing', () => {
      // The premium check should only be in handleSave, not in the render flow
      // Find all isPremium usages outside handleSave
      const renderSection = foodDetailSource.split('const handleSave')[0];
      // isPremium should appear in destructuring but not in conditional rendering blocks
      // It's fine if it appears in the PremiumBadge conditional in JSX
      expect(renderSection).not.toContain('if (!isPremium) return null');
    });

    it('should only gate the logging action', () => {
      // The !isPremium => paywall redirect should only be in handleSave
      const paywallRedirects = foodDetailSource.match(
        /router\.push\('\/paywall\?context=nutrition'\)/g
      );
      expect(paywallRedirects).toBeTruthy();
      expect(paywallRedirects!.length).toBe(1); // Only one paywall redirect
    });
  });
});

describe('Premium Banner Component', () => {
  let bannerSource: string;

  beforeAll(() => {
    bannerSource = fs.readFileSync(
      path.resolve(__dirname, '../../../components/premium/PremiumBanner.tsx'),
      'utf-8'
    );
  });

  it('should support compact variant', () => {
    expect(bannerSource).toContain('compact');
    expect(bannerSource).toContain('compactContainer');
  });

  it('should support expanded variant', () => {
    expect(bannerSource).toContain('expanded');
    expect(bannerSource).toContain('expandedContainer');
  });

  it('should accept onUpgradePress callback', () => {
    expect(bannerSource).toContain('onUpgradePress');
  });

  it('should accept onDismiss callback', () => {
    expect(bannerSource).toContain('onDismiss');
  });

  it('should conditionally render dismiss button', () => {
    expect(bannerSource).toContain('onDismiss &&');
  });

  it('should use sparkles icon', () => {
    expect(bannerSource).toContain('sparkles');
  });
});

describe('Premium Badge Component', () => {
  let badgeSource: string;

  beforeAll(() => {
    badgeSource = fs.readFileSync(
      path.resolve(__dirname, '../../../components/premium/PremiumBadge.tsx'),
      'utf-8'
    );
  });

  it('should display "PRO" text', () => {
    expect(badgeSource).toContain('PRO');
  });

  it('should support small and medium sizes', () => {
    expect(badgeSource).toContain("'small'");
    expect(badgeSource).toContain("'medium'");
  });

  it('should use accent color', () => {
    expect(badgeSource).toContain('colors.premiumGold');
  });
});

describe('Subscription Store Premium Pattern', () => {
  let storeSource: string;

  beforeAll(() => {
    storeSource = fs.readFileSync(
      path.resolve(__dirname, '../../../stores/subscriptionStore.ts'),
      'utf-8'
    );
  });

  it('should export useSubscriptionStore', () => {
    expect(storeSource).toContain('export const useSubscriptionStore');
  });

  it('should have isPremium state', () => {
    expect(storeSource).toContain('isPremium: boolean');
  });

  it('should have toggleDevPremium action', () => {
    expect(storeSource).toContain('toggleDevPremium');
  });

  it('should use Zustand with persistence', () => {
    expect(storeSource).toContain('create<SubscriptionState>()');
    expect(storeSource).toContain('persist');
  });
});
