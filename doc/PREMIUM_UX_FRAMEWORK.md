# Premium UX Framework
## GymRx & NutritionRx - Cascade Software Solutions LLC

**Purpose:** This document establishes binding UX patterns for all premium feature implementations. Every feature must conform to these patterns to maintain coherent, simple, modern design across both apps.

**Principle:** Premium features enhance the existing experience—they don't complicate it. Users should feel the app got smarter, not busier.

---

# PART 1: PREMIUM GATING PHILOSOPHY

## 1.1 Core Principles

1. **Visible but not intrusive** — Free users should know premium features exist without feeling constantly sold to
2. **Functional preview when possible** — Show what the feature does, then gate the full capability
3. **Single upgrade path** — One paywall design, one upgrade flow, everywhere
4. **Graceful degradation** — Premium features failing (API down, limit reached) should never break the core app

## 1.2 Gating Strategy by Feature Type

| Feature Type | Gating Approach | Example |
|--------------|-----------------|---------|
| **Data/Analytics** | Blurred preview + lock | Micronutrient chart shows blurred data with lock overlay |
| **AI-Powered Actions** | Visible button with lock, paywall on tap | AI Photo button visible, tapping shows paywall for free users |
| **Configuration/Settings** | Visible with lock icon | Macro Cycling row appears in settings with lock, tapping opens paywall |
| **Widgets** | Visible in picker with lock | Widget picker shows premium widgets with subtle lock badge |
| **Import/Export** | Visible menu item with lock | "Export Data" shows lock icon, tapping opens paywall |

**Philosophy:** Users should see what they *could* have. Visibility creates desire. The lock treatment must feel like "this is waiting for you" not "pay up now."

## 1.3 Visual Language for Locked State

**Lock Icon:** Use a subtle, small lock icon (12-14px) in the app's secondary text color. Never red, never alarming.

**Blur Treatment:** For blurred previews, use a 12px gaussian blur with a centered lock icon and single line of text: "Upgrade to unlock"

**Premium Badge:** Small pill badge with "PRO" text used sparingly—only in feature discovery contexts (widget picker, settings headers), never on primary UI.

---

# PART 2: PAYWALL DESIGN

## 2.1 Single Paywall Component

Both apps use ONE paywall component with theme-appropriate styling. This ensures consistency and simplifies maintenance.

**File Location:** `src/components/premium/PaywallScreen.tsx`

## 2.2 Paywall Structure

```
┌─────────────────────────────────────────┐
│                                         │
│         [App Logo / Icon]               │
│                                         │
│      Unlock [Feature Category]          │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  ✓ Feature benefit 1            │    │
│  │  ✓ Feature benefit 2            │    │
│  │  ✓ Feature benefit 3            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Monthly          $4.99/mo      │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  Annual      ✦ SAVE 33%         │    │
│  │              $39.99/yr          │    │  ← Highlighted as best value
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  Both Apps Bundle               │    │
│  │  $59.99/yr (save 40%)           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Continue]                             │
│                                         │
│  Restore Purchases    Terms & Privacy   │
│                                         │
└─────────────────────────────────────────┘
```

## 2.3 Paywall Trigger Contexts

The paywall accepts a `context` prop that customizes the header and benefit list:

| Context | Header | Benefits Shown |
|---------|--------|----------------|
| `ai_photo` | "AI Food Recognition" | Photo logging, instant macros, 30 scans/day |
| `restaurant` | "Restaurant Menus" | 100+ chains, full nutrition data, search |
| `insights` | "Smart Insights" | AI analysis, personalized tips, trends |
| `analytics` | "Advanced Analytics" | Extended history, micronutrients, exports |
| `planning` | "Meal Planning" | Meal prep, macro cycling, fasting timer |
| `coaching` | "Advanced Coaching" | RIR coaching, periodization, recovery |
| `general` | "Unlock Premium" | All features list (used for settings upsell) |

