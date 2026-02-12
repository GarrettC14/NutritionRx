# NutritionRx — In-App Review Prompt Implementation (v2)

## Context

You are working on **NutritionRx**, a React Native nutrition tracking app built with:
- **Expo** (managed workflow with EAS Build)
- **TypeScript**
- **Expo Router** (file-based routing in `src/app/` directory)
- **Zustand** for state management (stores in `src/stores/`)
- **SQLite** (`expo-sqlite`) for local data storage
- **PostHog** for analytics (may or may not be integrated yet — see Analytics section)

The app follows a **"Nourished Calm"** design philosophy:
- **Sage Green** `#9CAF88` — primary accent
- **Soft Cream** `#FAF8F5` — background
- **Terracotta** `#D4A574` — warm accent
- Light mode primary, warm and supportive feel
- Non-judgmental language around food choices

---

## Objective

Implement an in-app review prompt system that asks users to rate NutritionRx on the App Store / Google Play at the right moment — after completing a weekly reflection (check-in) — using Apple and Google's native review APIs via `expo-store-review`. The prompt fires silently (no custom UI) after behavioral eligibility gates are passed.

### Why Weekly Reflection, Not Meal Logging

Meal logging happens 3-5x/day. It's a quick, habitual action — the user is in "log and go" mode. Interrupting that flow with a review prompt would feel jarring and annoying, like being asked to fill out a survey while texting.

The **weekly reflection** is the ideal trigger because:
1. **It's a reflective moment.** The user just reviewed their week, entered their weight, optionally shared how they're feeling, and saw their updated plan. They're in evaluation mode, not rapid-input mode.
2. **It signals sustained engagement.** A user completing their 3rd weekly reflection has been actively using the app for 3+ weeks. They have a formed opinion.
3. **It's a positive completion moment.** They just finished a meaningful task and saw concrete progress data. This mirrors the "emotional peak after accomplishment" pattern that produces the best reviews.
4. **It's naturally infrequent.** Once per week means we're not at risk of annoying users with prompt frequency — the behavioral cooldown is built into the feature's cadence.

---

## Critical Platform Rules

### Apple (iOS)
- **Maximum 3 prompts per user per 365-day rolling period.** Apple controls this automatically via `SKStoreReviewController` — even if you call the API more than 3 times, Apple will silently suppress the prompt after 3 displays.
- **Apple decides whether to show the prompt.** Calling `requestReview()` does NOT guarantee the prompt appears.
- **You cannot detect whether the prompt was shown, or what rating the user gave.**
- **Users can disable all in-app review prompts** globally via Settings → App Store → In-App Ratings & Reviews.
- **The prompt will NOT appear in TestFlight builds.**

### Google (Android)
- **Maximum 1 prompt per user per ~12 months.** Even stricter than iOS.
- Google also uses internal eligibility logic — calling the API doesn't guarantee display.

### Apple Human Interface Guidelines — Mandatory
- **Do NOT call `requestReview()` from a button press.** Call it as a side effect after a signature interaction.
- **Do NOT show any custom review prompt, modal, or question** before or alongside the native review dialog. No "Enjoying NutritionRx?" screens. No "Rate us!" modals. Apple explicitly says: *"Don't ask the user any questions before or while presenting the rating button or card"* and *"we will disallow custom review prompts."*
- **Do NOT interrupt the user during active input** (mid-food-log, during barcode scan, while editing a meal).

### What This Means for Our Implementation
We use **behavioral eligibility gates** as our implicit filter for happy users — no UI, no questions. If a user has completed 3+ weekly reflections over 21+ days, they're committed and likely satisfied. We call the native API silently and let Apple/Google decide whether to show the prompt.

---

## Additional Fixes (v2 amendments)

1. In `handleRateApp`, if `getStoreReviewUrl()` returns null, show the fallback alert (not return silently).
2. In `reviewPromptService`, prefer `Constants.expoConfig` only; `Constants.manifest` can cause TS/runtime mismatch on newer Expo SDKs.
3. Build store URLs safely when appending query params (`?` vs `&`) so you don't produce malformed links.
4. Make blocked route matching stricter than broad substrings like "log" to avoid false positives.
