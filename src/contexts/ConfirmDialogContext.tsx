import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ConfirmDialog, ConfirmDialogConfig } from '@/components/ui/ConfirmDialog';

interface ConfirmDialogContextValue {
  showConfirm: (config: ConfirmDialogConfig) => void;
  hideConfirm: () => void;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | undefined>(undefined);

interface ConfirmDialogProviderProps {
  children: ReactNode;
}

export function ConfirmDialogProvider({ children }: ConfirmDialogProviderProps) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<ConfirmDialogConfig | null>(null);

  const showConfirm = useCallback((newConfig: ConfirmDialogConfig) => {
    setConfig(newConfig);
    setVisible(true);
  }, []);

  const hideConfirm = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <ConfirmDialogContext.Provider value={{ showConfirm, hideConfirm }}>
      {children}
      <ConfirmDialog visible={visible} config={config} onDismiss={hideConfirm} />
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog(): ConfirmDialogContextValue {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider');
  }
  return context;
}