## 2.4 Paywall Presentation

- **Presentation style:** Full-screen modal (not bottom sheet)
- **Animation:** `fade` (consistent with onboarding/legal patterns)
- **Dismiss:** X button top-right, no gesture dismiss
- **Route:** `/paywall` with `context` query param

---

# PART 3: FEATURE PLACEMENT MAP

## 3.1 NutritionRx Feature Placement

### Today Tab (/(tabs)/index)
| Feature | Placement | UI Pattern |
|---------|-----------|------------|
| Fasting Timer | New widget in dashboard | Collapsible widget, similar to existing Water widget |
| LLM Daily Summary | New section below meals | Collapsible "Daily Insights" section at bottom |

### Add Food Flow (/add-food/)
| Feature | Placement | UI Pattern |
|---------|-----------|------------|
| AI Photo Recognition | Bottom actions bar | **Replaces Quick Add button** |
| Restaurant Database | Already exists at /restaurant/ | Gate existing flow with premium check |

**Add Food Layout:**
```
┌─────────────────────────────────────────┐
│ [🔍 Search................................] [▦]  ← Barcode stays by search
│                                         │
│ Favorites (collapsible)                 │
│ Recent (collapsible)                    │
│                                         │
│ ─────────────────────────────────────── │
│ [📷 AI Photo]         [+ Create Food]   │  ← AI Photo replaces Quick Add
└─────────────────────────────────────────┘
```

**Rationale:** AI Photo is "smart Quick Add"—it replaces the manual macro entry path with an intelligent one. Free users see the button but get paywall on tap. Barcode remains next to search as the fast lookup companion.

### Progress Tab (/(tabs)/progress)
| Feature | Placement | UI Pattern |
|---------|-----------|------------|
| Micronutrient Tracking | New chart section | Collapsible section below MacroChart |
| Nutrient Deficiency Alerts | Within Micronutrient section | Inline alert cards |
| Extended Analytics | Existing charts | Remove 30-day limit, add 90d/1yr/all options |
| Progress Photos | New section | Collapsible section with photo grid |
| LLM Insights | New section at bottom | Collapsible "AI Analysis" section |

**Progress Tab Section Order:**
1. Time Range Selector (existing)
2. Log Weight Button (existing)
3. Weight Chart (existing)
4. Calorie Chart (existing)
5. Macro Chart (existing)
6. **Micronutrients (NEW - Premium)**
7. **Progress Photos (NEW - Premium)**
8. Insights Section (existing - enhance with premium)
9. **AI Analysis (NEW - Premium)**

### Settings (/settings/)
| Feature | Placement | UI Pattern |
|---------|-----------|------------|
| Macro Cycling | Extend /settings/nutrition | New section within existing screen |
| Fasting Timer Config | New /settings/fasting | New nested screen under GOALS |
| Meal Planning | New /settings/meal-planning | New nested screen under GOALS |
| Data Export | /settings/ DATA section | New row "Export Data" with lock for free |
| Competitor Import | Existing /import-data/ | Gate premium sources (MFP, MacroFactor) |

**Updated Settings Structure:**
```
Settings
├── GOALS
│   ├── /goals (existing)
│   ├── /profile (existing)
│   ├── /nutrition (existing) ← Macro Cycling added here [🔒]
│   ├── /water (existing)
│   ├── /fasting [🔒 Premium]
│   └── /meal-planning [🔒 Premium]
├── PREFERENCES (existing)
├── DATA
│   ├── /apple-health (existing)
│   ├── /health-connect (existing)
│   ├── /import-data (existing) ← Premium sources show [🔒]
│   └── Export Data [🔒 Premium]
├── PREMIUM (NEW)
│   └── Manage Subscription / Upgrade
├── LEGAL (existing)
└── ABOUT (existing)
```

**Note:** All premium settings rows are visible to free users with a subtle lock icon. Tapping opens paywall with relevant context.

---

## 3.2 GymRx Feature Placement

