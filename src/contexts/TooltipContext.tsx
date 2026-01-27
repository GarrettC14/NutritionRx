import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useOnboardingStore } from '@/stores';
import { TooltipId } from '@/constants/tooltipIds';

export interface TooltipAction {
  label: string;
  onPress: () => void;
  primary?: boolean;
}

export interface TooltipConfig {
  id: TooltipId;
  content: string;
  icon?: string;
  position?: 'top' | 'bottom' | 'center';
  actions?: TooltipAction[];
}

interface TooltipContextValue {
  activeTooltip: TooltipConfig | null;
  showTooltip: (config: TooltipConfig) => void;
  showTooltipIfNotSeen: (config: TooltipConfig) => boolean;
  hideTooltip: () => void;
  markSeen: (id: TooltipId) => void;
  hasSeen: (id: TooltipId) => boolean;
}

const TooltipContext = createContext<TooltipContextValue | undefined>(undefined);

interface TooltipProviderProps {
  children: ReactNode;
}

export function TooltipProvider({ children }: TooltipProviderProps) {
  const [activeTooltip, setActiveTooltip] = useState<TooltipConfig | null>(null);
  const { seenTooltips, markTooltipSeen } = useOnboardingStore();

  const hasSeen = useCallback(
    (id: TooltipId): boolean => {
      return seenTooltips.includes(id);
    },
    [seenTooltips]
  );

  const markSeen = useCallback(
    (id: TooltipId): void => {
      markTooltipSeen(id);
    },
    [markTooltipSeen]
  );

  const showTooltip = useCallback((config: TooltipConfig) => {
    setActiveTooltip(config);
  }, []);

  const showTooltipIfNotSeen = useCallback(
    (config: TooltipConfig): boolean => {
      if (hasSeen(config.id)) {
        return false;
      }
      showTooltip(config);
      return true;
    },
    [hasSeen, showTooltip]
  );

  const hideTooltip = useCallback(() => {
    if (activeTooltip) {
      markSeen(activeTooltip.id);
    }
    setActiveTooltip(null);
  }, [activeTooltip, markSeen]);

  return (
    <TooltipContext.Provider
      value={{
        activeTooltip,
        showTooltip,
        showTooltipIfNotSeen,
        hideTooltip,
        markSeen,
        hasSeen,
      }}
    >
      {children}
    </TooltipContext.Provider>
  );
}

export function useTooltipContext(): TooltipContextValue {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error('useTooltipContext must be used within a TooltipProvider');
  }
  return context;
}
