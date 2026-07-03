import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type MoreMenuPanel = 'menu' | 'notifications';

type MoreMenuContextValue = {
  visible: boolean;
  panel: MoreMenuPanel;
  open: () => void;
  close: () => void;
  showNotifications: () => void;
  showMenu: () => void;
};

const MoreMenuContext = createContext<MoreMenuContextValue | undefined>(undefined);

export function MoreMenuProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [panel, setPanel] = useState<MoreMenuPanel>('menu');

  const open = useCallback(() => {
    setPanel('menu');
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setPanel('menu');
  }, []);

  const showNotifications = useCallback(() => {
    setPanel('notifications');
    setVisible(true);
  }, []);

  const showMenu = useCallback(() => {
    setPanel('menu');
  }, []);

  const value = useMemo(
    () => ({ visible, panel, open, close, showNotifications, showMenu }),
    [close, open, panel, showMenu, showNotifications, visible],
  );

  return <MoreMenuContext.Provider value={value}>{children}</MoreMenuContext.Provider>;
}

export function useMoreMenu() {
  const context = useContext(MoreMenuContext);
  if (!context) {
    throw new Error('useMoreMenu must be used within MoreMenuProvider');
  }
  return context;
}
