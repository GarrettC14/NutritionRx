import { useCallback } from 'react';
import { useTooltipContext, TooltipConfig, TooltipAction } from '@/contexts/TooltipContext';
import { TooltipId } from '@/constants/tooltipIds';

export interface UseTooltipReturn {
  showTooltip: (config: TooltipConfig) => void;
  showTooltipIfNotSeen: (config: TooltipConfig) => boolean;
  hideTooltip: () => void;
  hasSeen: (id: TooltipId) => boolean;
  markSeen: (id: TooltipId) => void;
  isActive: boolean;
}

export function useTooltip(): UseTooltipReturn {
  const {
    activeTooltip,
    showTooltip,
    showTooltipIfNotSeen,
    hideTooltip,
    hasSeen,
    markSeen,
  } = useTooltipContext();

  return {
    showTooltip,
    showTooltipIfNotSeen,
    hideTooltip,
    hasSeen,
    markSeen,
    isActive: !!activeTooltip,
  };
}

// Helper to create a simple tooltip config
export function createTooltip(
  id: TooltipId,
  content: string,
  options?: {
    icon?: string;
    position?: 'top' | 'bottom' | 'center';
    actions?: TooltipAction[];
  }
): TooltipConfig {
  return {
    id,
    content,
    icon: options?.icon,
    position: options?.position || 'center',
    actions: options?.actions,
  };
}
