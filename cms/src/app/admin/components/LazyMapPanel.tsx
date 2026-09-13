'use client';

import { useState, type ReactNode } from 'react';

/** Mount the reference map on demand; preserve edits when its panel is collapsed. */
export function LazyMapPanel({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  return (
    <details
      className="advanced-panel"
      onToggle={(event) => {
        if (event.currentTarget.open) setMounted(true);
      }}
    >
      <summary>Схема-образец и её привязка</summary>
      {mounted && children}
    </details>
  );
}
