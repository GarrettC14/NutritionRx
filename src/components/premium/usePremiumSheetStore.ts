import { create } from 'zustand';
import { PaywallCategory } from './analyticsEnums';

function generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface PremiumSheetStore {
  isVisible: boolean;
  category: PaywallCategory | null;
  featureName: string | null;
  sessionId: string | null;
  openedAt: number | null;

  showPremiumSheet: (category: PaywallCategory, featureName: string) => void;
  hidePremiumSheet: () => void;
}

export const usePremiumSheetStore = create<PremiumSheetStore>((set) => ({
  isVisible: false,
  category: null,
  featureName: null,
  sessionId: null,
  openedAt: null,

  showPremiumSheet: (category, featureName) =>
    set({
      isVisible: true,
      category,
      featureName,
      sessionId: generateSessionId(),
      openedAt: Date.now(),
    }),

  hidePremiumSheet: () =>
    set({
      isVisible: false,
      category: null,
      featureName: null,
      sessionId: null,
      openedAt: null,
    }),
}));
