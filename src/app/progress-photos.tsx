import React from 'react';
import { Stack } from 'expo-router';
import { ProgressPhotosScreen } from '@/screens/ProgressPhotosScreen';

export default function ProgressPhotosRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProgressPhotosScreen />
    </>
  );
}