### Home Tab (/(tabs)/index - Dashboard)
| Feature | Placement | UI Pattern |
|---------|-----------|------------|
| Recovery Recommendations | New widget | Dashboard widget (user can add/remove) |
| LLM Training Summary | New widget | Dashboard widget with weekly analysis |
| Movement Balance Preview | New widget | Small balance indicator widget |

**New Premium Widgets for Widget Picker:**
- Recovery Status Widget
- AI Training Insights Widget
- Movement Balance Widget (compact)
- Volume Landmarks Widget

### Workout Tab (/(tabs)/workout)
| Feature | Placement | UI Pattern |
|---------|-----------|------------|
| Workout Duration Targets | Template settings | New field when editing template |
| Exercise Substitutions | Active workout | "Substitute" button on exercise row |

### Active Workout (/workout/active)
| Feature | Placement | UI Pattern |
|---------|-----------|------------|
| Advanced RIR Coaching | Set logging row | Enhanced Push Coach suggestions inline |
| Exercise Substitutions | Exercise header | Overflow menu → "Find Substitute" |
| Duration Target | Header area | Elapsed vs target timer display |

### History Tab (/(tabs)/history)
No premium features—keeps historical record accessible to all users.

### Analytics (/analytics/)
| Feature | Placement | UI Pattern |
|---------|-----------|------------|
| **Customizable Analytics Layout** | Entire screen | Premium users can add/remove/reorder chart sections |
| Movement Pattern Balance | New section | Full chart + breakdown below existing content |
| Volume Landmarks (MEV/MRV) | New section | Volume chart with landmark lines |
| Extended History | Existing charts | Remove time limits |

**Analytics Customization (Premium):**
```
Free Users:                          Premium Users:
┌─────────────────────┐              ┌─────────────────────┐
│ Volume Chart        │              │ [Edit Layout]       │
│ Calendar Heatmap    │              │                     │
│ Basic Insights      │              │ § Volume + Landmarks│  ← Draggable
│                     │              │ § Movement Balance  │  ← Can add/remove
│ [Blurred sections   │              │ § Calendar Heatmap  │
│  with lock overlay] │              │ § Recovery Status   │
└─────────────────────┘              │ § [+ Add Section]   │
                                     └─────────────────────┘
```

This mirrors the Home dashboard customization pattern—premium users curate their analytics view.

**Analytics Screen Section Order:**
1. Time Range Selector (existing)
2. Volume Chart (existing)
3. **Volume Landmarks Overlay (NEW - Premium)** ← Enhances existing chart
4. Streak/Calendar Heatmap (existing)
5. **Movement Balance (NEW - Premium)**
6. Exercise Drill-down (existing)

### Profile Tab (/(tabs)/profile)
| Feature | Placement | UI Pattern |
|---------|-----------|------------|
| Subscription Management | New section | "Premium" section above existing content |

### Settings (/settings/)
| Feature | Placement | UI Pattern |
|---------|-----------|------------|
| Training Block Periodization | New /settings/periodization | New nested screen |
| Deload Week Scheduling | Within periodization screen | Sub-section of periodization |
| Data Export | DATA section | New row with lock for free users |
| Competitor Import | DATA section | New row, gate premium sources |

**Updated Settings Structure:**
```
Settings
├── TRAINING (NEW category)
│   ├── /periodization [🔒 Premium]
│   └── Push Coach (existing, moved here)
├── PREFERENCES
│   ├── Units (existing)
│   ├── Timer (existing)
│   └── Widgets (existing)
├── DATA
│   ├── /healthkit or /health-connect (existing)
│   ├── /import-data (existing) ← Premium sources show [🔒]
│   └── Export Data [🔒 Premium]
├── PREMIUM (NEW)
│   └── Manage Subscription / Upgrade
└── ABOUT (existing)
```

**Note:** All premium settings rows are visible to free users with a subtle lock icon. Tapping opens paywall with relevant context.

