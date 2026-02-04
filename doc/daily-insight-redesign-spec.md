# NutritionRx Daily Insight Widget — Redesign Specification

> **Purpose**: Self-contained implementation specification for redesigning the Daily Insight AI widget from a passive "fortune cookie" display into an interactive, question-driven daily nutrition intelligence system.
>
> **Target**: Claude Code IDE implementation. All TypeScript interfaces, file paths, prompt templates, and component specs are final.

---

## Table of Contents

1. [Competitive Research Analysis](#1-competitive-research-analysis)
2. [Design Philosophy & Interaction Model](#2-design-philosophy--interaction-model)
3. [Curated Question Library](#3-curated-question-library)
4. [Data Pipeline Architecture](#4-data-pipeline-architecture)
5. [TypeScript Interfaces](#5-typescript-interfaces)
6. [Data Fetchers](#6-data-fetchers)
7. [Prompt Templates](#7-prompt-templates)
8. [Response Parsing](#8-response-parsing)
9. [Zustand Store](#9-zustand-store)
10. [Component Specifications](#10-component-specifications)
11. [File Structure](#11-file-structure)
12. [Migration Strategy](#12-migration-strategy)
13. [Testing Requirements](#13-testing-requirements)
14. [Implementation Order](#14-implementation-order)

---

## 1. Competitive Research Analysis

### 1.1 App-by-App Findings

#### Cronometer (Gold Standard for Data Depth)

- **Daily View**: Nutrient target bars showing % of 84 micronutrients against RDA. Color-coded (gray = under target, green = met, red = over max). No AI narrative — purely visual.
- **Insights**: "Nutrition Report Dashboard Widget" shows 7-day average of key metrics. Gold users get Highlighted Nutrients and Nutrition Scores across 8 configurable nutrient areas.
- **AI Usage**: AI limited to photo logging and food suggestions (foods that help hit remaining targets). No conversational or narrative AI.
- **Key Pattern**: Data density as insight — users derive insight from raw nutrient bar visualization, not generated text.
- **Gap**: No "what does this mean for me today" narrative layer. Data-rich but interpretation-poor.

#### MacroFactor (Best-in-Class Coaching Algorithm)

- **Daily View**: Timeline-style food log with macro totals. Customizable dashboard with expenditure estimates, weight trends, habit tracking.
- **Insights**: Weekly coaching check-in adjusts calorie/macro targets based on weight trend vs. logged intake. Adherence-neutral — never penalizes deviation.
- **AI Usage**: AI for photo logging only. All coaching is algorithmic (expenditure model, not LLM).
- **Key Pattern**: "Adherence neutral" language philosophy — the app adjusts to the user's behavior rather than scolding them. Very aligned with NutritionRx's "Nourished Calm" voice.
- **Gap**: No daily-level interpretive insights. Weekly cadence only. No Q&A.

#### MyFitnessPal (Largest Ecosystem)

- **Daily View**: Calorie remaining counter, macro pie chart, meal-by-meal log. Food Group Insights shows weekly category breakdown.
- **Insights**: "Food Suggestions" recommends protein/fiber-rich foods based on remaining targets. Streak celebrations at day milestones. Progress bar encourages logging consistency.
- **AI Usage**: Voice Log (speech-to-food-entry), Meal Scan (photo → entries), AI meal planning via Intent acquisition. No interpretive AI insights.
- **Key Pattern**: Gamification of consistency — streaks, celebrations, weekly challenges ("Eat More Fiber: 5g+ for 5 days").
- **Gap**: No narrative daily insights. No way to ask questions about your day. AI used only for input, not analysis.

#### Noom (Closest to Behavioral AI Coaching)

- **Daily View**: Color-coded food log (green/yellow/orange calorie density). Daily psychology-based micro-lessons refreshed at midnight.
- **Insights**: "Welli" AI chatbot provides 24/7 Q&A on wellness topics. Meal Insights generated after each food log. Glucose forecasting tool predicts meal impact.
- **AI Usage**: Welli is the most interactive AI assistant in the space — answers natural language questions, handles travel eating advice, GLP-1 symptom management. But it's a general wellness chatbot, not deeply contextualized to today's specific data.
- **Key Pattern**: Post-meal instant insight (Welli generates a "Meal Insight" after every log). AI as complement to human coaching — handles routine queries so coaches focus on relationships.
- **Gap**: Welli is conversational but generic — it doesn't deeply analyze "your specific data today." It's more FAQ than personalized daily intelligence.

#### Yazio (Solid Mid-Market)

- **Daily View**: Dashboard with calories consumed/remaining/burned, macro breakdown. Smart Food Rating (Pro).
- **Insights**: "Extended Statistics & Insights" in Pro — daily, weekly, monthly analysis of nutrition/activity/body data. Mood tracker and notes for correlating feelings with food.
- **AI Usage**: AI photo tracking for food logging only. No conversational AI.
- **Key Pattern**: Mood-food correlation tracking — a unique angle most apps miss.
- **Gap**: No narrative AI insights. Statistics are charts, not interpreted text.

#### Lose It! (Simplicity-First)

- **Daily View**: Calorie budget with visual "budget remaining" metaphor. Clean, minimal macro display.
- **Insights**: Premium "Insights" tab shows eating pattern reports. Calorie cycling supported.
- **AI Usage**: Snap It (photo), Voice Log. No interpretive AI.
- **Key Pattern**: Calorie budgeting metaphor makes tracking feel like financial management — tangible, less emotional.
- **Gap**: No AI analysis. Insights are historical reports, not daily intelligence.

#### Apple Health (Platform Play)

- **Daily View**: Highlights powered by ML — surfaces the most personally relevant metrics (steps, sleep, heart rate). Trend analysis showing metric direction over time.
- **Insights**: ML-driven "Highlights" — the system decides what's noteworthy and surfaces it proactively. Upcoming: "Health Agent" AI coach (iOS 26.4, Project Mulberry) with native nutrition tracking and real-time lifestyle recommendations.
- **Key Pattern**: **Proactive, ML-curated highlights** — the system surfaces what matters, not a generic daily summary. This is the gold standard interaction model.
- **Gap**: No nutrition-specific AI insights yet (food tracking delegated to third-party apps). Coming soon.

#### Fitia (Most Relevant Competitor)

- **Daily View**: Calorie/macro dashboard with "Fitia Coach" AI integration.
- **Insights**: Fitia Coach is a 24/7 conversational AI that answers natural language questions about food ("Amount of protein?"), analyzes food quality against current goals, explains progress, and suggests improvements. Also provides "Food Insights" — contextual analysis of any food showing how nutritious it is and how well it fits the user's day.
- **AI Usage**: Most advanced in the space. Multi-modal (photo, voice, text logging) plus conversational coaching. Coach handles food logging, recipe creation, plan adjustments, and Q&A through natural conversation.
- **Key Pattern**: **AI coach that bridges input and insight** — not just "log with AI" but "understand with AI." Contextual food analysis against current daily targets.
- **Gap**: Free-form Q&A is powerful but unfocused — users don't always know what to ask. No curated question library to guide exploration.

### 1.2 Competitive Landscape Summary

| Feature                  | Cronometer | MacroFactor | MFP | Noom            | Yazio | Lose It | Apple Health   | Fitia          |
| ------------------------ | ---------- | ----------- | --- | --------------- | ----- | ------- | -------------- | -------------- |
| Daily narrative AI       | ✗          | ✗           | ✗   | Partial (Welli) | ✗     | ✗       | Coming         | ✗              |
| Data Q&A                 | ✗          | ✗           | ✗   | Generic         | ✗     | ✗       | Coming         | ✓ (open-ended) |
| Curated question library | ✗          | ✗           | ✗   | ✗               | ✗     | ✗       | ✗              | ✗              |
| Pre-computed analysis    | ✓ (bars)   | ✓ (algo)    | ✗   | ✗               | ✗     | ✗       | ✓ (highlights) | Partial        |
| Adherence-neutral tone   | ✗          | ✓           | ✗   | ✓               | ✗     | ✗       | N/A            | ✗              |
| Micronutrient insights   | ✓ (84)     | Partial     | ✗   | ✗               | Pro   | ✗       | ✗              | Basic          |

### 1.3 Market Gap & Opportunity

**No nutrition app offers a curated, data-driven question library for daily nutrition intelligence.**

The closest competitors are:

- **Fitia Coach**: Open-ended Q&A, but users don't know what to ask. No structure.
- **Noom Welli**: Conversational but generic — doesn't deeply analyze today's specific data.
- **Apple Health Highlights**: ML-curated proactive insights — great model, but not nutrition-specific yet.

**NutritionRx opportunity**: Combine Apple Health's "proactive highlights" model (template-generated headline widget) with Fitia's "ask about your data" concept, but add structure through a curated question library. Users don't have to think of questions — we present the most relevant ones based on today's data, pre-computed and ready to explore.

This is the same pattern that worked for GymRx Weekly Insights: widget headline → tap → full screen → curated questions → AI-narrated answers.

### 1.4 Patterns to Adopt

1. **Progressive disclosure** (Apple Health Highlights → Detail): Widget shows template headline, tap opens full daily insights screen.
2. **Pre-computed math, AI-narrated results** (MacroFactor coaching algo): All calculations in JavaScript. LLM only converts numbers to natural language.
3. **Adherence-neutral language** (MacroFactor): Never judge. Report facts. Suggest gently. Aligns perfectly with "Nourished Calm."
4. **Curated question categories** (Novel — no competitor does this): Structure what users can explore, don't dump a wall of text.
5. **Contextual question relevance** (Apple Health ML-curated): Show questions that are most interesting given TODAY's data (e.g., don't show "Am I hydrated?" if user hasn't logged water).
6. **Post-log instant insight** (Noom Welli): Future enhancement — generate insight immediately after a meal is logged.

### 1.5 Anti-Patterns to Avoid

1. **Fortune cookie insights**: Generic "You're doing great!" with no data specificity. (Current NutritionRx problem.)
2. **Open-ended free-form Q&A**: Users don't know what to ask. Blank input field = analysis paralysis.
3. **Data wall overwhelm**: Cronometer's 84-nutrient bar chart is powerful for experts but overwhelming for most users.
4. **Streak shaming**: MFP streak celebrations implicitly shame missed days. "Nourished Calm" forbids this.
5. **Judgmental food colors**: Noom's green/yellow/orange implicitly labels food as good/bad. NutritionRx takes a neutral stance.

---

## 2. Design Philosophy & Interaction Model

### 2.1 Core Principle: "Your Data, Your Questions"

The daily insight system transforms from a passive, random observation into an interactive intelligence layer where users explore curated questions about today's nutrition data. Every answer is grounded in pre-computed math — the LLM narrates, it never calculates.

### 2.2 Interaction Flow

```
┌─────────────────────────────────┐
│  DASHBOARD WIDGET (Medium)       │
│  ┌─────────────────────────────┐ │
│  │ 🌿 Daily Insight            │ │
│  │                              │ │
│  │ "1,847 of 2,200 cal today — │ │
│  │  353 remaining with 1 meal   │ │
│  │  left to log"                │ │
│  │                              │ │
│  │    Explore Today's Insights →│ │
│  └─────────────────────────────┘ │
└─────────────────────────────────┘
          │ tap
          ▼
┌─────────────────────────────────┐
│  DAILY INSIGHTS SCREEN           │
│                                  │
│  Today's Snapshot               │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐   │
│  │Cal │ │Pro │ │H₂O │ │Meal│   │
│  │84% │ │72% │ │60% │ │3/4 │   │
│  └────┘ └────┘ └────┘ └────┘   │
│                                  │
│  Questions About Today          │
│                                  │
│  ★ Suggested For You            │
│  ┌─────────────────────────────┐ │
│  │ 🎯 Am I on track with       │ │
│  │    my macros today?          │ │
│  └─────────────────────────────┘ │
│  ┌─────────────────────────────┐ │
│  │ 💧 How's my hydration?      │ │
│  └─────────────────────────────┘ │
│                                  │
│  📊 All Questions               │
│  ┌─────────────────────────────┐ │
│  │  Macros & Calories     (4)  │ │
│  │  Protein Focus          (3)  │ │
│  │  Meal Balance           (3)  │ │
│  │  Hydration              (2)  │ │
│  │  Trends & Patterns      (3)  │ │
│  │  Nutrient Gaps          (3)  │ │
│  └─────────────────────────────┘ │
└─────────────────────────────────┘
          │ tap question
          ▼
┌─────────────────────────────────┐
│  INSIGHT DETAIL (Bottom Sheet)   │
│                                  │
│  🎯 Am I on track with my       │
│     macros today?                │
│                                  │
│  ┌─────────────────────────────┐ │
│  │ Pre-computed data card:      │ │
│  │ Cal: 1847/2200 (84%)        │ │
│  │ Pro: 108g/150g (72%)        │ │
│  │ Carb: 210g/248g (85%)       │ │
│  │ Fat: 62g/73g (85%)          │ │
│  └─────────────────────────────┘ │
│                                  │
│  AI Narrative:                   │
│  "Your macros are tracking well  │
│   today — calories and carbs are │
│   both around 84-85% of your     │
│   targets. Protein is a bit      │
│   behind at 72%, so consider a   │
│   protein-rich option for your   │
│   remaining meal. A Greek yogurt │
│   or chicken breast could close  │
│   the gap nicely."               │
│                                  │
│  ┌─────────────────────────────┐ │
│  │ 🔄 Regenerate  │  ✕ Close   │ │
│  └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### 2.3 Widget Headline Strategy

The widget headline is **100% template-generated — no LLM needed.** This means:

- Instant rendering (no loading state for headline)
- Deterministic, testable output
- LLM reserved for detailed insight narration on the full screen

**Headline selection logic** (priority order):

1. **No data logged today**: "Ready to start tracking today? Log your first meal to unlock insights."
2. **Minimal data** (< 2 meals, < 500 cal): "You've logged {mealCount} meal so far — keep going to see how your day shapes up."
3. **Calorie milestone** (≥ 90% target): "You've reached {percent}% of your calorie target today — nicely paced."
4. **Protein gap** (< 60% target with ≥ 70% cal target): "Protein is at {proteinPercent}% while calories are at {calPercent}% — room to boost protein in your next meal."
5. **Hydration reminder** (< 50% water target, afternoon): "Water intake is at {waterPercent}% — a good time to hydrate."
6. **Streak callout** (≥ 7 day streak): "Day {streak} of consistent logging — your data is getting richer every day."
7. **Standard progress**: "{calories} of {target} cal today — {remaining} remaining with {mealsLeft} meal(s) to go."

### 2.4 Voice & Tone Rules

All text follows the "Nourished Calm" design philosophy:

| Do                           | Don't                                                          |
| ---------------------------- | -------------------------------------------------------------- |
| "Room to boost protein"      | "You're falling short on protein"                              |
| "Consider adding"            | "You need to eat"                                              |
| "Your data shows"            | "Warning: low intake"                                          |
| "Nicely paced"               | "Great job!" (avoid performative praise)                       |
| "Trending upward this week"  | "Better than yesterday" (avoid comparison shame)               |
| Report percentages neutrally | Use words like "failed", "cheated", "bad", "warning", "behind" |

---

## 3. Curated Question Library

### 3.1 Design Principles

1. **Every question maps to pre-computable data**: No question requires LLM reasoning — all math is done in JavaScript before the prompt is built.
2. **Questions are contextually filtered**: Only show questions relevant to today's data state (e.g., hide hydration questions if no water target set).
3. **Questions are grouped by category**: Users browse by interest area, not a flat list.
4. **Each question has a "suggested" score**: Algorithm ranks which 2-3 questions are most interesting today.
5. **All questions are daily-focused**: Weekly analysis belongs to the Weekly Recap widget.

### 3.2 Question Categories & Definitions

#### Category: MACRO_BALANCE (Macros & Calories)

Focus: Overall calorie and macronutrient progress for today.

| ID                 | Question Text                               | Data Required                                                                   | Suggestion Trigger                                                                                          |
| ------------------ | ------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `macro_overview`   | "Am I on track with my macros today?"       | todayCalories, todayProtein, todayCarbs, todayFat, calorieTarget, proteinTarget | Always available when ≥ 1 meal logged                                                                       |
| `calorie_pacing`   | "How am I pacing toward my calorie target?" | todayCalories, calorieTarget, todayMealCount, timeOfDay                         | Available when ≥ 1 meal logged. Suggested when calorie % is notably ahead or behind time-of-day expectation |
| `macro_ratio`      | "What does my macro split look like today?" | todayProtein, todayCarbs, todayFat (as percentages of total cal)                | Available when ≥ 500 cal logged. Suggested when ratio deviates significantly from typical                   |
| `remaining_budget` | "What can I fit in my remaining calories?"  | calorieTarget - todayCalories, proteinTarget - todayProtein                     | Available when remaining > 200 cal. Suggested when protein gap is large but calorie gap is small            |

#### Category: PROTEIN_FOCUS (Protein Focus)

Focus: Protein-specific analysis — the #1 concern for fitness enthusiasts.

| ID                  | Question Text                                 | Data Required                                          | Suggestion Trigger                                                                         |
| ------------------- | --------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `protein_status`    | "Am I getting enough protein today?"          | todayProtein, proteinTarget, todayMealCount            | Always available when ≥ 1 meal logged. Suggested when protein % < calorie % by > 15 points |
| `protein_per_meal`  | "How is my protein distributed across meals?" | todayFoods (per-meal protein breakdown)                | Available when ≥ 2 meals logged. Suggested when any meal has < 20g protein                 |
| `protein_remaining` | "How much protein do I still need today?"     | proteinTarget - todayProtein, remaining meals estimate | Available when protein < 100% target. Suggested when > 40g remaining                       |

#### Category: MEAL_BALANCE (Meal Balance)

Focus: Distribution and quality of meals throughout the day.

| ID                  | Question Text                           | Data Required                                       | Suggestion Trigger                                                                   |
| ------------------- | --------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `meal_distribution` | "How balanced are my meals today?"      | todayFoods grouped by meal, per-meal calorie totals | Available when ≥ 2 meals logged. Suggested when one meal is > 50% of total calories  |
| `meal_timing`       | "Am I spacing my meals well?"           | todayFoods with timestamps                          | Available when ≥ 2 meals with timestamps. Suggested when gap > 6 hours between meals |
| `meal_variety`      | "How varied are my food choices today?" | todayFoods (unique food categories/items)           | Available when ≥ 2 meals logged. Suggested when same food appears in multiple meals  |

#### Category: HYDRATION (Hydration)

Focus: Water intake tracking and pacing.

| ID                 | Question Text                                      | Data Required                      | Suggestion Trigger                                                                 |
| ------------------ | -------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------- |
| `hydration_status` | "How's my hydration today?"                        | todayWater, waterTarget            | Available when waterTarget > 0. Suggested when water % < 50% after noon            |
| `hydration_pacing` | "Am I drinking enough water for this time of day?" | todayWater, waterTarget, timeOfDay | Available when waterTarget > 0. Suggested when water pacing behind time proportion |

#### Category: TRENDS (Trends & Patterns)

Focus: Today's data in context of recent history.

| ID                  | Question Text                                     | Data Required                                            | Suggestion Trigger                                                                                               |
| ------------------- | ------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `vs_weekly_avg`     | "How does today compare to my weekly average?"    | todayCalories, todayProtein, avgCalories7d, avgProtein7d | Available when avgCalories7d > 0. Suggested when today deviates > 20% from average                               |
| `consistency_check` | "How consistent has my tracking been this week?"  | loggingStreak, last 7 days meal counts                   | Available when daysUsingApp ≥ 3. Suggested when streak ≥ 7 or logging drops off                                  |
| `trend_direction`   | "Am I trending in the right direction this week?" | last 7 days calorie data, calorieTarget, userGoal        | Available when ≥ 5 days data in last 7. Suggested when clear upward/downward trend aligns or conflicts with goal |

#### Category: NUTRIENT_GAPS (Nutrient Gaps)

Focus: Micronutrient awareness from deficiency calculator integration.

| ID                     | Question Text                                        | Data Required                                     | Suggestion Trigger                                                                               |
| ---------------------- | ---------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `nutrient_overview`    | "Are there any nutrients I should pay attention to?" | DeficiencyCalculator results (active alerts)      | Available when deficiency alerts exist. Suggested when any Tier 1 alert at "concern" severity    |
| `fiber_check`          | "Am I getting enough fiber today?"                   | todayFiber, fiber RDA (25-30g)                    | Available when todayFiber is tracked (> 0). Suggested when fiber < 50% RDA                       |
| `micronutrient_status` | "What does my micronutrient picture look like?"      | 7-day nutrient averages from DeficiencyCalculator | Available when deficiency system has sufficient data (5+ days). Suggested when ≥ 2 active alerts |

### 3.3 Question Relevance Scoring

Each question receives a `relevanceScore` (0-100) computed from:

```typescript
function computeRelevanceScore(
  questionId: string,
  data: DailyInsightData,
): number {
  // Base score: 20 (always somewhat relevant if data available)
  // + Suggestion trigger match: +40
  // + Data freshness bonus: +10 (data from last hour)
  // + Category diversity bonus: +10 (if no other question from this category suggested)
  // + Time-of-day relevance: +10 (hydration in afternoon, macro overview in evening)
  // + Historical engagement: +10 (user tapped this question type before — future enhancement)
}
```

Top 2-3 questions by score become "Suggested For You" on the daily insights screen.

### 3.4 Fallback When LLM Unavailable

Every question has a **template-only fallback** that displays pre-computed data in formatted text without LLM narration. This replaces the current empty state.

Example for `macro_overview`:

```
Macros Today
• Calories: 1,847 of 2,200 (84%)
• Protein: 108g of 150g (72%)
• Carbs: 210g of 248g (85%)
• Fat: 62g of 73g (85%)

Protein is pacing behind your other macros — a protein-rich
choice for your remaining meal could help balance things out.
```

This fallback text is generated by the same template engine that produces the widget headline — zero LLM dependency.

---

## 4. Data Pipeline Architecture

### 4.1 Pipeline Overview

```
User taps question
       │
       ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Data Fetcher │───▶│  Analyzer    │───▶│   Prompt     │───▶│   LLM        │
│  (per question)│   │  (math/logic)│   │  Template    │   │  Generation  │
│               │    │              │    │  Builder     │    │              │
│ Pulls from:   │    │ Computes:    │    │ Produces:    │    │ Returns:     │
│ - foodLogStore│    │ - percentages│    │ - system msg │    │ - narrative  │
│ - goalStore   │    │ - comparisons│    │ - data block │    │ - emoji      │
│ - waterStore  │    │ - gaps       │    │ - question   │    │              │
│ - insightStore│    │ - flags      │    │ - voice rules│    │              │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                    │
                                                                    ▼
                                                           ┌──────────────┐
                                                           │  Response    │
                                                           │  Parser      │
                                                           │              │
                                                           │ Extracts:    │
                                                           │ - text       │
                                                           │ - emoji icon │
                                                           │ - confidence │
                                                           └──────────────┘
```

### 4.2 Critical Constraint: LLM Never Computes

The on-device LLM (SmolLM2 1.7B / Llama 3.2 1B / Qwen2.5 0.5B) is a **narrator, not a calculator**. These small models hallucinate math. Every number in the prompt must be pre-computed by JavaScript.

**DO**: "Your protein is at 72% of target (108g of 150g). Your calories are at 84%."
**DON'T**: "You've eaten 108g protein and your target is 150g. What percentage is that?"

### 4.3 Caching Strategy

| Level             | Key                                          | TTL     | Invalidation                                           |
| ----------------- | -------------------------------------------- | ------- | ------------------------------------------------------ |
| Widget headline   | `daily_insight_headline_{date}`              | 30 min  | Day change, any food log, manual refresh               |
| Pre-computed data | `daily_insight_data_{date}`                  | 15 min  | Any food/water log event                               |
| LLM response      | `daily_insight_response_{questionId}_{date}` | 2 hours | Day change, manual regenerate, data change > threshold |
| Question scores   | `daily_insight_scores_{date}`                | 15 min  | Recomputed with data cache                             |

"Data change > threshold" means: calorie change > 100, protein change > 15g, water change > 500ml, or meal count change.

---

## 5. TypeScript Interfaces

### 5.1 Core Types

```typescript
// src/features/insights/types/dailyInsights.types.ts

/** Question category identifiers */
export type DailyQuestionCategory =
  | "macro_balance"
  | "protein_focus"
  | "meal_balance"
  | "hydration"
  | "trends"
  | "nutrient_gaps";

/** Individual question identifiers — exhaustive union */
export type DailyQuestionId =
  // Macro Balance
  | "macro_overview"
  | "calorie_pacing"
  | "macro_ratio"
  | "remaining_budget"
  // Protein Focus
  | "protein_status"
  | "protein_per_meal"
  | "protein_remaining"
  // Meal Balance
  | "meal_distribution"
  | "meal_timing"
  | "meal_variety"
  // Hydration
  | "hydration_status"
  | "hydration_pacing"
  // Trends
  | "vs_weekly_avg"
  | "consistency_check"
  | "trend_direction"
  // Nutrient Gaps
  | "nutrient_overview"
  | "fiber_check"
  | "micronutrient_status";

/** Question definition — static registry entry */
export interface DailyQuestionDefinition {
  id: DailyQuestionId;
  category: DailyQuestionCategory;
  text: string;
  emoji: string;
  /** Function to check if this question has enough data to be shown */
  isAvailable: (data: DailyInsightData) => boolean;
  /** Function to compute relevance score (0-100) */
  computeRelevance: (data: DailyInsightData) => number;
  /** Data fetcher key — maps to the function that prepares data for this question */
  fetcherKey: string;
}

/** Category metadata */
export interface DailyQuestionCategoryMeta {
  id: DailyQuestionCategory;
  label: string;
  emoji: string;
  description: string;
}

/** Comprehensive data collected for daily insight analysis */
export interface DailyInsightData {
  // Today's macros
  todayCalories: number;
  todayProtein: number;
  todayCarbs: number;
  todayFat: number;
  todayFiber: number;

  // Targets
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  waterTarget: number;

  // Water
  todayWater: number; // in ml

  // Meals
  todayMealCount: number;
  todayFoods: DailyFoodEntry[];
  mealsWithTimestamps: MealTimestamp[];

  // Context
  avgCalories7d: number;
  avgProtein7d: number;
  loggingStreak: number;
  calorieStreak: number;
  userGoal: string; // 'lose' | 'maintain' | 'gain' | 'recomp'
  daysUsingApp: number;

  // Computed percentages (pre-calculated)
  caloriePercent: number;
  proteinPercent: number;
  carbPercent: number;
  fatPercent: number;
  waterPercent: number;

  // Time context
  currentHour: number; // 0-23
  dayProgress: number; // 0-1 (proportion of waking hours elapsed, assume 6am-10pm)

  // Deficiency alerts (from DeficiencyCalculator)
  activeAlerts: NutrientAlert[];

  // Last 7 days daily totals
  weeklyDailyTotals: WeeklyDayTotal[];
}

/** Individual food entry with meal context */
export interface DailyFoodEntry {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  mealLabel: string; // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  loggedAt?: string; // ISO timestamp
}

/** Meal-level timestamp for timing analysis */
export interface MealTimestamp {
  mealLabel: string;
  firstLogTime: string; // ISO
  lastLogTime: string; // ISO
  totalCalories: number;
  totalProtein: number;
}

/** Nutrient alert from DeficiencyCalculator */
export interface NutrientAlert {
  nutrient: string;
  severity: "notice" | "warning" | "concern";
  percentOfRDA: number;
  tier: 1 | 2;
  foodSources: string[];
}

/** Daily total for weekly context */
export interface WeeklyDayTotal {
  date: string; // YYYY-MM-DD
  calories: number;
  protein: number;
  mealCount: number;
  logged: boolean; // did user log anything this day
}

/** Pre-computed analysis result for a specific question */
export interface QuestionAnalysis {
  questionId: DailyQuestionId;
  /** Structured data to embed in the prompt — all math done */
  dataBlock: string;
  /** Template-based fallback text (no LLM needed) */
  fallbackText: string;
  /** Data card items for display above the narrative */
  dataCards: DataCardItem[];
  /** Timestamp of computation */
  computedAt: number;
}

/** Data card item for visual display */
export interface DataCardItem {
  label: string;
  value: string;
  subValue?: string; // e.g., "108g of 150g"
  percent?: number;
  status: "on_track" | "ahead" | "behind" | "neutral";
}

/** LLM-generated response for a question */
export interface DailyInsightResponse {
  questionId: DailyQuestionId;
  narrative: string;
  emoji: string;
  generatedAt: number;
  source: "llm" | "fallback";
  date: string; // YYYY-MM-DD
}

/** Widget headline data */
export interface WidgetHeadlineData {
  text: string;
  emoji: string;
  priority: number; // which headline rule matched
  computedAt: number;
}

/** Question with computed availability and relevance */
export interface ScoredQuestion {
  definition: DailyQuestionDefinition;
  available: boolean;
  relevanceScore: number;
}

/** Cached daily insight state */
export interface DailyInsightCache {
  date: string;
  headline: WidgetHeadlineData;
  data: DailyInsightData;
  scores: ScoredQuestion[];
  responses: Record<DailyQuestionId, DailyInsightResponse>;
  lastDataUpdate: number;
}
```

### 5.2 Store Types

```typescript
// Additional store-specific types

export interface DailyInsightStoreState {
  // Cache
  cache: DailyInsightCache | null;

  // Generation state
  isGenerating: boolean;
  activeQuestionId: DailyQuestionId | null;
  generationError: string | null;

  // LLM status (inherited from insightsStore pattern)
  llmStatus: LLMStatus;
  downloadProgress: number;

  // Actions
  refreshData: () => Promise<void>;
  generateInsight: (
    questionId: DailyQuestionId,
  ) => Promise<DailyInsightResponse>;
  getHeadline: () => WidgetHeadlineData;
  getSuggestedQuestions: () => ScoredQuestion[];
  getAvailableQuestions: () => Map<DailyQuestionCategory, ScoredQuestion[]>;
  invalidateCache: () => void;
  shouldRefreshData: () => boolean;
}
```

---

## 6. Data Fetchers

### 6.1 Master Data Collector

```typescript
// src/features/insights/services/daily/DailyDataCollector.ts

/**
 * Collects all data needed for daily insight analysis.
 * Single source of truth — called once, result cached 15 minutes.
 *
 * Pulls from:
 * - foodLogStore: today's food entries, meal counts
 * - goalStore: calorie/protein/water targets
 * - waterStore: today's water intake
 * - insightsStore: 7-day averages, streaks
 * - DeficiencyCalculator: active nutrient alerts
 */
export async function collectDailyInsightData(): Promise<DailyInsightData> {
  const today = getTodayDateString(); // YYYY-MM-DD
  const now = new Date();
  const currentHour = now.getHours();

  // 1. Food data
  const foodEntries = foodLogStore.getState().getEntriesForDate(today);
  const todayFoods = mapToFoodEntries(foodEntries);
  const mealsWithTimestamps = groupByMeal(todayFoods);

  // 2. Macro totals
  const todayCalories = sum(todayFoods, "calories");
  const todayProtein = sum(todayFoods, "protein");
  const todayCarbs = sum(todayFoods, "carbs");
  const todayFat = sum(todayFoods, "fat");
  const todayFiber = sum(todayFoods, "fiber");

  // 3. Targets
  const goals = goalStore.getState();
  const calorieTarget = goals.dailyCalorieTarget || 2000;
  const proteinTarget = goals.dailyProteinTarget || 150;
  const carbTarget =
    goals.dailyCarbTarget ||
    computeCarbTarget(calorieTarget, proteinTarget, goals.dailyFatTarget);
  const fatTarget =
    goals.dailyFatTarget || computeFatTarget(calorieTarget, proteinTarget);
  const waterTarget = goals.dailyWaterTarget || 2500; // ml

  // 4. Water
  const todayWater = waterStore.getState().getTodayTotal();

  // 5. Weekly context
  const weeklyDailyTotals = await getLastSevenDaysTotals();
  const avgCalories7d = average(
    weeklyDailyTotals.filter((d) => d.logged),
    "calories",
  );
  const avgProtein7d = average(
    weeklyDailyTotals.filter((d) => d.logged),
    "protein",
  );

  // 6. Streaks
  const loggingStreak = computeLoggingStreak(weeklyDailyTotals);
  const calorieStreak = computeCalorieStreak(weeklyDailyTotals, calorieTarget);

  // 7. Deficiency alerts
  const activeAlerts = await getActiveDeficiencyAlerts();

  // 8. Computed percentages
  const caloriePercent = safePercent(todayCalories, calorieTarget);
  const proteinPercent = safePercent(todayProtein, proteinTarget);
  const carbPercent = safePercent(todayCarbs, carbTarget);
  const fatPercent = safePercent(todayFat, fatTarget);
  const waterPercent = safePercent(todayWater, waterTarget);

  // 9. Day progress (6am-10pm = 16 waking hours)
  const wakingStart = 6;
  const wakingEnd = 22;
  const dayProgress = Math.max(
    0,
    Math.min(1, (currentHour - wakingStart) / (wakingEnd - wakingStart)),
  );

  return {
    todayCalories,
    todayProtein,
    todayCarbs,
    todayFat,
    todayFiber,
    calorieTarget,
    proteinTarget,
    carbTarget,
    fatTarget,
    waterTarget,
    todayWater,
    todayMealCount: mealsWithTimestamps.length,
    todayFoods,
    mealsWithTimestamps,
    avgCalories7d,
    avgProtein7d,
    loggingStreak,
    calorieStreak,
    userGoal: goals.userGoal || "maintain",
    daysUsingApp: goals.daysUsingApp || 1,
    caloriePercent,
    proteinPercent,
    carbPercent,
    fatPercent,
    waterPercent,
    currentHour,
    dayProgress,
    activeAlerts,
    weeklyDailyTotals,
  };
}

function safePercent(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((value / target) * 100);
}
```

### 6.2 Question-Specific Analyzers

Each question has an analyzer that takes `DailyInsightData` and produces a `QuestionAnalysis`.

```typescript
// src/features/insights/services/daily/analyzers/macroAnalyzers.ts

export function analyzeMacroOverview(data: DailyInsightData): QuestionAnalysis {
  const {
    todayCalories,
    calorieTarget,
    caloriePercent,
    todayProtein,
    proteinTarget,
    proteinPercent,
    todayCarbs,
    carbTarget,
    carbPercent,
    todayFat,
    fatTarget,
    fatPercent,
    todayMealCount,
  } = data;

  const remaining = Math.max(0, calorieTarget - todayCalories);
  const proteinGap = Math.max(0, proteinTarget - todayProtein);

  // Determine overall status
  const allAbove80 =
    caloriePercent >= 80 &&
    proteinPercent >= 80 &&
    carbPercent >= 80 &&
    fatPercent >= 80;
  const proteinLagging = proteinPercent < caloriePercent - 15;
  const overCalories = caloriePercent > 110;

  const dataBlock = [
    `TODAY'S MACRO PROGRESS:`,
    `Calories: ${todayCalories} of ${calorieTarget} (${caloriePercent}%)`,
    `Protein: ${todayProtein}g of ${proteinTarget}g (${proteinPercent}%)`,
    `Carbs: ${todayCarbs}g of ${carbTarget}g (${carbPercent}%)`,
    `Fat: ${todayFat}g of ${fatTarget}g (${fatPercent}%)`,
    `Meals logged: ${todayMealCount}`,
    `Remaining calories: ${remaining}`,
    `Remaining protein: ${proteinGap}g`,
    ``,
    `STATUS FLAGS:`,
    allAbove80 ? `All macros above 80% — well balanced.` : "",
    proteinLagging
      ? `Protein is lagging behind calories by ${caloriePercent - proteinPercent} percentage points.`
      : "",
    overCalories ? `Calories are above target.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const fallbackText = proteinLagging
    ? `Protein is at ${proteinPercent}% while calories are at ${caloriePercent}% — a protein-rich choice for your next meal could help balance things out.`
    : allAbove80
      ? `All your macros are tracking above 80% of target today — well balanced across the board.`
      : `Calories at ${caloriePercent}%, protein at ${proteinPercent}%. ${remaining > 0 ? `${remaining} calories remaining.` : "Target reached."}`;

  const dataCards: DataCardItem[] = [
    {
      label: "Calories",
      value: `${caloriePercent}%`,
      subValue: `${todayCalories} / ${calorieTarget}`,
      percent: caloriePercent,
      status: getStatus(caloriePercent),
    },
    {
      label: "Protein",
      value: `${proteinPercent}%`,
      subValue: `${todayProtein}g / ${proteinTarget}g`,
      percent: proteinPercent,
      status: getStatus(proteinPercent),
    },
    {
      label: "Carbs",
      value: `${carbPercent}%`,
      subValue: `${todayCarbs}g / ${carbTarget}g`,
      percent: carbPercent,
      status: getStatus(carbPercent),
    },
    {
      label: "Fat",
      value: `${fatPercent}%`,
      subValue: `${todayFat}g / ${fatTarget}g`,
      percent: fatPercent,
      status: getStatus(fatPercent),
    },
  ];

  return {
    questionId: "macro_overview",
    dataBlock,
    fallbackText,
    dataCards,
    computedAt: Date.now(),
  };
}

function getStatus(percent: number): DataCardItem["status"] {
  if (percent >= 85 && percent <= 115) return "on_track";
  if (percent > 115) return "ahead";
  if (percent < 50) return "behind";
  return "neutral";
}
```

**Analyzer Registry** — maps question IDs to their analyzer functions:

```typescript
// src/features/insights/services/daily/analyzers/index.ts

import {
  analyzeMacroOverview,
  analyzeCaloriePacing,
  analyzeMacroRatio,
  analyzeRemainingBudget,
} from "./macroAnalyzers";
import {
  analyzeProteinStatus,
  analyzeProteinPerMeal,
  analyzeProteinRemaining,
} from "./proteinAnalyzers";
import {
  analyzeMealDistribution,
  analyzeMealTiming,
  analyzeMealVariety,
} from "./mealAnalyzers";
import {
  analyzeHydrationStatus,
  analyzeHydrationPacing,
} from "./hydrationAnalyzers";
import {
  analyzeVsWeeklyAvg,
  analyzeConsistencyCheck,
  analyzeTrendDirection,
} from "./trendAnalyzers";
import {
  analyzeNutrientOverview,
  analyzeFiberCheck,
  analyzeMicronutrientStatus,
} from "./nutrientAnalyzers";

export const questionAnalyzers: Record<
  DailyQuestionId,
  (data: DailyInsightData) => QuestionAnalysis
> = {
  macro_overview: analyzeMacroOverview,
  calorie_pacing: analyzeCaloriePacing,
  macro_ratio: analyzeMacroRatio,
  remaining_budget: analyzeRemainingBudget,
  protein_status: analyzeProteinStatus,
  protein_per_meal: analyzeProteinPerMeal,
  protein_remaining: analyzeProteinRemaining,
  meal_distribution: analyzeMealDistribution,
  meal_timing: analyzeMealTiming,
  meal_variety: analyzeMealVariety,
  hydration_status: analyzeHydrationStatus,
  hydration_pacing: analyzeHydrationPacing,
  vs_weekly_avg: analyzeVsWeeklyAvg,
  consistency_check: analyzeConsistencyCheck,
  trend_direction: analyzeTrendDirection,
  nutrient_overview: analyzeNutrientOverview,
  fiber_check: analyzeFiberCheck,
  micronutrient_status: analyzeMicronutrientStatus,
};
```

---

## 7. Prompt Templates

### 7.1 System Prompt (Shared Across All Questions)

```typescript
// src/features/insights/services/daily/DailyInsightPromptBuilder.ts

export function buildSystemPrompt(): string {
  return `You are the nutrition insight narrator for NutritionRx, a nutrition tracking app.

VOICE: "Nourished Calm" — warm, knowledgeable, never judgmental.
- Speak like a supportive, knowledgeable friend — not a drill sergeant or a therapist.
- Report facts neutrally. Use phrases like "room to boost" instead of "falling short."
- Never use: "failed", "cheated", "warning", "bad", "poor", "behind", "falling short", "need to", "must", "should have"
- Do use: "consider", "room to", "opportunity to", "trending", "pacing", "on track", "nicely balanced"
- Keep it concise: 2-3 sentences max.
- Reference specific numbers from the data provided — never invent or calculate numbers.
- End with a gentle, actionable suggestion when appropriate.
- Do not use exclamation marks.
- Do not start with "Great job" or generic praise.

RESPONSE FORMAT:
Start your response with a single emoji that best represents the insight, followed by a space, then your narrative.
Example: 🎯 Your macros are tracking well today...

CRITICAL: All numbers in the DATA section below are pre-computed and verified. Reference them directly. Do not perform any math or calculations.`;
}
```

### 7.2 Question-Specific User Prompts

```typescript
export function buildQuestionPrompt(
  questionId: DailyQuestionId,
  questionText: string,
  analysis: QuestionAnalysis,
): string {
  return `QUESTION: "${questionText}"

DATA:
${analysis.dataBlock}

Provide a 2-3 sentence insight answering this question based on the data above. Remember: reference the specific numbers, stay warm and non-judgmental, and end with a gentle suggestion if appropriate.`;
}
```

### 7.3 LLM Generation Parameters

```typescript
export const DAILY_INSIGHT_LLM_CONFIG = {
  maxTokens: 120, // Keep responses concise (2-3 sentences)
  temperature: 0.6, // Slightly lower than current 0.7 for more consistent output
  stopSequences: ["\n\n", "---"], // Prevent multi-paragraph responses
} as const;
```

---

## 8. Response Parsing

### 8.1 Response Parser

```typescript
// src/features/insights/services/daily/DailyInsightResponseParser.ts

const EMOJI_REGEX = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u;
const BANNED_WORDS = [
  "failed",
  "cheated",
  "warning",
  "bad",
  "poor",
  "behind",
  "falling short",
];

export interface ParsedInsightResponse {
  emoji: string;
  narrative: string;
  isValid: boolean;
  validationIssues: string[];
}

export function parseInsightResponse(
  rawResponse: string,
): ParsedInsightResponse {
  const trimmed = rawResponse.trim();
  const issues: string[] = [];

  // 1. Extract emoji
  let emoji = "🌿"; // default
  let narrative = trimmed;

  const emojiMatch = trimmed.match(EMOJI_REGEX);
  if (emojiMatch) {
    emoji = emojiMatch[0];
    narrative = trimmed.slice(emojiMatch[0].length).trim();
  } else {
    issues.push("No emoji prefix found, using default");
  }

  // 2. Validate length (should be 2-3 sentences, not a wall of text)
  const sentenceCount = (narrative.match(/[.!?]+/g) || []).length;
  if (sentenceCount > 5) {
    // Truncate to first 3 sentences
    const sentences = narrative.match(/[^.!?]+[.!?]+/g) || [narrative];
    narrative = sentences.slice(0, 3).join(" ").trim();
    issues.push("Response truncated from ${sentenceCount} to 3 sentences");
  }

  // 3. Check for banned words
  const lowerNarrative = narrative.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lowerNarrative.includes(word)) {
      issues.push(`Banned word detected: "${word}"`);
      // Replace with softer alternatives
      narrative = narrative.replace(
        new RegExp(word, "gi"),
        getSoftAlternative(word),
      );
    }
  }

  // 4. Remove exclamation marks (Nourished Calm voice)
  if (narrative.includes("!")) {
    narrative = narrative.replace(/!/g, ".");
    issues.push("Exclamation marks replaced with periods");
  }

  return {
    emoji,
    narrative,
    isValid: issues.length === 0,
    validationIssues: issues,
  };
}

function getSoftAlternative(word: string): string {
  const alternatives: Record<string, string> = {
    failed: "fell short of",
    cheated: "deviated from",
    warning: "note",
    bad: "less ideal",
    poor: "limited",
    behind: "below",
    "falling short": "room to grow",
  };
  return alternatives[word.toLowerCase()] || word;
}
```

---

## 9. Zustand Store

### 9.1 Store Implementation

```typescript
// src/features/insights/stores/dailyInsightStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collectDailyInsightData } from "../services/daily/DailyDataCollector";
import { questionAnalyzers } from "../services/daily/analyzers";
import { questionRegistry } from "../constants/dailyQuestionRegistry";
import { computeWidgetHeadline } from "../services/daily/WidgetHeadlineEngine";
import {
  buildSystemPrompt,
  buildQuestionPrompt,
  DAILY_INSIGHT_LLM_CONFIG,
} from "../services/daily/DailyInsightPromptBuilder";
import { parseInsightResponse } from "../services/daily/DailyInsightResponseParser";
import type {
  DailyInsightStoreState,
  DailyInsightData,
  DailyInsightCache,
  DailyQuestionId,
  DailyQuestionCategory,
  DailyInsightResponse,
  ScoredQuestion,
  WidgetHeadlineData,
  QuestionAnalysis,
} from "../types/dailyInsights.types";

const CACHE_DATA_TTL = 15 * 60 * 1000; // 15 minutes
const CACHE_RESPONSE_TTL = 2 * 60 * 60 * 1000; // 2 hours
const CACHE_HEADLINE_TTL = 30 * 60 * 1000; // 30 minutes

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export const useDailyInsightStore = create<DailyInsightStoreState>()(
  persist(
    (set, get) => ({
      cache: null,
      isGenerating: false,
      activeQuestionId: null,
      generationError: null,
      llmStatus: {
        ready: false,
        reason: "unsupported",
        message: "Checking...",
      },
      downloadProgress: 0,

      shouldRefreshData: () => {
        const { cache } = get();
        if (!cache) return true;
        if (cache.date !== getTodayString()) return true;
        if (Date.now() - cache.lastDataUpdate > CACHE_DATA_TTL) return true;
        return false;
      },

      refreshData: async () => {
        try {
          const data = await collectDailyInsightData();
          const today = getTodayString();

          // Score all questions
          const scores: ScoredQuestion[] = questionRegistry.map((def) => ({
            definition: def,
            available: def.isAvailable(data),
            relevanceScore: def.isAvailable(data)
              ? def.computeRelevance(data)
              : 0,
          }));

          // Compute headline
          const headline = computeWidgetHeadline(data);

          // Preserve existing LLM responses if still valid for today
          const existingCache = get().cache;
          const existingResponses =
            existingCache?.date === today ? existingCache.responses : {};

          set({
            cache: {
              date: today,
              headline,
              data,
              scores,
              responses: existingResponses,
              lastDataUpdate: Date.now(),
            },
          });
        } catch (error) {
          console.error("[DailyInsight] Data refresh failed:", error);
        }
      },

      generateInsight: async (questionId: DailyQuestionId) => {
        const { cache, llmStatus } = get();

        // Check for cached response
        if (cache?.responses[questionId]) {
          const cached = cache.responses[questionId];
          if (
            Date.now() - cached.generatedAt < CACHE_RESPONSE_TTL &&
            cached.date === getTodayString()
          ) {
            return cached;
          }
        }

        // Ensure we have data
        if (!cache?.data || cache.date !== getTodayString()) {
          await get().refreshData();
        }

        const data = get().cache?.data;
        if (!data) throw new Error("No data available");

        // Run the analyzer for this question
        const analyzer = questionAnalyzers[questionId];
        if (!analyzer)
          throw new Error(`No analyzer for question: ${questionId}`);

        const analysis = analyzer(data);

        // If LLM not available, use fallback
        if (!llmStatus.ready) {
          const fallbackResponse: DailyInsightResponse = {
            questionId,
            narrative: analysis.fallbackText,
            emoji: "🌿",
            generatedAt: Date.now(),
            source: "fallback",
            date: getTodayString(),
          };

          set((state) => ({
            cache: state.cache
              ? {
                  ...state.cache,
                  responses: {
                    ...state.cache.responses,
                    [questionId]: fallbackResponse,
                  },
                }
              : state.cache,
          }));

          return fallbackResponse;
        }

        // Generate with LLM
        set({
          isGenerating: true,
          activeQuestionId: questionId,
          generationError: null,
        });

        try {
          const questionDef = questionRegistry.find((q) => q.id === questionId);
          if (!questionDef)
            throw new Error(`Question not found: ${questionId}`);

          const systemPrompt = buildSystemPrompt();
          const userPrompt = buildQuestionPrompt(
            questionId,
            questionDef.text,
            analysis,
          );

          const rawResponse = await generateWithLLM(
            systemPrompt,
            userPrompt,
            DAILY_INSIGHT_LLM_CONFIG,
          );
          const parsed = parseInsightResponse(rawResponse);

          const response: DailyInsightResponse = {
            questionId,
            narrative: parsed.narrative,
            emoji: parsed.emoji,
            generatedAt: Date.now(),
            source: "llm",
            date: getTodayString(),
          };

          set((state) => ({
            isGenerating: false,
            activeQuestionId: null,
            cache: state.cache
              ? {
                  ...state.cache,
                  responses: {
                    ...state.cache.responses,
                    [questionId]: response,
                  },
                }
              : state.cache,
          }));

          return response;
        } catch (error) {
          set({
            isGenerating: false,
            activeQuestionId: null,
            generationError:
              error instanceof Error ? error.message : "Generation failed",
          });

          // Return fallback on error
          return {
            questionId,
            narrative: analysis.fallbackText,
            emoji: "🌿",
            generatedAt: Date.now(),
            source: "fallback",
            date: getTodayString(),
          };
        }
      },

      getHeadline: () => {
        const { cache } = get();
        if (cache?.date === getTodayString() && cache.headline) {
          return cache.headline;
        }
        // Default headline if no cache
        return {
          text: "Log your first meal to unlock today's insights.",
          emoji: "🌿",
          priority: 1,
          computedAt: Date.now(),
        };
      },

      getSuggestedQuestions: () => {
        const { cache } = get();
        if (!cache || cache.date !== getTodayString()) return [];

        return cache.scores
          .filter((q) => q.available)
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 3);
      },

      getAvailableQuestions: () => {
        const { cache } = get();
        const grouped = new Map<DailyQuestionCategory, ScoredQuestion[]>();

        if (!cache || cache.date !== getTodayString()) return grouped;

        for (const scored of cache.scores.filter((q) => q.available)) {
          const cat = scored.definition.category;
          if (!grouped.has(cat)) grouped.set(cat, []);
          grouped.get(cat)!.push(scored);
        }

        return grouped;
      },

      invalidateCache: () => {
        set((state) => ({
          cache: state.cache
            ? {
                ...state.cache,
                lastDataUpdate: 0, // force refresh
                responses: {}, // clear all LLM responses
              }
            : null,
        }));
      },
    }),
    {
      name: "daily-insight-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        cache: state.cache, // persist cache across app restarts
      }),
    },
  ),
);
```

### 9.2 Data Subscription Hook

```typescript
// src/features/insights/hooks/useDailyInsightData.ts

import { useEffect, useCallback } from "react";
import { useDailyInsightStore } from "../stores/dailyInsightStore";
import { useFoodLogStore } from "../../foodLog/stores/foodLogStore";
import { useWaterStore } from "../../water/stores/waterStore";

/**
 * Hook that keeps daily insight data fresh by subscribing to food/water changes.
 * Use in the widget and the daily insights screen.
 */
export function useDailyInsightData() {
  const {
    refreshData,
    shouldRefreshData,
    cache,
    getHeadline,
    getSuggestedQuestions,
  } = useDailyInsightStore();

  // Refresh on mount if stale
  useEffect(() => {
    if (shouldRefreshData()) {
      refreshData();
    }
  }, []);

  // Subscribe to food log changes
  useEffect(() => {
    const unsub = useFoodLogStore.subscribe(
      (state) => state.lastModified,
      () => {
        // Debounce: only refresh if data is at least 30s old
        const { cache } = useDailyInsightStore.getState();
        if (!cache || Date.now() - cache.lastDataUpdate > 30000) {
          refreshData();
        }
      },
    );
    return unsub;
  }, []);

  // Subscribe to water changes
  useEffect(() => {
    const unsub = useWaterStore.subscribe(
      (state) => state.lastModified,
      () => {
        const { cache } = useDailyInsightStore.getState();
        if (!cache || Date.now() - cache.lastDataUpdate > 30000) {
          refreshData();
        }
      },
    );
    return unsub;
  }, []);

  return {
    data: cache?.data ?? null,
    headline: getHeadline(),
    suggestedQuestions: getSuggestedQuestions(),
    isLoaded: cache?.date === new Date().toISOString().split("T")[0],
  };
}
```

---

## 10. Component Specifications

### 10.1 Widget: AIDailyInsightWidget (Redesigned)

**File**: `src/components/dashboard/widgets/AIDailyInsightWidget.tsx`
**Size**: Medium widget (same registration as current)
**Premium**: Yes

#### States

| State            | Trigger                                              | Display                                                   |
| ---------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| `loading`        | Data collecting on first load                        | Skeleton shimmer (2 lines)                                |
| `empty`          | No meals logged today                                | "Log your first meal to unlock today's insights." + CTA   |
| `headline`       | Data available, headline computed                    | Template headline text + "Explore Today's Insights →" CTA |
| `model_download` | LLM needs download (affects full screen, not widget) | Normal headline display — widget never blocks on LLM      |
| `locked`         | Non-premium user                                     | Blurred overlay + upgrade CTA                             |

#### Key Design Decisions

1. **Widget NEVER depends on LLM** — headline is always template-generated. No loading state for AI.
2. **Widget shows headline + CTA** — tapping opens `/daily-insights` screen (new route).
3. **Refresh button recomputes data** — does NOT trigger LLM. Just refreshes the headline from new data.
4. **Widget is always instant** — no spinner, no waiting. Data fetchers are fast (< 100ms from stores).

#### Component Structure

```tsx
// Simplified component structure — not complete implementation

function AIDailyInsightWidget() {
  const { headline, isLoaded, data } = useDailyInsightData();
  const { llmStatus } = useDailyInsightStore();
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const router = useRouter();

  if (!isPremium) return <LockedOverlay />;

  return (
    <WidgetCard
      title="Daily Insight"
      icon={<SparklesIcon />}
      onRefresh={() => useDailyInsightStore.getState().refreshData()}
      onPress={() => router.push("/daily-insights")}
    >
      {!isLoaded ? (
        <SkeletonShimmer lines={2} />
      ) : !data || data.todayMealCount === 0 ? (
        <EmptyState
          text="Log your first meal to unlock today's insights."
          emoji="🌿"
        />
      ) : (
        <HeadlineDisplay
          emoji={headline.emoji}
          text={headline.text}
          cta="Explore Today's Insights"
        />
      )}
    </WidgetCard>
  );
}
```

### 10.2 Screen: DailyInsightsScreen

**File**: `src/features/insights/screens/DailyInsightsScreen.tsx`
**Route**: `/daily-insights` (new Expo Router route)

#### Layout

```
┌─ Header ─────────────────────────┐
│ ← Back    Today's Insights    🔄 │
├──────────────────────────────────┤
│                                  │
│ ┌─ Snapshot Cards ─────────────┐ │
│ │ [Cal %%] [Pro %%] [H₂O %%]  │ │
│ │ [Meals #] [Streak #]         │ │
│ └──────────────────────────────┘ │
│                                  │
│ ★ Suggested For You              │
│ ┌──────────────────────────────┐ │
│ │ 🎯 Question card 1           │ │
│ ├──────────────────────────────┤ │
│ │ 💧 Question card 2           │ │
│ ├──────────────────────────────┤ │
│ │ 📊 Question card 3           │ │
│ └──────────────────────────────┘ │
│                                  │
│ Browse All Questions             │
│ ┌──────────────────────────────┐ │
│ │ 🎯 Macros & Calories    (4) │→│
│ ├──────────────────────────────┤ │
│ │ 💪 Protein Focus         (3) │→│
│ ├──────────────────────────────┤ │
│ │ 🍽️ Meal Balance          (3) │→│
│ ├──────────────────────────────┤ │
│ │ 💧 Hydration             (2) │→│
│ ├──────────────────────────────┤ │
│ │ 📊 Trends & Patterns     (3) │→│
│ ├──────────────────────────────┤ │
│ │ 🧬 Nutrient Gaps         (3) │→│
│ └──────────────────────────────┘ │
│                                  │
│ ┌── LLM Status Banner ────────┐ │
│ │ (only if not ready)          │ │
│ │ Download model for AI        │ │
│ │ narration • [Download]       │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

#### LLM Status Handling

- If LLM ready: questions generate AI narratives when tapped.
- If LLM not ready: questions show template fallback text (pre-computed data with simple rule-based narrative). Banner at bottom explains model download option.
- If downloading: progress bar in banner. Questions still work with fallback.
- **User ALWAYS gets an answer** — LLM enhances quality, but fallback ensures function.

### 10.3 Bottom Sheet: InsightDetailSheet

**File**: `src/features/insights/components/InsightDetailSheet.tsx`

Opened when user taps a question card.

```
┌─ Bottom Sheet (70% height) ──────┐
│                                   │
│  🎯 Am I on track with my        │
│     macros today?                 │
│                                   │
│  ┌─ Data Cards ─────────────────┐ │
│  │ Cal  84%  ████████░░ 1847/2200│ │
│  │ Pro  72%  ███████░░░ 108/150g │ │
│  │ Carb 85%  ████████░░ 210/248g │ │
│  │ Fat  85%  ████████░░ 62/73g   │ │
│  └──────────────────────────────┘ │
│                                   │
│  ┌─ AI Narrative ───────────────┐ │
│  │ 🎯 Your macros are tracking   │ │
│  │ well today — calories and     │ │
│  │ carbs are both around 84-85%  │ │
│  │ of your targets. Protein is   │ │
│  │ a bit behind at 72%, so       │ │
│  │ consider a protein-rich       │ │
│  │ option for your remaining     │ │
│  │ meal.                         │ │
│  └──────────────────────────────┘ │
│  (or skeleton shimmer if loading) │
│  (or fallback text if no LLM)    │
│                                   │
│  [🔄 Regenerate]    [✕ Close]     │
│                                   │
└───────────────────────────────────┘
```

#### Behavior

1. Sheet opens → data cards render instantly (pre-computed).
2. If LLM response cached → narrative appears instantly.
3. If no cache → auto-triggers `generateInsight(questionId)`.
4. Loading state: skeleton shimmer in narrative area (data cards remain visible).
5. Regenerate button: clears cache for this question, re-generates.
6. If LLM unavailable: shows fallback text with subtle label "(Template insight — download AI model for personalized narration)".

### 10.4 Category List: QuestionCategoryList

**File**: `src/features/insights/components/QuestionCategoryList.tsx`

Tapping a category row expands to show all questions in that category.

```tsx
// Accordion pattern — tap category to expand/collapse
<CategoryRow
  emoji="🎯"
  label="Macros & Calories"
  count={4}
  expanded={expandedCategory === "macro_balance"}
  onPress={() => toggleCategory("macro_balance")}
>
  {questions.map((q) => (
    <QuestionCard
      key={q.definition.id}
      question={q.definition}
      onPress={() => openInsightSheet(q.definition.id)}
      hasResponse={!!cache?.responses[q.definition.id]}
    />
  ))}
</CategoryRow>
```

---

## 11. File Structure

```
src/features/insights/
├── types/
│   ├── insights.types.ts                    # Existing types (keep)
│   └── dailyInsights.types.ts               # NEW: All types from §5
│
├── constants/
│   ├── nutrientThresholds.ts                # Existing (keep)
│   ├── foodSources.ts                       # Existing (keep)
│   ├── dailyQuestionRegistry.ts             # NEW: Question definitions array
│   └── dailyQuestionCategories.ts           # NEW: Category metadata
│
├── stores/
│   ├── insightsStore.ts                     # Existing (keep, but decouple daily logic)
│   └── dailyInsightStore.ts                 # NEW: Zustand store from §9
│
├── services/
│   ├── InsightPromptBuilder.ts              # Existing (keep for legacy, deprecate)
│   ├── DeficiencyCalculator.ts              # Existing (keep, integrate)
│   ├── FallbackInsights.ts                  # Existing (keep, reference patterns)
│   └── daily/                               # NEW: All daily insight services
│       ├── DailyDataCollector.ts            # §6.1: Master data collector
│       ├── WidgetHeadlineEngine.ts          # §2.3: Template headline generator
│       ├── DailyInsightPromptBuilder.ts     # §7: Prompt templates
│       ├── DailyInsightResponseParser.ts    # §8: Response parser
│       └── analyzers/                       # §6.2: Per-question analyzers
│           ├── index.ts                     # Analyzer registry
│           ├── macroAnalyzers.ts            # macro_overview, calorie_pacing, macro_ratio, remaining_budget
│           ├── proteinAnalyzers.ts          # protein_status, protein_per_meal, protein_remaining
│           ├── mealAnalyzers.ts             # meal_distribution, meal_timing, meal_variety
│           ├── hydrationAnalyzers.ts        # hydration_status, hydration_pacing
│           ├── trendAnalyzers.ts            # vs_weekly_avg, consistency_check, trend_direction
│           └── nutrientAnalyzers.ts         # nutrient_overview, fiber_check, micronutrient_status
│
├── hooks/
│   ├── useInsightsData.ts                   # Existing (keep)
│   ├── useInsightGeneration.ts              # Existing (keep)
│   ├── useDeficiencyAlerts.ts               # Existing (keep, integrate)
│   ├── useDailyInsightData.ts               # NEW: §9.2 data subscription hook
│   └── useDailyInsightGeneration.ts         # NEW: Hook for insight detail generation
│
├── screens/
│   └── DailyInsightsScreen.tsx              # NEW: §10.2 Full insights screen
│
├── components/
│   ├── DailyInsightsSection.tsx             # Existing (keep for Progress tab)
│   ├── InsightDetailSheet.tsx               # NEW: §10.3 Bottom sheet
│   ├── SnapshotCards.tsx                    # NEW: Today's stats mini cards
│   ├── SuggestedQuestions.tsx               # NEW: Top 3 suggested questions
│   ├── QuestionCategoryList.tsx             # NEW: §10.4 Accordion category browser
│   └── QuestionCard.tsx                     # NEW: Individual question card
│
└── __tests__/
    ├── dailyDataCollector.test.ts           # Data collection tests
    ├── widgetHeadlineEngine.test.ts         # Headline logic tests
    ├── analyzers/                           # Per-analyzer test files
    │   ├── macroAnalyzers.test.ts
    │   ├── proteinAnalyzers.test.ts
    │   ├── mealAnalyzers.test.ts
    │   ├── hydrationAnalyzers.test.ts
    │   ├── trendAnalyzers.test.ts
    │   └── nutrientAnalyzers.test.ts
    ├── dailyInsightPromptBuilder.test.ts    # Prompt construction tests
    ├── dailyInsightResponseParser.test.ts   # Response parsing tests
    ├── questionRelevance.test.ts            # Question scoring tests
    └── dailyInsightStore.test.ts            # Store integration tests
```

**New route file**:

```
app/(tabs)/daily-insights.tsx    # OR app/daily-insights.tsx depending on router structure
```

**Modified files**:

```
src/components/dashboard/widgets/AIDailyInsightWidget.tsx  # Rewrite (§10.1)
```

---

## 12. Migration Strategy

### 12.1 Approach: Parallel Build, Swap on Ready

The new system is built alongside the existing one. No existing code is modified until the new system is tested and validated.

### 12.2 Steps

1. **Build new types** → `dailyInsights.types.ts`
2. **Build question registry** → `dailyQuestionRegistry.ts`, `dailyQuestionCategories.ts`
3. **Build data collector** → `DailyDataCollector.ts` (pulls from existing stores)
4. **Build analyzers** → All 18 analyzer functions with tests
5. **Build headline engine** → `WidgetHeadlineEngine.ts` with tests
6. **Build prompt builder & parser** → `DailyInsightPromptBuilder.ts`, `DailyInsightResponseParser.ts`
7. **Build store** → `dailyInsightStore.ts`
8. **Build hooks** → `useDailyInsightData.ts`, `useDailyInsightGeneration.ts`
9. **Build UI components** → Bottom sheet, cards, category list
10. **Build screen** → `DailyInsightsScreen.tsx`
11. **Rewrite widget** → `AIDailyInsightWidget.tsx`
12. **Add route** → `/daily-insights`
13. **Integration test** → Full flow from widget to screen to insight
14. **Remove legacy code** → Delete old prompt builder references from widget (keep for Weekly Recap)

### 12.3 Backward Compatibility

- Existing `insightsStore` is NOT modified — it still powers the Weekly Recap widget.
- Existing `InsightPromptBuilder.ts` is NOT deleted — it still powers weekly prompts.
- Existing `DailyInsightsSection.tsx` on Progress tab can be updated later to use new store.
- `FallbackInsights.ts` patterns should be referenced when building template fallbacks.

---

## 13. Testing Requirements

### 13.1 Unit Tests

#### Data Collector

- Returns correct totals from mock food log data
- Handles empty day (no food logged)
- Computes percentages correctly (including edge case: target = 0)
- Calculates day progress at different hours
- Integrates deficiency alerts correctly

#### Widget Headline Engine

- Selects correct headline for each priority level
- Handles edge cases: no data, minimal data, over target, perfect day
- Never produces banned words
- Templates render with correct number formatting

#### Analyzers (per question)

- Produces correct `dataBlock` for known input data
- `fallbackText` never contains banned words
- `dataCards` have correct status labels
- Handles zero/null/undefined data gracefully

#### Response Parser

- Extracts emoji correctly from various emoji types
- Truncates long responses
- Replaces banned words
- Removes exclamation marks
- Handles edge case: empty response, garbage response

#### Question Relevance

- Top questions change based on data state
- Hydration questions hidden when no water target
- Protein questions prioritized when protein lags calories
- Empty day returns no available questions

### 13.2 Integration Tests

- Full pipeline: collectData → analyze → buildPrompt → (mock LLM) → parseResponse
- Store: refreshData → getHeadline → getSuggestedQuestions → generateInsight
- Cache: responses persist across refresh, invalidate on day change
- Fallback: LLM unavailable → fallback text returned for all questions

### 13.3 Snapshot Tests

- Widget renders correctly in all states (loading, empty, headline, locked)
- InsightDetailSheet renders data cards + narrative
- QuestionCategoryList renders all categories with counts

---

## 14. Implementation Order

Execute in this exact sequence for minimal risk and maximum testability at each step.

### Phase 1: Foundation (No UI Changes)

1. `dailyInsights.types.ts` — All TypeScript interfaces
2. `dailyQuestionCategories.ts` — Category metadata constants
3. `dailyQuestionRegistry.ts` — Full question registry with availability/relevance functions
4. `DailyDataCollector.ts` + tests — Master data fetcher
5. `WidgetHeadlineEngine.ts` + tests — Template headline generator

### Phase 2: Analysis Layer

6. `analyzers/macroAnalyzers.ts` + tests — 4 macro questions
7. `analyzers/proteinAnalyzers.ts` + tests — 3 protein questions
8. `analyzers/mealAnalyzers.ts` + tests — 3 meal questions
9. `analyzers/hydrationAnalyzers.ts` + tests — 2 hydration questions
10. `analyzers/trendAnalyzers.ts` + tests — 3 trend questions
11. `analyzers/nutrientAnalyzers.ts` + tests — 3 nutrient questions
12. `analyzers/index.ts` — Analyzer registry

### Phase 3: LLM Pipeline

13. `DailyInsightPromptBuilder.ts` + tests — System + question prompts
14. `DailyInsightResponseParser.ts` + tests — Parse & validate LLM output
15. `dailyInsightStore.ts` + tests — Zustand store with cache

### Phase 4: Hooks

16. `useDailyInsightData.ts` — Data subscription hook
17. `useDailyInsightGeneration.ts` — Generation orchestration hook

### Phase 5: UI Components

18. `SnapshotCards.tsx` — Today's stats mini cards
19. `QuestionCard.tsx` — Individual question card
20. `SuggestedQuestions.tsx` — Top 3 suggested display
21. `QuestionCategoryList.tsx` — Accordion category browser
22. `InsightDetailSheet.tsx` — Bottom sheet with data cards + narrative

### Phase 6: Screens & Navigation

23. `DailyInsightsScreen.tsx` — Full screen composition
24. Route registration — `/daily-insights`
25. `AIDailyInsightWidget.tsx` — Rewrite widget to use new store

### Phase 7: Polish & Cleanup

26. Integration testing — Full flow validation
27. Update `DailyInsightsSection.tsx` on Progress tab to use new store
28. Cache tuning — Adjust TTLs based on real usage
29. Remove dead code — Old widget LLM generation path

---

## Appendix A: Question Registry Implementation

```typescript
// src/features/insights/constants/dailyQuestionRegistry.ts

import type {
  DailyQuestionDefinition,
  DailyInsightData,
} from "../types/dailyInsights.types";

export const questionRegistry: DailyQuestionDefinition[] = [
  // === MACRO BALANCE ===
  {
    id: "macro_overview",
    category: "macro_balance",
    text: "Am I on track with my macros today?",
    emoji: "🎯",
    isAvailable: (d) => d.todayMealCount >= 1,
    computeRelevance: (d) => {
      let score = 30; // base
      if (d.currentHour >= 17) score += 20; // evening — good time to review
      if (Math.abs(d.caloriePercent - d.proteinPercent) > 15) score += 25; // imbalance
      if (d.caloriePercent >= 80) score += 15; // getting close to target
      return Math.min(100, score);
    },
    fetcherKey: "macro_overview",
  },
  {
    id: "calorie_pacing",
    category: "macro_balance",
    text: "How am I pacing toward my calorie target?",
    emoji: "⏱️",
    isAvailable: (d) => d.todayMealCount >= 1,
    computeRelevance: (d) => {
      let score = 20;
      const expectedPercent = d.dayProgress * 100;
      const deviation = Math.abs(d.caloriePercent - expectedPercent);
      if (deviation > 20) score += 35; // notably ahead or behind
      if (d.currentHour >= 12 && d.currentHour <= 18) score += 15; // midday check useful
      return Math.min(100, score);
    },
    fetcherKey: "calorie_pacing",
  },
  {
    id: "macro_ratio",
    category: "macro_balance",
    text: "What does my macro split look like today?",
    emoji: "📊",
    isAvailable: (d) => d.todayCalories >= 500,
    computeRelevance: (d) => {
      let score = 20;
      // Check if ratio deviates significantly from targets
      const proteinCalPct =
        ((d.todayProtein * 4) / Math.max(1, d.todayCalories)) * 100;
      const carbCalPct =
        ((d.todayCarbs * 4) / Math.max(1, d.todayCalories)) * 100;
      const fatCalPct = ((d.todayFat * 9) / Math.max(1, d.todayCalories)) * 100;
      if (proteinCalPct < 20 || proteinCalPct > 40) score += 25;
      if (fatCalPct > 40) score += 20;
      return Math.min(100, score);
    },
    fetcherKey: "macro_ratio",
  },
  {
    id: "remaining_budget",
    category: "macro_balance",
    text: "What can I fit in my remaining calories?",
    emoji: "🧮",
    isAvailable: (d) => d.calorieTarget - d.todayCalories > 200,
    computeRelevance: (d) => {
      let score = 25;
      const remaining = d.calorieTarget - d.todayCalories;
      const proteinGap = d.proteinTarget - d.todayProtein;
      if (proteinGap > 30 && remaining < 600) score += 35; // tight budget, protein needed
      if (d.currentHour >= 16) score += 20; // late afternoon/evening — planning last meal
      return Math.min(100, score);
    },
    fetcherKey: "remaining_budget",
  },

  // === PROTEIN FOCUS ===
  {
    id: "protein_status",
    category: "protein_focus",
    text: "Am I getting enough protein today?",
    emoji: "💪",
    isAvailable: (d) => d.todayMealCount >= 1,
    computeRelevance: (d) => {
      let score = 25;
      if (d.proteinPercent < d.caloriePercent - 15) score += 40; // protein lagging
      if (d.userGoal === "gain" || d.userGoal === "recomp") score += 15; // protein matters more
      return Math.min(100, score);
    },
    fetcherKey: "protein_status",
  },
  {
    id: "protein_per_meal",
    category: "protein_focus",
    text: "How is my protein distributed across meals?",
    emoji: "🍽️",
    isAvailable: (d) => d.todayMealCount >= 2,
    computeRelevance: (d) => {
      let score = 20;
      // Check for protein-sparse meals
      const mealProteins = d.mealsWithTimestamps.map((m) => m.totalProtein);
      if (mealProteins.some((p) => p < 20)) score += 30; // a meal with < 20g protein
      const maxProtein = Math.max(...mealProteins);
      const minProtein = Math.min(...mealProteins);
      if (maxProtein > minProtein * 3) score += 20; // very uneven distribution
      return Math.min(100, score);
    },
    fetcherKey: "protein_per_meal",
  },
  {
    id: "protein_remaining",
    category: "protein_focus",
    text: "How much protein do I still need today?",
    emoji: "🥩",
    isAvailable: (d) => d.todayProtein < d.proteinTarget,
    computeRelevance: (d) => {
      let score = 20;
      const remaining = d.proteinTarget - d.todayProtein;
      if (remaining > 40) score += 30; // significant gap
      if (d.currentHour >= 16) score += 20; // getting late, need to plan
      return Math.min(100, score);
    },
    fetcherKey: "protein_remaining",
  },

  // === MEAL BALANCE ===
  {
    id: "meal_distribution",
    category: "meal_balance",
    text: "How balanced are my meals today?",
    emoji: "⚖️",
    isAvailable: (d) => d.todayMealCount >= 2,
    computeRelevance: (d) => {
      let score = 20;
      const mealCals = d.mealsWithTimestamps.map((m) => m.totalCalories);
      const maxMeal = Math.max(...mealCals);
      if (maxMeal > d.todayCalories * 0.5) score += 35; // one meal > 50% of daily
      return Math.min(100, score);
    },
    fetcherKey: "meal_distribution",
  },
  {
    id: "meal_timing",
    category: "meal_balance",
    text: "Am I spacing my meals well?",
    emoji: "🕐",
    isAvailable: (d) =>
      d.mealsWithTimestamps.length >= 2 &&
      d.mealsWithTimestamps.every((m) => m.firstLogTime),
    computeRelevance: (d) => {
      let score = 15;
      // Check for large gaps
      const times = d.mealsWithTimestamps
        .map((m) => new Date(m.firstLogTime).getHours())
        .sort((a, b) => a - b);
      for (let i = 1; i < times.length; i++) {
        if (times[i] - times[i - 1] > 6) score += 30; // > 6 hour gap
      }
      return Math.min(100, score);
    },
    fetcherKey: "meal_timing",
  },
  {
    id: "meal_variety",
    category: "meal_balance",
    text: "How varied are my food choices today?",
    emoji: "🌈",
    isAvailable: (d) => d.todayFoods.length >= 3,
    computeRelevance: (d) => {
      let score = 15;
      const uniqueNames = new Set(
        d.todayFoods.map((f) => f.name.toLowerCase()),
      );
      if (uniqueNames.size < d.todayFoods.length * 0.5) score += 30; // many repeats
      return Math.min(100, score);
    },
    fetcherKey: "meal_variety",
  },

  // === HYDRATION ===
  {
    id: "hydration_status",
    category: "hydration",
    text: "How's my hydration today?",
    emoji: "💧",
    isAvailable: (d) => d.waterTarget > 0,
    computeRelevance: (d) => {
      let score = 20;
      if (d.waterPercent < 50 && d.currentHour >= 12) score += 40; // under half after noon
      if (d.waterPercent < 30) score += 20;
      return Math.min(100, score);
    },
    fetcherKey: "hydration_status",
  },
  {
    id: "hydration_pacing",
    category: "hydration",
    text: "Am I drinking enough water for this time of day?",
    emoji: "🚰",
    isAvailable: (d) => d.waterTarget > 0 && d.currentHour >= 10,
    computeRelevance: (d) => {
      let score = 15;
      const expectedWaterPercent = d.dayProgress * 100;
      if (d.waterPercent < expectedWaterPercent - 20) score += 35;
      return Math.min(100, score);
    },
    fetcherKey: "hydration_pacing",
  },

  // === TRENDS ===
  {
    id: "vs_weekly_avg",
    category: "trends",
    text: "How does today compare to my weekly average?",
    emoji: "📈",
    isAvailable: (d) => d.avgCalories7d > 0 && d.todayMealCount >= 2,
    computeRelevance: (d) => {
      let score = 20;
      const deviation =
        (Math.abs(d.todayCalories - d.avgCalories7d) /
          Math.max(1, d.avgCalories7d)) *
        100;
      if (deviation > 20) score += 35; // > 20% deviation from average
      if (d.currentHour >= 18) score += 15; // evening — day is mostly done
      return Math.min(100, score);
    },
    fetcherKey: "vs_weekly_avg",
  },
  {
    id: "consistency_check",
    category: "trends",
    text: "How consistent has my tracking been this week?",
    emoji: "🔗",
    isAvailable: (d) => d.daysUsingApp >= 3,
    computeRelevance: (d) => {
      let score = 15;
      if (d.loggingStreak >= 7) score += 30; // celebrating consistency
      const loggedDays = d.weeklyDailyTotals.filter((d) => d.logged).length;
      if (loggedDays < 4) score += 25; // inconsistent — worth mentioning
      return Math.min(100, score);
    },
    fetcherKey: "consistency_check",
  },
  {
    id: "trend_direction",
    category: "trends",
    text: "Am I trending in the right direction this week?",
    emoji: "🧭",
    isAvailable: (d) => d.weeklyDailyTotals.filter((d) => d.logged).length >= 5,
    computeRelevance: (d) => {
      let score = 20;
      // Compute trend
      const loggedDays = d.weeklyDailyTotals.filter((d) => d.logged);
      if (loggedDays.length >= 5) {
        const recentAvg = average(loggedDays.slice(-3), "calories");
        const earlierAvg = average(loggedDays.slice(0, 3), "calories");
        const trendPct =
          ((recentAvg - earlierAvg) / Math.max(1, earlierAvg)) * 100;
        if (Math.abs(trendPct) > 10) score += 30; // notable trend
      }
      return Math.min(100, score);
    },
    fetcherKey: "trend_direction",
  },

  // === NUTRIENT GAPS ===
  {
    id: "nutrient_overview",
    category: "nutrient_gaps",
    text: "Are there any nutrients I should pay attention to?",
    emoji: "🧬",
    isAvailable: (d) => d.activeAlerts.length > 0,
    computeRelevance: (d) => {
      let score = 25;
      const concerns = d.activeAlerts.filter((a) => a.severity === "concern");
      if (concerns.length > 0) score += 40;
      const tier1Alerts = d.activeAlerts.filter((a) => a.tier === 1);
      if (tier1Alerts.length > 0) score += 20;
      return Math.min(100, score);
    },
    fetcherKey: "nutrient_overview",
  },
  {
    id: "fiber_check",
    category: "nutrient_gaps",
    text: "Am I getting enough fiber today?",
    emoji: "🥦",
    isAvailable: (d) => d.todayFiber > 0 || d.todayMealCount >= 2,
    computeRelevance: (d) => {
      let score = 15;
      const fiberTarget = 28; // general RDA
      const fiberPercent = safePercent(d.todayFiber, fiberTarget);
      if (fiberPercent < 50) score += 35;
      return Math.min(100, score);
    },
    fetcherKey: "fiber_check",
  },
  {
    id: "micronutrient_status",
    category: "nutrient_gaps",
    text: "What does my micronutrient picture look like?",
    emoji: "🔬",
    isAvailable: (d) => d.activeAlerts.length > 0 && d.daysUsingApp >= 7,
    computeRelevance: (d) => {
      let score = 15;
      if (d.activeAlerts.length >= 2) score += 25;
      if (d.activeAlerts.some((a) => a.severity === "concern")) score += 25;
      return Math.min(100, score);
    },
    fetcherKey: "micronutrient_status",
  },
];

function safePercent(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((value / target) * 100);
}

function average(items: any[], key: string): number {
  if (items.length === 0) return 0;
  return items.reduce((sum, item) => sum + (item[key] || 0), 0) / items.length;
}
```

---

## Appendix B: Category Metadata

```typescript
// src/features/insights/constants/dailyQuestionCategories.ts

import type { DailyQuestionCategoryMeta } from "../types/dailyInsights.types";

export const questionCategories: DailyQuestionCategoryMeta[] = [
  {
    id: "macro_balance",
    label: "Macros & Calories",
    emoji: "🎯",
    description: "Overall calorie and macronutrient progress",
  },
  {
    id: "protein_focus",
    label: "Protein Focus",
    emoji: "💪",
    description: "Protein intake and distribution",
  },
  {
    id: "meal_balance",
    label: "Meal Balance",
    emoji: "⚖️",
    description: "Meal distribution, timing, and variety",
  },
  {
    id: "hydration",
    label: "Hydration",
    emoji: "💧",
    description: "Water intake tracking",
  },
  {
    id: "trends",
    label: "Trends & Patterns",
    emoji: "📊",
    description: "Today in context of your recent history",
  },
  {
    id: "nutrient_gaps",
    label: "Nutrient Gaps",
    emoji: "🧬",
    description: "Micronutrient and fiber awareness",
  },
];
```

---

## Appendix C: Widget Headline Engine

```typescript
// src/features/insights/services/daily/WidgetHeadlineEngine.ts

import type {
  DailyInsightData,
  WidgetHeadlineData,
} from "../../types/dailyInsights.types";

/**
 * Pure template engine — no LLM. Selects the most relevant headline
 * for the widget based on today's data state.
 *
 * Priority order: first matching rule wins.
 */
export function computeWidgetHeadline(
  data: DailyInsightData,
): WidgetHeadlineData {
  const now = Date.now();

  // Rule 1: No data
  if (data.todayMealCount === 0) {
    return {
      text: "Ready to start tracking today? Log your first meal to unlock insights.",
      emoji: "🌿",
      priority: 1,
      computedAt: now,
    };
  }

  // Rule 2: Minimal data
  if (data.todayMealCount === 1 && data.todayCalories < 500) {
    return {
      text: `You've logged 1 meal so far — keep going to see how your day shapes up.`,
      emoji: "🌱",
      priority: 2,
      computedAt: now,
    };
  }

  const remaining = Math.max(0, data.calorieTarget - data.todayCalories);
  const estimatedMealsLeft = estimateRemainingMeals(data);

  // Rule 3: Near/at calorie target
  if (data.caloriePercent >= 90 && data.caloriePercent <= 110) {
    return {
      text: `You've reached ${data.caloriePercent}% of your calorie target today — nicely paced.`,
      emoji: "✨",
      priority: 3,
      computedAt: now,
    };
  }

  // Rule 4: Over calorie target
  if (data.caloriePercent > 110) {
    return {
      text: `${formatNumber(data.todayCalories)} calories logged today — ${data.caloriePercent}% of your ${formatNumber(data.calorieTarget)} target.`,
      emoji: "📊",
      priority: 4,
      computedAt: now,
    };
  }

  // Rule 5: Protein gap
  if (data.proteinPercent < 60 && data.caloriePercent >= 70) {
    return {
      text: `Protein is at ${data.proteinPercent}% while calories are at ${data.caloriePercent}% — room to boost protein in your next meal.`,
      emoji: "💪",
      priority: 5,
      computedAt: now,
    };
  }

  // Rule 6: Hydration reminder (afternoon)
  if (
    data.waterTarget > 0 &&
    data.waterPercent < 50 &&
    data.currentHour >= 13
  ) {
    return {
      text: `Water intake is at ${data.waterPercent}% — a good time to hydrate.`,
      emoji: "💧",
      priority: 6,
      computedAt: now,
    };
  }

  // Rule 7: Streak callout
  if (data.loggingStreak >= 7) {
    return {
      text: `Day ${data.loggingStreak} of consistent logging — your data is getting richer every day.`,
      emoji: "🔗",
      priority: 7,
      computedAt: now,
    };
  }

  // Rule 8: Standard progress (default)
  return {
    text: `${formatNumber(data.todayCalories)} of ${formatNumber(data.calorieTarget)} cal today — ${formatNumber(remaining)} remaining${estimatedMealsLeft > 0 ? ` with ~${estimatedMealsLeft} meal${estimatedMealsLeft === 1 ? "" : "s"} to go` : ""}.`,
    emoji: "🌿",
    priority: 8,
    computedAt: now,
  };
}

function estimateRemainingMeals(data: DailyInsightData): number {
  // Simple estimate: if it's before 6pm and under target, assume meals remain
  if (data.caloriePercent >= 100) return 0;
  if (data.currentHour >= 21) return 0;
  if (data.currentHour >= 18) return 1;
  if (data.currentHour >= 12) return Math.max(1, 3 - data.todayMealCount);
  return Math.max(1, 4 - data.todayMealCount);
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
```

---

_End of specification. This document is self-contained and ready for Claude Code IDE implementation._
