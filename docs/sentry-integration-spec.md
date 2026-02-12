# NutritionRx — Sentry Crash Reporting Integration

## Context

You are working on **NutritionRx**, a React Native nutrition tracking app built with:
- **Expo** (managed workflow with EAS Build)
- **TypeScript**
- **Expo Router** (file-based routing in `app/` directory)
- **Zustand** for state management
- **SQLite** (`expo-sqlite`) for local data storage
- **React Native Reanimated** for animations

The app follows a **"Nourished Calm"** design philosophy:
- **Sage Green** `#9CAF88` — primary accent
- **Soft Cream** `#FAF8F5` — background
- **Terracotta** `#D4A574` — warm accent
- Light mode primary, warm and supportive feel
- Non-judgmental language around food choices

The Sentry DSN is already available in the project's `.env` file as `EXPO_PUBLIC_SENTRY_DSN`.

---

## Objective

Integrate Sentry crash reporting and error monitoring into NutritionRx so that unhandled crashes, handled exceptions, and key user actions are captured and visible in the Sentry dashboard — all without logging any personal health or nutrition data.

---

## Step 1: Install Dependencies

```bash
npx expo install @sentry/react-native
```

---

## Step 2: Configure `app.config.ts` and EAS Secrets

Add the Sentry plugin to the Expo config for source map uploads during EAS Build:

```typescript
// In the plugins array of app.config.ts
plugins: [
  // ... existing plugins
  [
    "@sentry/react-native/expo",
    {
      organization: "cascade-software-solutions",
      project: "nutritionrx",
    }
  ],
],
```

> **Note:** The actual org and project names must match what's in the Sentry dashboard. Check and update these values.

### Source Map Auth Token (Required for EAS Build)

Sentry needs an auth token to upload source maps during the build. Without this, crash stack traces will show minified garbage instead of actual file names and line numbers.

1. **Generate a token** in Sentry: Settings → Auth Tokens → Create New Token. Grant `project:releases` and `org:read` scopes.
2. **Add to EAS secrets** (never commit this to source):
   ```bash
   eas secret:create --name SENTRY_AUTH_TOKEN --value "your_token_here" --scope project
   ```
3. **Verify** the plugin picks it up — `@sentry/react-native/expo` reads `SENTRY_AUTH_TOKEN` from the environment automatically during EAS Build. No additional config needed in `app.config.ts`.

> **Important:** `SENTRY_AUTH_TOKEN` is a **build-time secret only**. It is used by the Sentry plugin during EAS Build to upload source maps. It must NEVER be prefixed with `EXPO_PUBLIC_` and must NEVER be referenced in any runtime application code. Only `EXPO_PUBLIC_SENTRY_DSN` is read at runtime.

> **Local builds:** If you ever run `eas build --local`, set `SENTRY_AUTH_TOKEN` as a shell environment variable. Do NOT add it to `.env` or `.env.local` — those files are bundled by Metro and could leak the token into the JS bundle.

---

## Step 3: Initialize Sentry in Root Layout

Modify `app/_layout.tsx` to initialize Sentry at **module scope** (outside any component) and wrap the app.

> **Critical:** `Sentry.init()` must be at the top level of the file, not inside a React component. Placing it inside `RootLayout` would re-initialize on every re-render. The full initialization pattern including navigation integration is shown in Step 7 — the code below shows the core config only.

```typescript
import * as Sentry from '@sentry/react-native';

// ---- MODULE SCOPE (top of file, before any component) ----

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN) && !__DEV__,
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
  environment: __DEV__ ? 'development' : 'production',

  beforeBreadcrumb(breadcrumb) {
    const sensitiveKeys = ['calories', 'protein', 'carbs', 'fat', 'weight', 'food', 'meal', 'serving', 'macros', 'grams', 'intake'];
    const scrubObject = (obj: Record<string, any>) => {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          delete obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          scrubObject(obj[key]);
        }
      }
    };
    if (breadcrumb.data) scrubObject(breadcrumb.data);
    if (breadcrumb.message) {
      const nutritionPattern = /\b(\d+\s*(cal|kcal|g|oz|mg|serving|macro)s?\b)/gi;
      breadcrumb.message = breadcrumb.message.replace(nutritionPattern, '[redacted]');
    }
    return breadcrumb;
  },

  beforeSend(event) {
    if (event.exception?.values?.[0]?.value?.includes('Network request failed')) {
      return null;
    }
    const sensitiveKeys = ['calories', 'protein', 'carbs', 'fat', 'weight', 'food', 'meal', 'serving', 'macros', 'grams', 'intake'];
    const scrubObject = (obj: Record<string, any>) => {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          delete obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          scrubObject(obj[key]);
        }
      }
    };
    if (event.extra) scrubObject(event.extra);
    if (event.contexts) scrubObject(event.contexts);
    if (event.tags) {
      for (const key of Object.keys(event.tags)) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          delete event.tags[key];
        }
      }
    }
    return event;
  },
});
```

Then wrap the root component export:

```typescript
export default Sentry.wrap(RootLayout);
```

---

## Step 4: Create Crash Fallback Screen

Create `src/components/CrashFallbackScreen.tsx` — this is shown when an error boundary catches a crash.

**Design Requirements (Nourished Calm theme):**
- Soft Cream (`#FAF8F5`) background
- Sage Green (`#9CAF88`) accent for the retry button
- Warm, reassuring copy — no technical jargon
- Two actions: "Try Again" (reloads the component) and "Restart App" (exits)

---

## Step 5: Add Error Boundaries to Critical Screens

Wrap the following screens/sections with `Sentry.ErrorBoundary`:
1. Dashboard (`app/(tabs)/index.tsx`)
2. Food Log / Daily Log (`app/(tabs)/log.tsx`)
3. Food Search/Add flow (`app/(modals)/add-food/`)
4. Progress/Analytics (`app/(tabs)/progress.tsx`)
5. Settings (`app/(tabs)/settings.tsx`)

---

## Step 6: Add `Sentry.captureException()` to Critical Try-Catch Blocks

**Capture:** Database errors, barcode failures, malformed API data, RevenueCat SDK errors, HealthKit errors, chart crashes.

**Do NOT capture:** User cancellations, network timeouts, empty results, validation errors.

Use `isExpectedError` helper to filter noise.

---

## Step 7: Navigation Integration

Use `Sentry.reactNavigationIntegration` with Expo Router's navigation ref. Create integration at module scope, register in component useEffect.

---

## Step 8: Tag Context

Set tags for app_version, subscription_tier, theme. Set anonymous user ID.

---

## Privacy Rules — CRITICAL

**Never log:** food names, calories, macros, serving sizes, body weight, measurements, goals, meal photos, dietary preferences.

**Safe to log:** action types, meal categories, screen names, feature areas, error types, stack traces, device info.

`sendDefaultPii: false` always.
