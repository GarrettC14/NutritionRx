# NutritionRx Future Features Roadmap

## Overview

This document outlines potential features for future versions of NutritionRx. All features listed here use **free APIs or are self-contained** — no paid services required.

**Guiding Principles:**
- Zero operational cost
- Maintains simplicity (don't become MyFitnessPal)
- Privacy-first
- Genuine value-add (not feature bloat)

---

## 1. Free Differentiators (V1.1 - V2.0)

These features would set NutritionRx apart from competitors while remaining free to implement.

### 1.1 Apple Health / Health Connect Sync

**What it does:** Bidirectional sync with iOS Health and Android Health Connect

**Implementation:**
- Write: Weight, calories, macros to Health
- Read: Weight from other apps (smart scales, etc.)
- Read: Active calories for TDEE refinement

**Why it's valuable:**
- Users with smart scales get automatic weight sync
- Unified health data ecosystem
- Competes with Cronometer/Lose It! on integration

**Cost:** Free (native APIs)

**Libraries:**
- iOS: `react-native-health`
- Android: `react-native-health-connect`

```typescript
// Example: Sync weight from Apple Health
const recentWeights = await AppleHealthKit.getWeightSamples({
  startDate: lastSyncDate,
  endDate: new Date().toISOString(),
});

for (const sample of recentWeights) {
  // Only import if we don't have an entry for this date
  const existing = await weightRepository.getByDate(sample.date);
  if (!existing) {
    await weightRepository.insert({
      date: sample.date,
      weightKg: sample.value,
      source: 'apple_health',
    });
  }
}
```

---

### 1.2 Home Screen Widgets

**What it does:** Native widgets showing daily progress

**Widget Types:**

1. **Small Widget (2x2)**
   - Calorie ring only
   - "1,420 / 2,000"

2. **Medium Widget (4x2)**
   - Calorie ring + macro bars
   - Quick-add button

3. **Large Widget (4x4)**
   - Full daily summary
   - Recent foods
   - Quick actions

**Why it's valuable:**
- Reduces friction to check progress
- Most competitors don't have good widgets
- Native feel, not webview

**Cost:** Free (native development)

**Implementation:** 
- iOS: WidgetKit with SwiftUI
- Android: Jetpack Glance

---

### 1.3 Siri Shortcuts / Google Assistant

**What it does:** Voice logging and queries

**Commands:**

```
"Hey Siri, log my weight as 175 pounds"
→ Creates weight entry

"Hey Siri, what have I eaten today?"
→ Reads back daily summary

"Hey Siri, quick add 500 calories for lunch"
→ Creates quick add entry

"OK Google, ask NutritionRx how many calories I've had"
→ Returns calorie count
```

**Why it's valuable:**
- Hands-free logging while cooking
- Accessibility improvement
- Premium feel, free to implement

**Cost:** Free (native APIs)

---

### 1.4 Watch App (Apple Watch / Wear OS)

**What it does:** Glanceable progress + quick logging

**Features:**
- Complication showing calorie ring
- View daily progress
- Quick-add calories
- Log recent foods
- Log weight

**Why it's valuable:**
- Extends app to wrist
- Complements GymRx watch app
- MyFitnessPal watch app is mediocre

**Cost:** Free (development time only)

---

### 1.5 Copy Meals Between Days

**What it does:** Quickly replicate meals

**Features:**
- Copy single meal to another day
- Copy entire day's food
- "Repeat yesterday" button
- Meal templates (save combinations)

**Why it's valuable:**
- People eat similar things
- Reduces daily logging friction
- Top-requested feature in competitor reviews

**Cost:** Free

```typescript
// Copy all entries from one day to another
async function copyDay(fromDate: string, toDate: string): Promise<void> {
  const entries = await logRepository.getByDate(fromDate);
  const quickAdds = await quickAddRepository.getByDate(fromDate);
  
  for (const entry of entries) {
    await logRepository.insert({
      ...entry,
      id: generateUUID(),
      date: toDate,
      createdAt: new Date(),
    });
  }
  
  for (const quickAdd of quickAdds) {
    await quickAddRepository.insert({
      ...quickAdd,
      id: generateUUID(),
      date: toDate,
      createdAt: new Date(),
    });
  }
}
```

---

### 1.6 Multi-Day View / Week at a Glance

**What it does:** See patterns across the week

**Features:**
- 7-day calorie heatmap
- Weekly average display
- Trend indicators
- Tap day to view/edit

**Why it's valuable:**
- Helps identify patterns (weekend overeating, etc.)
- More useful than just "today" view
- Clean implementation unique to our aesthetic

**Cost:** Free

---

### 1.7 Smart Recent Foods

**What it does:** Contextually suggest foods based on patterns

**Features:**
- "You usually have [X] for breakfast on Mondays"
- Time-of-day suggestions
- Frequently paired foods
- One-tap to add

**Why it's valuable:**
- Machine learning feel without ML cost
- Simple pattern matching is effective
- Reduces friction for routine eaters

**Cost:** Free (local pattern analysis)

```typescript
// Simple pattern matching for suggestions
async function getSuggestionsForMeal(
  mealType: MealType,
  dayOfWeek: number
): Promise<FoodItem[]> {
  // Get foods logged for this meal type on this day of week
  const historicalEntries = await logRepository.query(`
    SELECT food_item_id, COUNT(*) as frequency
    FROM log_entries
    WHERE meal_type = ?
      AND strftime('%w', date) = ?
    GROUP BY food_item_id
    ORDER BY frequency DESC
    LIMIT 5
  `, [mealType, dayOfWeek]);
  
  const foodIds = historicalEntries.map(e => e.food_item_id);
  return foodRepository.getByIds(foodIds);
}
```

---

### 1.8 Nutrition Insights (No AI Required)

**What it does:** Simple, rule-based observations

**Examples:**
- "You hit your protein goal 5 days this week 💪"
- "Your average intake this week: 1,920 cal"
- "You tend to eat more on weekends"
- "You've logged every day for 2 weeks!"

**Why it's valuable:**
- Encouragement without judgment
- Data becomes actionable
- No AI/ML costs

**Cost:** Free (rule-based logic)

```typescript
// Generate weekly insights
function generateWeeklyInsights(weekData: DailyTotals[]): string[] {
  const insights: string[] = [];
  
  // Streak detection
  const streak = calculateLoggingStreak();
  if (streak >= 7) {
    insights.push(`You've logged every day for ${streak} days!`);
  }
  
  // Protein goal achievement
  const proteinDays = weekData.filter(d => d.protein >= d.proteinGoal).length;
  if (proteinDays >= 5) {
    insights.push(`You hit your protein goal ${proteinDays} days this week 💪`);
  }
  
  // Weekend pattern
  const weekdayAvg = average(weekData.filter(d => !isWeekend(d.date)).map(d => d.calories));
  const weekendAvg = average(weekData.filter(d => isWeekend(d.date)).map(d => d.calories));
  if (weekendAvg > weekdayAvg * 1.2) {
    insights.push("You tend to eat more on weekends — that's normal!");
  }
  
  return insights;
}
```

---

## 2. V2.0+ Features (Consider Later)

### 2.1 Recipe Import from URL

**What it does:** Paste a recipe URL, get nutrition info

**Implementation:**
- Use free recipe schema parsing (schema.org/Recipe)
- Parse ingredients, estimate nutrition
- Save as custom food

**Challenges:**
- Accuracy varies by recipe site
- Ingredient parsing is imprecise
- Could frustrate users if inaccurate

**Recommendation:** Consider for V2, implement carefully

---

### 2.2 Photo Food Logging

**What it does:** Take photo, AI identifies food

**Reality Check:**
- Accurate AI requires paid APIs (OpenAI, Google Vision)
- Free alternatives are unreliable
- Users expect magic, get frustration

**Recommendation:** Skip unless free, accurate solution emerges

---

### 2.3 Intermittent Fasting Timer

**What it does:** Track eating window

**Features:**
- Start/stop eating window
- Common protocols (16:8, 18:6, etc.)
- History of fasting periods

**Why it might fit:**
- Complements calorie tracking
- Simple to implement
- Yazio does this well

**Why it might not:**
- Scope creep
- Different user base
- Could be separate app

**Recommendation:** Consider for V2 if user demand exists

---

### 2.4 Water Tracking

**What it does:** Log water intake

**Features:**
- Quick-add glasses/bottles
- Daily goal
- Widget support

**Why it might fit:**
- Frequently requested
- Simple addition
- Health syncs expect it

**Why it might not:**
- Hydration science is contested
- "8 glasses a day" is a myth
- Adds complexity

**Recommendation:** Add minimally if users request, don't emphasize

---

## 3. Explicitly NOT Building

These features don't fit our philosophy:

| Feature | Reason |
|---------|--------|
| **Social features** | Privacy-first, adds complexity |
| **Gamification/streaks** | Can become anxiety-inducing |
| **Premium tier** | Keep free, monetize via GymRx bundle later |
| **Recipe builder** | Complex, better served by other apps |
| **Meal planning** | Different problem space |
| **Micronutrients** | Cronometer does this better |
| **AI photo logging** | Requires paid APIs, unreliable |
| **Cloud sync** | Privacy concern, operational cost |
| **Ads** | Ruins experience |

---

## 4. Implementation Priority

### V1.1 (Month after launch)
1. Copy meals between days
2. Bug fixes from user feedback
3. Performance optimization

### V1.5 (3 months)
1. Apple Health / Health Connect sync
2. Home screen widgets
3. Multi-day view

### V2.0 (6 months)
1. Watch app
2. Siri / Google Assistant
3. Smart suggestions
4. Weekly insights

---

## 5. Competitive Advantage Summary

| Feature | MyFitnessPal | Cronometer | Lose It | **NutritionRx** |
|---------|--------------|------------|---------|-----------------|
| Free barcode scan | ❌ (Premium) | ✅ | ❌ | ✅ |
| Offline-first | ❌ | ❌ | ❌ | ✅ |
| No account required | ❌ | ❌ | ❌ | ✅ |
| Adaptive targets | ❌ | ❌ | ❌ | ✅ |
| Native charts | ❌ | ❌ | ❌ | ✅ |
| Privacy-first | ❌ | ⚠️ | ❌ | ✅ |
| No ads | ❌ | ❌ | ❌ | ✅ |
| Health sync | ✅ | ✅ | ✅ | ✅ (V1.5) |
| Watch app | ⚠️ | ❌ | ⚠️ | ✅ (V2) |

Our differentiators: **Free barcode scanning + Offline-first + No account + Adaptive targets + Privacy**

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-25 | Initial roadmap |
