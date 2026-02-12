# NutritionRx Client-Side Referral Integration

## Overview
Referral program integrated into the NutritionRx app. Backend is deployed on Supabase Edge Functions, landing page at app.cascademobile.dev.

## Rules
- One-time referral per user
- Mirror reward: referrer gets same tier their friend purchases
- New users only
- All validation is server-side

## Backend Endpoints
Base URL: EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL
Header: x-rc-customer-id (RevenueCat customer ID)

1. POST /generate-referral-code — Body: { "app": "nutritionrx" }
2. POST /apply-referral-code — Body: { "code": "ABC12345" }
3. GET /referral-status — Returns referrer/referee status

## Client Architecture
- referralService.ts: API wrapper using Purchases.getAppUserID()
- useReferralStore.ts: Zustand + persist store (AsyncStorage)
- PaywallScreen: Referrer share card + referee code input
- PremiumUpgradeSheet: Referral teaser link
- Settings: Referral Program row
- _layout.tsx: Universal link handler for app.cascademobile.dev/refer/nutritionrx/[code]

## Deep Link Flow
1. User taps referral link
2. _layout.tsx intercepts https://app.cascademobile.dev/refer/nutritionrx/[code]
3. Sets pendingReferralCode in store
4. Navigates to /paywall?showReferralInput=true
5. PaywallScreen consumes pending code, prefills input, auto-expands section

## Analytics (via trackPaywallEvent)
- referral_code_generated
- referral_code_shared
- referral_code_applied
- referral_reward_displayed