---

# PART 4: UI PATTERN RULES

## 4.1 Allowed Patterns (Use Only These)

| Pattern | When to Use | Implementation |
|---------|-------------|----------------|
| **Bottom Sheet** | Quick edits, confirmations, single-step actions | `presentation: 'modal'` + `slide_from_bottom` |
| **Full-Screen Modal** | Immersive flows, onboarding, paywall, active workout | `presentation: 'fullScreenModal'` + `fade` |
| **Push Screen** | Navigation to new content, detail views | Default stack animation |
| **Collapsible Section** | Information density, optional detail | `CollapsibleSection` component |
| **Inline Expansion** | Progressive disclosure within a screen | Animated height with `LayoutAnimation` |
| **Dashboard Widget** | GymRx home customization | Existing widget system |
| **Toast** | Transient feedback, confirmations | Existing toast system |

## 4.2 Forbidden Patterns

- ❌ **Alert dialogs for upsells** — Never use native Alert() for premium prompts
- ❌ **Popups/Popovers for features** — Use push navigation or collapsible sections instead
- ❌ **Multiple modal layers** — Never show a modal on top of a modal
- ❌ **Inline paywalls** — Always navigate to dedicated paywall screen
- ❌ **Feature-specific paywall designs** — One paywall component, context-customized

## 4.3 Animation Consistency

| Transition Type | Animation | Duration |
|-----------------|-----------|----------|
| Tab switch | None (instant) | 0ms |
| Push to detail | Platform default | Native |
| Modal present | fade | 300ms |
| Bottom sheet | slide_from_bottom | 300ms |
| Collapsible expand | LayoutAnimation.easeInEaseOut | 200ms |
| Widget reorder | spring | Native |

---

# PART 5: PREMIUM FEATURE DISCOVERY

## 5.1 Passive Discovery (User Encounters Naturally)

These touchpoints exist in the normal user flow:

| Location | What User Sees | Trigger |
|----------|----------------|---------|
| Add Food (NutritionRx) | Camera button with subtle PRO badge | Always visible |
| Progress Charts (NutritionRx) | Blurred micronutrient section | After logging 7+ days |
| Widget Picker (GymRx) | Premium widgets with lock icons | When customizing dashboard |
| Analytics (GymRx) | "Unlock Movement Balance" card | After 5+ workouts |
| Settings | PREMIUM section with "Upgrade" row | Always visible |

## 5.2 Active Discovery (Prompted)

Occasional, tasteful prompts based on user behavior:

| Trigger | Prompt | Frequency |
|---------|--------|-----------|
| 14 days of use | "You've been consistent! Unlock advanced insights?" | Once |
| 50 foods logged | "Ready for AI-powered logging?" | Once |
| 10 workouts completed | "Unlock recovery recommendations?" | Once |
| Tapped locked feature 3x | "Interested in [feature]? Here's what you get..." | Once per feature |

**Rules:**
- Maximum 1 prompt per week
- Never interrupt active logging/workout
- Always dismissible with "Not now" (no penalty)
- Track shown prompts to never repeat

## 5.3 Settings Premium Section

Both apps get a new PREMIUM section in settings:

