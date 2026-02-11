/**
 * useFilteredNutrients Hook
 * Filters, sorts, and groups nutrients by subcategory for the detail screen
 */

import { useMemo } from 'react';
import {
  NutrientDefinition,
  NutrientIntake,
  NutrientStatus,
  NutrientSubcategory,
} from '@/types/micronutrients';
import {
  ALL_NUTRIENTS,
  NUTRIENT_BY_ID,
  SUBCATEGORY_DISPLAY_NAMES,
} from '@/data/nutrients';

// Status priority for sorting (lower = shown first)
const STATUS_PRIORITY: Record<NutrientStatus, number> = {
  deficient: 0,
  low: 1,
  adequate: 2,
  optimal: 3,
  high: 4,
  excessive: 5,
  no_data: 99,
};

export interface NutrientWithDetails {
  definition: NutrientDefinition;
  intake: NutrientIntake | null;
}

export interface NutrientSection {
  subcategory: NutrientSubcategory;
  title: string;
  nutrients: NutrientWithDetails[];
  averagePercent: number;
  nutrientCount: number;
}

interface UseFilteredNutrientsParams {
  intakes: NutrientIntake[];
  selectedStatuses: NutrientStatus[];
  visibleNutrients: NutrientDefinition[];
}

export function useFilteredNutrients({
  intakes,
  selectedStatuses,
  visibleNutrients,
}: UseFilteredNutrientsParams) {
  const intakeMap = useMemo(() => {
    const map = new Map<string, NutrientIntake>();
    for (const intake of intakes) {
      map.set(intake.nutrientId, intake);
    }
    return map;
  }, [intakes]);

  const sections = useMemo(() => {
    // Group visible nutrients by subcategory
    const subcategoryMap = new Map<NutrientSubcategory, NutrientWithDetails[]>();

    for (const def of visibleNutrients) {
      const intake = intakeMap.get(def.id) ?? null;
      const item: NutrientWithDetails = { definition: def, intake };

      // Apply status filter
      if (selectedStatuses.length > 0) {
        const status = intake?.status;
        if (!status || !selectedStatuses.includes(status)) continue;
      }

      if (!subcategoryMap.has(def.subcategory)) {
        subcategoryMap.set(def.subcategory, []);
      }
      subcategoryMap.get(def.subcategory)!.push(item);
    }

    // Build sections and sort nutrients within each
    const result: NutrientSection[] = [];

    // Define subcategory order
    const subcategoryOrder: NutrientSubcategory[] = [
      'water_soluble_vitamins',
      'fat_soluble_vitamins',
      'major_minerals',
      'trace_minerals',
      'essential_amino_acids',
      'non_essential_amino_acids',
      'omega_fatty_acids',
      'other_fats',
      'other_nutrients',
    ];

    for (const subcat of subcategoryOrder) {
      const nutrients = subcategoryMap.get(subcat);
      if (!nutrients || nutrients.length === 0) continue;

      // Sort by status priority (deficient first)
      nutrients.sort((a, b) => {
        const aPriority = a.intake ? STATUS_PRIORITY[a.intake.status] : 6;
        const bPriority = b.intake ? STATUS_PRIORITY[b.intake.status] : 6;
        return aPriority - bPriority;
      });

      // Calculate average percent
      const withIntake = nutrients.filter(n => n.intake);
      const avgPercent = withIntake.length > 0
        ? withIntake.reduce((sum, n) => sum + (n.intake?.percentOfTarget ?? 0), 0) / withIntake.length
        : 0;

      result.push({
        subcategory: subcat,
        title: SUBCATEGORY_DISPLAY_NAMES[subcat],
        nutrients,
        averagePercent: avgPercent,
        nutrientCount: nutrients.length,
      });
    }

    return result;
  }, [visibleNutrients, intakeMap, selectedStatuses]);

  // Find the section with the lowest average (for auto-expand)
  const lowestSection = useMemo(() => {
    if (sections.length === 0) return null;
    return sections.reduce((lowest, section) =>
      section.averagePercent < lowest.averagePercent ? section : lowest
    );
  }, [sections]);

  // Overall status counts
  const statusCounts = useMemo(() => {
    const counts: Record<NutrientStatus, number> = {
      deficient: 0,
      low: 0,
      adequate: 0,
      optimal: 0,
      high: 0,
      excessive: 0,
      no_data: 0,
    };
    for (const intake of intakes) {
      if (intake.status !== 'no_data') {
        counts[intake.status]++;
      }
    }
    return counts;
  }, [intakes]);

  return { sections, lowestSection, statusCounts };
}
