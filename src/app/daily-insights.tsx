/**
 * Daily Insights Route
 * Thin wrapper for the Daily Insights screen
 */

import React from 'react';
import { Stack } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { CrashFallbackScreen } from '@/components/CrashFallbackScreen';
import { DailyInsightsScreen } from '@/features/insights/screens/DailyInsightsScreen';

export default function DailyInsightsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Sentry.ErrorBoundary fallback={({ resetError }) => <CrashFallbackScreen resetError={resetError} />}>
        <DailyInsightsScreen />
      </Sentry.ErrorBoundary>
    </>
  );
}
