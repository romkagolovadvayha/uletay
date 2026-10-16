'use client';

import Link from 'next/link';
import { useRef, type ReactNode } from 'react';
import type { AdminTab } from '@/types';
import { adminSections, type AdminSearchItem } from '@/lib/admin-navigation';
import { AdminIcon } from './AdminIcon';
import { AdminSearch } from './AdminSearch';
import { ThemeToggle } from './ThemeToggle';
import type { AdminUser } from '@/lib/admin-access';

type Props = {
  activeTab: AdminTab;
  admin: AdminUser;
  children: ReactNode;
  logoutAction: () => void | Promise<void>;
  searchItems: AdminSearchItem[];
  festivalName: string;
  festivalYear: number;
};
export function AdminShell({
  activeTab,
  admin,
  children,
  logoutAction,
  searchItems,
  festivalName,
  festivalYear,
}: Props) {
  const menu = useRef<HTMLDialogElement>(null);
  const meta = adminSections.find((item) => item.key === activeTab)!;
  const groups = [...new Set(adminSections.map((item) => item.group))];
  const sections = adminSections.filter((item) => item.key !== 'access' || admin.role === 'owner');
  function navigation() {
    return (
      <>
        <div className="admin-brand">
          <Link href="/admin" className="admin-brand-mark" aria-label="Обзор админки">
            У
          </Link>
          <div>
            <strong>УЛЕТАЙ</strong>
            <span>Команда фестиваля</span>
          </div>
        </div>
        <div className="admin-festival-label">
          <span className="status-dot" />
          <span>
            {festivalName} {festivalYear}
          </span>
        </div>
        <nav className="admin-nav" aria-label="Разделы админки">
          {groups.map((group) => (
            <div className="admin-nav-group" key={group}>
              <p>{group}</p>
              {sections
                .filter((item) => item.group === group)
                .map((item) => (
                  <Link
                    key={item.key}
                    href={`/admin?tab=${item.key}`}
                    className={activeTab === item.key ? 'admin-nav-link active' : 'admin-nav-link'}
                    aria-current={activeTab === item.key ? 'page' : undefined}
                    onClick={() => menu.current?.close()}
                  >
                    <AdminIcon name={item.icon} size={19} />
                    <span>{item.label}</span>
                    {activeTab === item.key && <span className="nav-active-dot" />}
                  </Link>
                ))}
            </div>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-account">
            <span className="admin-account-avatar">
              {admin.displayName.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{admin.displayName}</strong>
              <small>{admin.role === 'owner' ? 'Владелец' : 'Администратор'}</small>
            </div>
          </div>
          <a className="admin-site-link" href="/" target="_blank" rel="noreferrer">
            <AdminIcon name="external" size={18} />
            Открыть приложение
          </a>
          <form action={logoutAction}>
            <button className="admin-logout" type="submit">
              <AdminIcon name="logout" size={18} />
              Выйти из аккаунта
            </button>
          </form>
        </div>
      </>
    );
  }
  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-content">
        К содержимому
      </a>
      <aside className="admin-sidebar">{navigation()}</aside>
      <dialog ref={menu} className="admin-mobile-nav" aria-label="Меню админки">
        <button
          type="button"
          className="admin-mobile-close icon-button"
          aria-label="Закрыть меню"
          onClick={() => menu.current?.close()}
        >
          <AdminIcon name="close" />
        </button>
        {navigation()}
      </dialog>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <button
            className="admin-menu-button"
            type="button"
            aria-label="Открыть меню"
            onClick={() => menu.current?.showModal()}
          >
            <AdminIcon name="menu" />
          </button>
          <div className="admin-topbar-location">
            <span>Рабочее пространство</span>
            <AdminIcon name="chevron" size={14} />
            <strong>{meta.label}</strong>
          </div>
          <AdminSearch items={searchItems} />
          <ThemeToggle />
        </header>
        <main className="admin-content" id="admin-content" tabIndex={-1}>
          <div className="admin-page-heading">
            <span className="admin-eyebrow">
              {activeTab === 'overview' ? 'Панель управления' : meta.group}
            </span>
            <h1>{meta.label}</h1>
            <p>{meta.description}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
