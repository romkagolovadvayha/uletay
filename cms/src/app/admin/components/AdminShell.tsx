'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { AdminTab } from '@/types';
import { AdminIcon } from './AdminIcon';

type Props = {
  activeTab: AdminTab;
  children: React.ReactNode;
  logoutAction: () => void | Promise<void>;
};

const pageMeta: Record<AdminTab, { title: string; description: string }> = {
  festival: {
    title: 'Настройки фестиваля',
    description: 'Основная информация, даты, локация и медиа-материалы.',
  },
  stages: {
    title: 'Сцены',
    description: 'Названия, короткие подписи и цвета фестивальных сцен.',
  },
  schedule: {
    title: 'Расписание',
    description: 'Выступления артистов по датам, времени и сценам.',
  },
  autographs: {
    title: 'Автограф-сессии',
    description: 'Встречи с артистами, время проведения и локации.',
  },
  headliners: {
    title: 'Хэдлайнеры',
    description: 'Карточки артистов, изображения, связи и годы участия.',
  },
  foodcourt: {
    title: 'Фудкорт',
    description: 'Точки питания, категории, часы работы и изображения.',
  },
  map: {
    title: 'Карта фестиваля',
    description: 'Схема территории, зоны, дорожки и настройки отображения.',
  },
  push: {
    title: 'Push-уведомления',
    description: 'Рассылки пользователям приложения и веб-версии.',
  },
};

const groups: {
  label: string;
  items: { key: AdminTab; label: string; icon: Parameters<typeof AdminIcon>[0]['name'] }[];
}[] = [
  {
    label: 'Управление',
    items: [
      { key: 'festival', label: 'Фестиваль', icon: 'festival' },
      { key: 'stages', label: 'Сцены', icon: 'stages' },
      { key: 'schedule', label: 'Расписание', icon: 'calendar' },
    ],
  },
  {
    label: 'Контент',
    items: [
      { key: 'autographs', label: 'Автографы', icon: 'autographs' },
      { key: 'headliners', label: 'Хэдлайнеры', icon: 'star' },
      { key: 'foodcourt', label: 'Фудкорт', icon: 'food' },
    ],
  },
  {
    label: 'Инструменты',
    items: [
      { key: 'map', label: 'Карта', icon: 'map' },
      { key: 'push', label: 'Push-уведомления', icon: 'bell' },
    ],
  },
];

export function AdminShell({ activeTab, children, logoutAction }: Props) {
  const meta = pageMeta[activeTab];
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const labelYandexLinks = () => {
      document.querySelectorAll<HTMLAnchorElement>('a[href*="yandex.ru/maps"]').forEach((link) => {
        if (!link.getAttribute('aria-label') && !link.textContent?.trim()) {
          link.setAttribute('aria-label', 'Открыть карту в Яндекс Картах');
        }
      });
    };
    const observer = new MutationObserver(labelYandexLinks);
    observer.observe(document.body, { childList: true, subtree: true });
    labelYandexLinks();
    return () => observer.disconnect();
  }, []);

  return (
    <div className="admin-shell">
      <button
        aria-label="Закрыть меню"
        className={menuOpen ? 'admin-sidebar-overlay is-open' : 'admin-sidebar-overlay'}
        onClick={() => setMenuOpen(false)}
        type="button"
      />

      <aside className={menuOpen ? 'admin-sidebar is-open' : 'admin-sidebar'} id="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-mark">У</div>
          <div>
            <strong>УЛЕТАЙ</strong>
            <span>Панель управления</span>
          </div>
          <button
            aria-label="Закрыть меню"
            className="admin-sidebar-close"
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            <AdminIcon name="close" />
          </button>
        </div>

        <nav className="admin-nav" aria-label="Разделы админки">
          {groups.map((group) => (
            <div className="admin-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => (
                <Link
                  aria-current={activeTab === item.key ? 'page' : undefined}
                  className={activeTab === item.key ? 'admin-nav-link active' : 'admin-nav-link'}
                  href={`/admin?tab=${item.key}`}
                  key={item.key}
                  onClick={() => setMenuOpen(false)}
                >
                  <AdminIcon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user">
            <span className="admin-user-avatar">A</span>
            <span>
              <strong>Администратор</strong>
              <small>Управление контентом</small>
            </span>
          </div>
          <form action={logoutAction}>
            <button className="admin-logout" type="submit">
              <AdminIcon name="logout" />
              Выйти
            </button>
          </form>
        </div>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <button
            aria-controls="admin-sidebar"
            aria-expanded={menuOpen}
            aria-label="Открыть меню"
            className="admin-menu-button"
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <AdminIcon name="menu" />
          </button>
          <div className="admin-page-heading">
            <div className="admin-breadcrumbs">
              <span>Админка</span>
              <AdminIcon name="chevron" size={14} />
              <span>{meta.title}</span>
            </div>
            <h1>{meta.title}</h1>
            <p>{meta.description}</p>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
