import React, { createContext, useContext } from 'react';

const IconsReadyContext = createContext(true);

export function IconsReadyProvider({
  ready,
  children,
}: {
  ready: boolean;
  children: React.ReactNode;
}) {
  return <IconsReadyContext.Provider value={ready}>{children}</IconsReadyContext.Provider>;
}

/** False until Ionicons is loaded with font-display: swap. */
export function useIconsReady(): boolean {
  return useContext(IconsReadyContext);
}