```
┌─────────────────────────────────────────┐
│ PREMIUM                                 │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ ★ Upgrade to Premium           →    │ │  ← For free users
│ │   Unlock all features               │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

— OR (for premium users) —

┌─────────────────────────────────────────┐
│ PREMIUM                                 │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ ★ Premium Active              →     │ │
│ │   Manage subscription               │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ AI Usage                            │ │
│ │   Photo scans: 12/30 today          │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

# PART 6: INFORMATION HIERARCHY

## 6.1 Feature Visibility Tiers

**Tier 1 - Always Accessible (Core Free Features)**
- Food/workout logging
- Basic charts (30 days)
- Favorites, templates
- Streak tracking

**Tier 2 - Visible, Blurred Preview (Data/Analytics Premium)**
- Micronutrient section (blurred chart)
- Movement Balance (blurred)
- LLM Insights sections (blurred)
- Volume Landmarks overlay (blurred)

**Tier 3 - Visible, Locked (Action/Config Premium)**
- AI Photo button (visible, lock badge, paywall on tap)
- Premium widgets in picker (visible with lock)
- Macro Cycling in settings (visible row with lock)
- Fasting Timer in settings (visible row with lock)
- Periodization in settings (visible row with lock)
- Export/Import options (visible with lock)

## 6.2 Why This Hierarchy?

- **Tier 1**: Core functionality never feels limited
- **Tier 2**: Users see the *shape* of premium value (blurred data implies "there's more here")
- **Tier 3**: Users see premium *actions* they could take, creating clear upgrade motivation

**Key principle:** Nothing is hidden. Free users see the full app surface with clear indicators of what premium unlocks. This feels expansive ("look what's possible") not restrictive ("you can't do this").

---

# PART 7: QUOTA & LIMIT DISPLAYS

## 7.1 AI Feature Quotas

For rate-limited features (Photo Recognition, Voice Logging):

**During Use:**
```
┌─────────────────────────────────────────┐
│ [Photo captured]                        │
│                                         │
│ Analyzing...                            │
│                                         │
│ 28 of 30 daily scans remaining          │  ← Subtle, bottom of screen
└─────────────────────────────────────────┘
```

**When Approaching Limit (5 remaining):**
```
┌─────────────────────────────────────────┐
│ ⚠ 5 photo scans remaining today         │
│ Resets at midnight                      │
└─────────────────────────────────────────┘
```

**When Limit Reached:**
```
┌─────────────────────────────────────────┐
│ Daily limit reached                     │
│                                         │
│ You've used all 30 photo scans today.   │
│ Your limit resets at midnight.          │
│                                         │
│ [OK]                                    │
└─────────────────────────────────────────┘
```

## 7.2 Quota Location

- **In-context**: Show remaining during the feature use
- **Settings**: Show in PREMIUM section for premium users
- **Never**: Don't show quota to free users (they see paywall, not quota)

---

# PART 8: ERROR STATES

## 8.1 Premium Feature Failures

When AI features fail (API error, network issue):

```
┌─────────────────────────────────────────┐
│ Couldn't analyze photo                  │
│                                         │
│ Please try again. This scan won't       │
│ count against your daily limit.         │
│                                         │
│ [Try Again]    [Log Manually]           │
└─────────────────────────────────────────┘
```

**Rules:**
- Failed attempts don't count against quota
- Always offer manual fallback
- Never block core functionality due to premium feature failure

## 8.2 Subscription State Errors

| State | Behavior |
|-------|----------|
| Subscription expired | Revert to free, show "Your subscription has ended" banner once |
| Payment failed | Show "Payment issue" in settings, features remain for 7-day grace |
| Restore failed | "Couldn't restore. Please try again or contact support." |

---

# PART 9: IMPLEMENTATION CHECKLIST

## 9.1 Before Implementing Any Premium Feature

- [ ] Confirm feature placement matches this document
- [ ] Identify which gating approach applies (blur, hide, lock icon)
- [ ] Determine paywall context string
- [ ] Check if feature needs quota tracking
- [ ] Verify UI pattern is in the "allowed" list

## 9.2 Required Components (Build First)

1. **SubscriptionContext** — Provides `isPremium`, `subscribe()`, `restore()`
2. **PaywallScreen** — Single paywall with context customization
3. **PremiumGate** — Wrapper component that shows children or paywall trigger
4. **LockedOverlay** — Blur + lock treatment for preview gating
5. **PremiumBadge** — Small "PRO" pill for feature discovery
6. **UsageTracker** — Quota management for AI features

## 9.3 Per-Feature Implementation Template

When starting a feature implementation chat, reference this framework and provide:

```markdown
## Feature: [Name]

