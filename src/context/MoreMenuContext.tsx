import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type MoreMenuContextValue = {
  visible: boolean;
  open: () => void;
  close: () => void;
};

const MoreMenuContext = createContext<MoreMenuContextValue | undefined>(undefined);

export function MoreMenuProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  const open = useCallback(() => {
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const value = useMemo(() => ({ visible, open, close }), [close, open, visible]);

  return <MoreMenuContext.Provider value={value}>{children}</MoreMenuContext.Provider>;
}

export function useMoreMenu() {
  const context = useContext(MoreMenuContext);
  if (!context) {
    throw new Error('useMoreMenu must be used within MoreMenuProvider');
  }
  return context;
}
