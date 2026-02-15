/**
 * Hook for resolving the effective macro targets for a given date.
 *
 * Resolution order:
 *   1. User override for this specific date
 *   2. Macro cycling target for this day-of-week (if cycling is active)
 *   3. Base targets from useGoalStore (default)
 *
 * All downstream UI should use this hook instead of reading
 * useGoalStore directly for target values.
 */

import { useState, useEffect } from 'react';
import { useGoalStore } from '@/stores/goalStore';
import { useMacroCycleStore } from '@/stores/macroCycleStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { macroCycleRepository } from '@/repositories';
import { DayTargets } from '@/types/planning';

type TargetSource = 'base' | 'cycling' | 'override';

interface ResolvedTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: TargetSource;
}

export function useResolvedTargets(date?: string): ResolvedTargets {
  const calorieGoal = useGoalStore((s) => s.calorieGoal);
  const proteinGoal = useGoalStore((s) => s.proteinGoal);
  const carbGoal = useGoalStore((s) => s.carbGoal);
  const fatGoal = useGoalStore((s) => s.fatGoal);

  const config = useMacroCycleStore((s) => s.config);
  const todayOverride = useMacroCycleStore((s) => s.todayOverride);
  const isPremium = useSubscriptionStore((s) => s.isPremium);

  const baseTargets: DayTargets = {
    calories: calorieGoal || 2000,
    protein: proteinGoal || 150,
    carbs: carbGoal || 250,
    fat: fatGoal || 65,
  };

  const [resolved, setResolved] = useState<ResolvedTargets>({
    ...baseTargets,
    source: 'base',
  });

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      // If cycling is not enabled or user is not premium, short-circuit to base targets
      if (!config || !config.enabled || !isPremium) {
        if (!cancelled) {
          setResolved({ ...baseTargets, source: 'base' });
        }
        return;
      }

      // Use today's date if none provided. new Date().getDay() is always local timezone.
      const resolveDate = date || new Date().toISOString().split('T')[0];

      try {
        const targets = await macroCycleRepository.getTargetsForDate(resolveDate, baseTargets);

        if (cancelled) return;

        // Determine source by comparing to base targets
        // The repo checks overrides first, then cycling config, then returns base
        if (todayOverride && !date) {
          // If there's a today override and we're resolving for today,
          // check if the returned targets match the override
          const matchesOverride =
            targets.calories === todayOverride.calories &&
            targets.protein === todayOverride.protein &&
            targets.carbs === todayOverride.carbs &&
            targets.fat === todayOverride.fat;
          setResolved({
            ...targets,
            source: matchesOverride ? 'override' : 'cycling',
          });
        } else {
          // Check if targets differ from base — if so, they came from cycling
          const matchesBase =
            targets.calories === baseTargets.calories &&
            targets.protein === baseTargets.protein &&
            targets.carbs === baseTargets.carbs &&
            targets.fat === baseTargets.fat;
          setResolved({
            ...targets,
            source: matchesBase ? 'base' : 'cycling',
          });
        }
      } catch (error) {
        // On error, fall back to base targets
        if (!cancelled) {
          setResolved({ ...baseTargets, source: 'base' });
        }
      }
    };

    resolve();

    return () => {
      cancelled = true;
    };
  }, [calorieGoal, proteinGoal, carbGoal, fatGoal, config, todayOverride, date, isPremium]);

  return resolved;
}
