/**
 * useDeficiencyAlerts Hook
 * Manages nutrient deficiency alert calculations and dismissals
 */

import { useCallback, useEffect, useState } from 'react';
import { useAlertDismissalStore } from '../stores/alertDismissalStore';
import { calculateDeficiencies, DeficiencyResult } from '../services/DeficiencyCalculator';
import type { DeficiencyCheck, NutrientDailyData } from '../types/insights.types';

interface UseDeficiencyAlertsResult {
  alerts: DeficiencyCheck[];
  hasAlerts: boolean;
  alertCount: number;
  isLoading: boolean;
  dismissAlert: (nutrientId: string, severity: string) => void;
  refresh: () => void;
}

interface UseDeficiencyAlertsParams {
  nutrientData: NutrientDailyData[];
  daysUsingApp: number;
  daysSinceLastLog: number;
}

export function useDeficiencyAlerts({
  nutrientData,
  daysUsingApp,
  daysSinceLastLog,
}: UseDeficiencyAlertsParams): UseDeficiencyAlertsResult {
  const [result, setResult] = useState<DeficiencyResult>({
    checks: [],
    hasAlerts: false,
    alertCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const { getDismissedAlertIds, dismissAlert: storeDismissAlert, clearExpiredDismissals } = useAlertDismissalStore();

  const calculateAlerts = useCallback(() => {
    setIsLoading(true);

    // Clear expired dismissals first
    clearExpiredDismissals();

    const dismissedAlerts = getDismissedAlertIds();

    const deficiencyResult = calculateDeficiencies({
      dailyNutrientData: nutrientData,
      daysUsingApp,
      daysSinceLastLog,
      dismissedAlerts,
    });

    setResult(deficiencyResult);
    setIsLoading(false);
  }, [nutrientData, daysUsingApp, daysSinceLastLog, getDismissedAlertIds, clearExpiredDismissals]);

  useEffect(() => {
    if (nutrientData.length > 0) {
      calculateAlerts();
    }
  }, [nutrientData, calculateAlerts]);

  const dismissAlert = useCallback(
    (nutrientId: string, severity: string) => {
      storeDismissAlert(nutrientId, severity);
      // Recalculate to remove the dismissed alert
      calculateAlerts();
    },
    [storeDismissAlert, calculateAlerts]
  );

  const refresh = useCallback(() => {
    calculateAlerts();
  }, [calculateAlerts]);

  return {
    alerts: result.checks,
    hasAlerts: result.hasAlerts,
    alertCount: result.alertCount,
    isLoading,
    dismissAlert,
    refresh,
  };
}
