/**
 * Weekly Insights Route
 * Thin wrapper for the Weekly Insights screen
 */

import React from 'react';
import { Stack } from 'expo-router';
import { WeeklyInsightsScreen } from '@/features/weekly-insights/components/WeeklyInsightsScreen';

export default function WeeklyInsightsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WeeklyInsightsScreen />
    </>
  );
}
