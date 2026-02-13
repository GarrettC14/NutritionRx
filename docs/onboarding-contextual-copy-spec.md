# Feature 2: Onboarding Contextual Copy — Implementation Spec

## Copy Reference

| Step | Route | Subtitle Copy |
|---|---|---|
| 1 | goal | Your goal shapes everything — from daily targets to the insights you'll see. |
| 2 | about-you | Age and sex help us estimate your body's daily energy needs. |
| 3 | body-stats | Height and weight help us find a starting point that fits your body. |
| 4 | activity | Your activity level shapes how many calories you need each day. |
| 5 | eating-style | Your preferences help us suggest a carb and fat balance you'll enjoy. |
| 6 | protein | Protein needs vary by goal — we'll calibrate yours to match. |
| 7 | target | Adjust to your comfort level — you can change this anytime. |
| 8 | your-plan | Built from everything you shared — and easy to adjust as you go. |

## Files Changed

- `src/constants/onboarding-copy.ts` — new centralized copy constants
- `src/app/onboarding/*.tsx` — 8 screens updated to use ONBOARDING_SUBTITLES

## Merge Order

1. Feature 5 (Recent Foods) — merged
2. Feature 1 (Progress Bar) — merged
3. Feature 2 (this branch) — rebase onto master after Feature 1
4. Feature 3 (Dashboard Edit)
5. Feature 4 (Empty States)
