'use client';

import { useState } from 'react';
import { AdminIcon } from './AdminIcon';

type Props = {
  children: React.ReactNode;
  tone: 'error' | 'success';
};

export function AdminNotice({ children, tone }: Props) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className={`admin-notice admin-notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <AdminIcon name={tone === 'success' ? 'check' : 'bell'} />
      <span>{children}</span>
      <button aria-label="Закрыть сообщение" onClick={() => setVisible(false)} type="button">
        <AdminIcon name="close" size={18} />
      </button>
    </div>
  );
}
