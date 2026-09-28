'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export const ContentRevisionContext = createContext<string | undefined>(undefined);
export const useContentRevision = () => useContext(ContentRevisionContext);
const UpdateContentRevisionContext = createContext<(revision: string) => void>(() => {});
export const useUpdateContentRevision = () => useContext(UpdateContentRevisionContext);

export function ContentRevisionProvider({ value, children }: { value?: string; children: ReactNode }) {
  const [revision, setRevision] = useState(value);
  return (
    <ContentRevisionContext.Provider value={revision}>
      <UpdateContentRevisionContext.Provider value={setRevision}>
        {children}
      </UpdateContentRevisionContext.Provider>
    </ContentRevisionContext.Provider>
  );
}

export function ContentRevision() {
  const revision = useContentRevision();
  return <input type="hidden" name="_revision" value={revision ?? ''} />;
}
