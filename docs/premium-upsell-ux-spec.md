# NutritionRx: Premium Upsell UX Specification

## Overview

Two-tier paywall system powered by RevenueCat for converting free users to premium subscribers.

### Tier 1: Contextual Bottom Sheet
- Triggered when free users tap locked/blurred premium content
- Shows feature-specific messaging with a single monthly price CTA
- Lightweight, non-intrusive — designed for impulse conversion
- Opens via `usePremiumSheetStore.showPremiumSheet(category, featureName)`

### Tier 2: Full-Screen Paywall
- Explicit upgrade screen accessed from settings or deep links
- Two-tab layout: "NutritionRx Only" | "Both Apps" (Cascade bundle)
- Plan cards with radio buttons (Monthly/Annual per tab)
- Annual plan pre-selected with savings badge
- Complete purchase flow with error handling and restore

## Architecture

### Entitlements
- `nutritionrx_premium` — Single app premium (APP_ENTITLEMENT)
- `cascade_bundle` — Both apps bundle (REVENUECAT_CONFIG.entitlements.CASCADE_BUNDLE)

### Offerings
- `nutritionrx_default` — NutritionRx-only plans
- `cascade_bundle_default` — Cascade bundle plans

### Design Tokens
- **Gold (#C9953C)**: CTA buttons, premium lock icons, sparkle accents
- **Sage Green (#7C9A7C)**: Feature chips, plan card selected borders, radio indicators
- **Gold Muted**: Lock icon backgrounds (premiumGoldMuted theme color)

## Components

### New Components
| Component | File | Purpose |
|---|---|---|
| `PremiumUpgradeSheet` | `src/components/premium/PremiumUpgradeSheet.tsx` | Bottom sheet with purchase flow (Tier 1) |
| `PremiumUpgradeContent` | `src/components/premium/PremiumUpgradeContent.tsx` | Shared headline/subtitle/benefits with crossfade |
| `PremiumFeatureChips` | `src/components/premium/PremiumFeatureChips.tsx` | Horizontally scrollable tappable chip row |
| `PlanCard` | `src/components/premium/PlanCard.tsx` | Radio-button plan selection card |
| `PaywallErrorBanner` | `src/components/premium/PaywallErrorBanner.tsx` | Animated inline error banner |

### Modified Components
| Component | Change |
|---|---|
| `PaywallScreen` | Complete rewrite with two tabs, plan cards, per-package trial eligibility |
| `LockedContentArea` | Now triggers bottom sheet via `usePremiumSheetStore` |
| `LockedOverlay` | Same — triggers bottom sheet instead of `router.push('/paywall')` |

### Supporting Files
| File | Purpose |
|---|---|
| `analyticsEnums.ts` | PaywallSource, PaywallCategory, PaywallTab, PaywallPlan enums |
| `upgradeContent.ts` | Data-driven content config (headlines, subtitles, benefits per category) |
| `usePremiumSheetStore.ts` | Zustand store for global bottom sheet state |
| `purchaseErrorMap.ts` | Concrete PURCHASES_ERROR_CODE → user message mapping |
| `src/utils/paywallAnalytics.ts` | trackPaywallEvent + generatePaywallSessionId |

## Key Implementation Details

### 1. Per-Package Trial Eligibility
Trial eligibility is checked per-package/per-productId, not aggregated across all products.
- **iOS**: Uses `Purchases.checkTrialOrIntroductoryPriceEligibility([productId])`
- **Android**: Checks `selectedPackage.product.introPrice != null`
- Eligibility is re-checked when user switches tabs or plans
- 5-second timeout prevents UI from blocking on slow responses

### 2. Concrete Purchase Error Code Mapping
Maps `react-native-purchases` error enums/codes directly to UX messages and analytics events via `purchaseErrorMap.ts`:
- `PURCHASE_CANCELLED_ERROR` → silent dismiss (not an error)
- `PAYMENT_PENDING_ERROR` → "Payment pending — you'll get access once confirmed."
- `PRODUCT_ALREADY_PURCHASED_ERROR` → "You already own this subscription."
- `NETWORK_ERROR` → "Network error. Check your connection and try again."
- `STORE_PROBLEM_ERROR` → "The app store is temporarily unavailable."
- etc.

### 3. paywallSessionId on All Events
Every paywall session generates a UUID v4 session ID, attached to all analytics events including:
- `paywall_price_load_failed`
- `paywall_context_missing`
- `paywall_context_invalid`
- `paywall_opened`, `paywall_closed`, `paywall_tab_switched`
- `purchase_initiated`, `purchase_succeeded`, `purchase_failed`

### 4. Content Categories
Feature-specific content driven by `PaywallCategory`:
- `ai_insights` — AI insights, weekly recaps, daily insights
- `smart_logging` — AI photo analysis, barcode scanning, voice logging
- `advanced_nutrition` — Micronutrients, macro cycling, meal planning
- `data_export` — Data export, progress photos, CSV export

Legacy context values (e.g., `insights`, `ai_photo`, `general`) are mapped to categories via `FEATURE_TO_CATEGORY`.

## Store Changes

### `subscriptionStore.ts`
- Added `bundleOffering: PurchasesOffering | null` to state
- `initialize()` extracts both NutritionRx and bundle offerings from `offerings.all`
- Falls back: `offerings.all['nutritionrx_default'] ?? offerings.current`
- All `BUNDLE_PREMIUM` references renamed to `CASCADE_BUNDLE`

### `usePremiumSheetStore.ts` (new)
- `isVisible`, `category`, `featureName`, `sessionId`, `openedAt`
- `showPremiumSheet(category, featureName)` — opens sheet, generates sessionId
- `hidePremiumSheet()` — closes sheet, resets state

## Analytics Events

Tracked via Sentry breadcrumbs + console.log in dev (no analytics SDK):

| Event | Properties |
|---|---|
| `paywall_opened` | source, category, featureName, tab, paywallSessionId |
| `paywall_closed` | source, category, dismissMethod, durationMs, paywallSessionId |
| `paywall_tab_switched` | fromTab, toTab, paywallSessionId |
| `purchase_initiated` | plan, tab, paywallSessionId |
| `purchase_succeeded` | plan, tab, paywallSessionId |
| `purchase_failed` | plan, tab, errorCode, errorMessage, paywallSessionId |
| `restore_initiated` | paywallSessionId |
| `restore_succeeded` | paywallSessionId |
| `restore_failed` | errorMessage, paywallSessionId |

## Root Layout Integration

`PremiumUpgradeSheet` is mounted globally in `_layout.tsx` inside the `BottomSheetModalProvider` / `ConfirmDialogProvider` tree, ensuring it's accessible from any screen.

## Testing

All 3242 tests pass (109 test suites). Key test updates:
- `subscriptionStore.test.ts` — Updated mock config from `BUNDLE_PREMIUM` to `CASCADE_BUNDLE`
- `subscriptionGatingIntegration.test.ts` — Same mock config update + added `offerings` to mock
- `PremiumGate.test.tsx` — Updated mock entitlement name for consistency
