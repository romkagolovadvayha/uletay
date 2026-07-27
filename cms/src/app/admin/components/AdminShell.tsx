import Link from 'next/link';
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

  return (
    <div className="admin-shell">
      <input
        aria-label="Открыть меню"
        className="admin-sidebar-toggle visually-hidden"
        id="admin-sidebar-toggle"
        type="checkbox"
      />
      <label aria-hidden="true" className="admin-sidebar-overlay" htmlFor="admin-sidebar-toggle" />

      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-mark">У</div>
          <div>
            <strong>УЛЕТАЙ</strong>
            <span>Панель управления</span>
          </div>
          <label
            aria-hidden="true"
            className="admin-sidebar-close"
            htmlFor="admin-sidebar-toggle"
          >
            <AdminIcon name="close" />
          </label>
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
          <label
            aria-hidden="true"
            className="admin-menu-button"
            htmlFor="admin-sidebar-toggle"
          >
            <AdminIcon name="menu" />
          </label>
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
