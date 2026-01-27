import { useState, useEffect, useCallback } from 'react';
import { settingsRepository } from '@/repositories';
import { LEGAL_DISCLAIMER_VERSION } from '../config/legal';

const SETTING_KEYS = {
  LEGAL_ACKNOWLEDGED: 'legal_acknowledged',
  LEGAL_ACKNOWLEDGED_AT: 'legal_acknowledged_at',
  LEGAL_ACKNOWLEDGED_VERSION: 'legal_acknowledged_version',
} as const;

interface LegalAcknowledgmentState {
  isLoading: boolean;
  needsAcknowledgment: boolean;
  acknowledgedAt: string | null;
  acknowledgedVersion: string | null;
}

export function useLegalAcknowledgment() {
  const [state, setState] = useState<LegalAcknowledgmentState>({
    isLoading: true,
    needsAcknowledgment: true,
    acknowledgedAt: null,
    acknowledgedVersion: null,
  });

  const loadAcknowledgmentStatus = useCallback(async () => {
    try {
      const acknowledged = await settingsRepository.get(SETTING_KEYS.LEGAL_ACKNOWLEDGED, false);
      const acknowledgedVersion = await settingsRepository.get(SETTING_KEYS.LEGAL_ACKNOWLEDGED_VERSION, '');
      const acknowledgedAt = await settingsRepository.get(SETTING_KEYS.LEGAL_ACKNOWLEDGED_AT, '');

      // Check if needs acknowledgment
      const needsAcknowledgment =
        !acknowledged || acknowledgedVersion !== LEGAL_DISCLAIMER_VERSION;

      setState({
        isLoading: false,
        needsAcknowledgment,
        acknowledgedAt: acknowledgedAt || null,
        acknowledgedVersion: acknowledgedVersion || null,
      });
    } catch (error) {
      console.error('Failed to load legal acknowledgment status:', error);
      setState({
        isLoading: false,
        needsAcknowledgment: true,
        acknowledgedAt: null,
        acknowledgedVersion: null,
      });
    }
  }, []);

  useEffect(() => {
    loadAcknowledgmentStatus();
  }, [loadAcknowledgmentStatus]);

  const acknowledge = useCallback(async () => {
    try {
      const now = new Date().toISOString();

      await Promise.all([
        settingsRepository.set(SETTING_KEYS.LEGAL_ACKNOWLEDGED, true),
        settingsRepository.set(SETTING_KEYS.LEGAL_ACKNOWLEDGED_AT, now),
        settingsRepository.set(SETTING_KEYS.LEGAL_ACKNOWLEDGED_VERSION, LEGAL_DISCLAIMER_VERSION),
      ]);

      setState({
        isLoading: false,
        needsAcknowledgment: false,
        acknowledgedAt: now,
        acknowledgedVersion: LEGAL_DISCLAIMER_VERSION,
      });
    } catch (error) {
      console.error('Failed to save legal acknowledgment:', error);
      throw error;
    }
  }, []);

  return {
    ...state,
    acknowledge,
    refresh: loadAcknowledgmentStatus,
  };
}