### Framework Compliance
- **Placement**: [From Part 3 of this doc]
- **Gating approach**: [From Part 1.2]
- **Paywall context**: [From Part 2.3]
- **UI pattern**: [From Part 4.1]
- **Discovery tier**: [From Part 6.1]

### Implementation Scope
[Feature-specific requirements]
```

---

# PART 10: RESEARCH BATCHES

When deeper UX research is needed, group features by interaction pattern:

## Batch 1: Smart Insights (Both Apps)
- LLM Insights (NutritionRx)
- LLM Analysis (GymRx)
- Recovery Recommendations (GymRx)
- Nutrient Deficiency Alerts (NutritionRx)

**Research focus:** How do fitness/nutrition apps present AI-generated insights? What makes them feel helpful vs. gimmicky?

## Batch 2: Enhanced Logging (NutritionRx)
- AI Photo Recognition
- Restaurant Database (already has routes)

**Research focus:** Camera-based food logging UX (Lose It, MyFitnessPal, FoodNoms). How to handle uncertainty in AI estimates?

## Batch 3: Planning & Periodization
- Macro Cycling (NutritionRx)
- Meal Planning (NutritionRx)
- Intermittent Fasting Timer (NutritionRx)
- Training Block Periodization (GymRx)
- Deload Scheduling (GymRx)

**Research focus:** How do apps handle complex scheduling without overwhelming UI? (MacroFactor, RP Hypertrophy, Zero fasting app)

## Batch 4: Advanced Analytics
- Micronutrient Tracking (NutritionRx)
- Movement Pattern Balance (GymRx)
- Volume Landmarks (GymRx)
- Progress Photos (NutritionRx)

**Research focus:** Data visualization for fitness apps. How to show complex data simply? (Cronometer for micros, RP app for volume)

## Batch 5: Data Portability
- CSV/JSON Export (Both)
- Competitor Import (Both)

**Research focus:** Export formats users expect. Import mapping challenges from Strong, Hevy, MFP, MacroFactor.

---

# APPENDIX A: Quick Reference Card

## NutritionRx Premium Features at a Glance

| Feature | Location | Gate Type |
|---------|----------|-----------|
| AI Photo | Add Food → Replaces Quick Add | Visible, locked |
| Restaurant DB | Add Food → Browse Restaurants | Existing route, gate content |
| Micronutrients | Progress → New section | Blurred preview |
| Deficiency Alerts | Progress → Within Micros | Visible, locked |
| LLM Insights | Progress → Bottom section | Blurred preview |
| Progress Photos | Progress → New section | Visible, locked |
| Macro Cycling | Settings → Nutrition | Visible, locked |
| Fasting Timer | Today + Settings | Visible, locked |
| Meal Planning | Settings → New screen | Visible, locked |
| Data Export | Settings → Data | Visible, locked |
| Competitor Import | Settings → Import | Gate premium sources |

## GymRx Premium Features at a Glance

| Feature | Location | Gate Type |
|---------|----------|-----------|
| **Customizable Analytics** | Analytics screen | Visible, locked (free gets fixed layout) |
| LLM Analysis | Home → Widget | Visible in picker, locked |
| Movement Balance | Analytics → New section | Blurred preview |
| Recovery Recs | Home → Widget | Visible in picker, locked |
| Advanced RIR | Active Workout → Sets | Visible, locked |
| Periodization | Settings → New screen | Visible, locked |
| Deload Scheduling | Settings → Within Periodization | Visible, locked |
| Volume Landmarks | Analytics → Overlay on chart | Blurred preview |
| Duration Targets | Template settings | Visible, locked |
| Exercise Subs | Active Workout → Menu | Visible, locked |
| Data Export | Settings → Data | Visible, locked |
| Competitor Import | Settings → Data | Gate premium sources |

---

*Document Version: 1.0*
*Created: January 28, 2026*
*Cascade Software Solutions LLC*
