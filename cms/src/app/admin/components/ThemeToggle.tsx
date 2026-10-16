'use client';

import { useSyncExternalStore } from 'react';
import { AdminIcon } from './AdminIcon';

const subscribe = (notify: () => void) => {
  window.addEventListener('admin-theme', notify);
  return () => window.removeEventListener('admin-theme', notify);
};
const snapshot = () => (document.documentElement.dataset.adminTheme === 'light' ? 'light' : 'dark');

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => 'dark');
  const label = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.adminTheme = next;
    document.cookie = `uletay_admin_theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    window.dispatchEvent(new Event('admin-theme'));
  }
  return (
    <button
      type="button"
      className="theme-toggle btn-secondary"
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      <AdminIcon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
      <span>{label}</span>
    </button>
  );
}
