/**
 * Crash Fallback Screen
 * Shown when Sentry's ErrorBoundary catches a crash.
 * Uses the "Nourished Calm" design: cream background, sage green accent.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { reloadAppAsync } from 'expo';

interface CrashFallbackProps {
  resetError: () => void;
}

export function CrashFallbackScreen({ resetError }: CrashFallbackProps) {
  const handleRestart = () => {
    reloadAppAsync().catch(() => {
      // Fallback: just reset the error boundary
      resetError();
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🌱</Text>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>
        Don't worry — your food log and data are safe. Let's get you back on track.
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={resetError}>
        <Text style={styles.primaryButtonText}>Try Again</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={handleRestart}>
        <Text style={styles.secondaryButtonText}>Restart App</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 300,
  },
  primaryButton: {
    backgroundColor: '#9CAF88',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#9CAF88',
    fontSize: 15,
    fontWeight: '500',
  },
});
