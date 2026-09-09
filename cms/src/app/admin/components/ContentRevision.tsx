'use client';

import { createContext, useContext, type ReactNode } from 'react';

export const ContentRevisionContext = createContext<string | undefined>(undefined);
export const useContentRevision = () => useContext(ContentRevisionContext);

export function ContentRevisionProvider({ value, children }: { value?: string; children: ReactNode }) {
  return <ContentRevisionContext.Provider value={value}>{children}</ContentRevisionContext.Provider>;
}

export function ContentRevision() {
  const revision = useContentRevision();
  return <input type="hidden" name="_revision" value={revision ?? ''} />;
}
