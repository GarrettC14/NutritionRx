# NutritionRx

A modern, privacy-first nutrition and calorie tracking app built with React Native.

---

## Design Philosophy

**"Nourished Calm"** — Confident but gentle, calm but capable.

- **Speed is respect** — Log food in 3 taps or less
- **No judgment** — Never shame the user for going over
- **Offline-first** — Works without internet for all core features
- **Privacy by default** — No accounts required
- **Free barcode scanning** — Using Open Food Facts API
- **Full transparency** — See exactly how your targets are calculated

---

## Documentation

Read these documents in order when implementing:

| Document | Purpose |
|----------|---------|
| **README.md** | This file — project overview |
| **UX_SPECIFICATION.md** | Competitor analysis, design direction, UX principles |
| **UX_PROMPT_MOBILE.md** | Design tokens (colors, typography, spacing, components) |
| **TECHNICAL_REQUIREMENTS.md** | Domain models, business rules, feature specs |
| **GOALS_FEATURE_SPECIFICATION.md** | Adaptive algorithm, TDEE calculation, native charts |
| **PROJECT_ARCHITECTURE.md** | Folder structure, patterns, conventions |
| **DATABASE_SCHEMA.md** | SQLite migrations, queries, TypeScript types |
| **API_INTEGRATION.md** | Open Food Facts, USDA, caching, offline |
| **USER_EXPERIENCE_FLOWS.md** | First-run, empty states, scanner UX, permissions |
| **BACKUP_AND_EXPORT.md** | Data export, import, deletion |
| **APP_STORE_LISTING.md** | Store descriptions, screenshots, keywords |
| **FUTURE_FEATURES.md** | Roadmap for V1.1+, free differentiators |

---

## Key Features (MVP)

### Core Logging
- ✅ Daily food log with 4 meal types (Breakfast, Lunch, Dinner, Snack)
- ✅ Barcode scanning (free, via Open Food Facts)
- ✅ Food search with local database
- ✅ Quick add (calories only)
- ✅ Custom food creation
- ✅ Recent foods for fast logging

### Goals & Adaptive Nutrition
- ✅ **Optional** onboarding (skip if you just want to track food)
- ✅ Personalized TDEE calculation (Mifflin-St Jeor)
- ✅ Automatic calorie & macro targets based on your goal
- ✅ Weekly reflections with progress analysis
- ✅ **Adaptive adjustment** — targets update based on YOUR actual results
- ✅ Safety guardrails (calorie floors, max rates)
- ✅ Full transparency — see exactly how targets are calculated

### Progress Tracking & Analytics (Native Charts)
- ✅ **Metabolism chart** — Watch your plan adapt as we learn your body
- ✅ **Weight trend chart** — Raw weights + smoothed trend + goal line
- ✅ **Goal progress chart** — Waterfall showing weekly progress
- ✅ **Calorie intake chart** — Daily/weekly intake vs target
- ✅ Calorie ring with daily goal
- ✅ Macro breakdown (P/C/F)

### Settings
- ✅ Customizable calorie/macro goals (or auto from algorithm)
- ✅ Weight unit preference (kg/lbs)
- ✅ Dark/Light/Auto theme

---

## The Adaptive Algorithm

Unlike traditional apps that use static TDEE formulas (often off by 300+ calories), NutritionRx learns YOUR metabolism:

```
Week 1: Initial estimate based on stats
Week 2-3: Algorithm observes your data
Week 4+: Targets refined to match YOUR body
```

**How it works:**
1. You log food and weight
2. Algorithm calculates: `TDEE = Calories In - Change in Stored Energy`
3. Your targets adjust to keep you on track to your goal

No more guessing. No more plateaus wondering "should I eat less?"

---

## Ecosystem

NutritionRx is designed to be part of the same family as **GymRx** (gym workout tracker):

- Shared visual identity (colors, typography, spacing)
- Same design philosophy ("Quiet Strength" ↔ "Nourished Calm")
- Native charts on both platforms (SwiftUI Charts / Jetpack Compose)
- Future: Shared premium subscription
- Future: Optional data sharing between apps

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native (Expo) |
| Language | TypeScript |
| Navigation | Expo Router |
| State | Zustand |
| Database | SQLite (expo-sqlite) |
| Charts (iOS) | SwiftUI Charts |
| Charts (Android) | Jetpack Compose Charts |
| Barcode | expo-barcode-scanner |
| Food Data | Open Food Facts API |

---

## Data Sources

### Primary: Open Food Facts
- Free, open-source API
- 2.8M+ products from 150+ countries
- Barcode database included
- Results cached locally for offline use

### Seed Data: USDA
- 200-500 common generic foods
- Shipped with app
- Research-grade accuracy

---

## Constraints

This app is designed with specific constraints in mind:

- **Solo developer** — Minimal operational overhead
- **MVP scope** — Self-contained, offline-first
- **No accounts** — Privacy by default
- **No cloud sync** — Local persistence (SQLite)
- **Free APIs** — Open Food Facts for barcodes
- **No ads** — Ever

---

## What's NOT Included (V2+)

- User accounts / Cloud sync
- Recipe builder
- Meal planning
- Water tracking
- Micronutrients (vitamins/minerals)
- AI photo recognition
- Social features
- Gamification (streaks, badges)
- Apple Health / Google Fit sync
- Exercise tracking (use GymRx)

---

## Build Phases

| Phase | Focus | Duration |
|-------|-------|----------|
| 1 | Project setup, database, design tokens | Week 1 |
| 2 | Core data layer (repos, services, stores) | Week 2 |
| 3 | Food management (search, detail, custom) | Week 3 |
| 4 | Barcode scanning & API integration | Week 4 |
| 5 | Food logging (today screen, add flow) | Week 5 |
| 6 | Weight tracking + Goals onboarding | Week 6 |
| 7 | Adaptive algorithm + Native charts | Week 7 |
| 8 | Settings & polish | Week 8 |

---

## License

Private project — not open source.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-25 | Initial specification |
| 1.1 | 2026-01-25 | Added Goals feature with adaptive algorithm |
