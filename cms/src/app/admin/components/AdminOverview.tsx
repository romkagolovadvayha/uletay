import Link from 'next/link';
import type { AppData } from '@/types';
import { AdminIcon } from './AdminIcon';
import { adminHref } from '@/lib/admin-navigation';

export function AdminOverview({ data }: { data: AppData }) {
  const year = data.festival.year;
  const schedule = data.schedule.filter((item) => item.date.startsWith(`${year}-`));
  const artists = data.headliners.filter((item) => item.years.includes(year));
  const date = (value: string) =>
    new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
      new Date(`${value}T12:00:00Z`),
    );
  const checks = [
    {
      title: `Программа ${year}`,
      detail: schedule.length
        ? `${schedule.length} выступлений в расписании`
        : 'Добавьте первые выступления нового сезона',
      ready: !!schedule.length,
      href: adminHref('schedule', schedule.length ? {} : { edit: 'new' }),
    },
    {
      title: `Артисты ${year}`,
      detail: artists.length
        ? `${artists.length} карточек с годом участия`
        : 'Укажите год участия в карточках артистов',
      ready: !!artists.length,
      href: adminHref('headliners', { year: String(year) }),
    },
    {
      title: 'Карта территории',
      detail: data.festivalMap?.enabled
        ? `${data.mapZones?.features.length ?? 0} объектов · ${data.mapPaths?.features.length ?? 0} дорожек`
        : 'Карта выключена в приложении',
      ready: !!data.festivalMap?.enabled,
      href: adminHref('map'),
    },
    {
      title: 'Точки питания',
      detail: data.foodcourt.length
        ? `${data.foodcourt.length} точек добавлено в фудкорт`
        : 'Добавьте точки питания и часы работы',
      ready: !!data.foodcourt.length,
      href: adminHref('foodcourt'),
    },
  ];
  return (
    <>
      <section className="overview-hero">
        <div>
          <span className="admin-eyebrow">Фестиваль {year}</span>
          <h2>Всё готовится здесь.</h2>
          <p>
            {date(data.festival.startDate)} — {date(data.festival.endDate)}
            <span> · </span>
            {data.festival.location}
          </p>
          <Link className="btn-primary" href={adminHref('schedule', { edit: 'new' })}>
            + Добавить выступление
          </Link>
          <Link className="overview-hero-link" href={adminHref('festival')}>
            Настройки фестиваля <AdminIcon name="arrow" size={17} />
          </Link>
        </div>
        <div className="overview-poster" aria-hidden="true">
          <span>УЛЕТАЙ</span>
          <strong>{year}</strong>
          <small>МУЗЫКА. ЛЮДИ. ЛЕТО.</small>
        </div>
      </section>
      <div className="overview-stats">
        {(
          [
            {
              tab: 'headliners',
              label: 'Артисты',
              count: data.headliners.length,
              icon: 'star',
              detail: 'За все годы',
            },
            {
              tab: 'schedule',
              label: 'Выступления',
              count: data.schedule.length,
              icon: 'calendar',
              detail: 'В программе и архиве',
            },
            {
              tab: 'foodcourt',
              label: 'Точки питания',
              count: data.foodcourt.length,
              icon: 'food',
              detail: 'На территории',
            },
            {
              tab: 'autographs',
              label: 'Автограф-сессии',
              count: data.autographs.length,
              icon: 'autographs',
              detail: 'Встречи с артистами',
            },
          ] as const
        ).map((item) => (
          <Link className="overview-stat" key={item.tab} href={adminHref(item.tab)}>
            <span className="stat-heading">
              {item.label}
              <AdminIcon name={item.icon} size={19} />
            </span>
            <strong>{item.count}</strong>
            <small>
              {item.detail}
              <AdminIcon name="arrow" size={16} />
            </small>
          </Link>
        ))}
      </div>
      <div className="overview-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Что требует внимания</h2>
              <p>Состояние контента для текущего сезона.</p>
            </div>
            <span className="count-badge">{checks.filter((item) => !item.ready).length}</span>
          </div>
          <div className="overview-checks">
            {[...checks]
              .sort((a, b) => Number(a.ready) - Number(b.ready))
              .map((item) => (
                <Link href={item.href} key={item.title}>
                  <span className={`check-icon ${item.ready ? 'ready' : 'attention'}`}>
                    <AdminIcon name={item.ready ? 'check' : 'calendar'} size={20} />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <AdminIcon name="chevron" size={17} />
                </Link>
              ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Быстрые действия</h2>
              <p>Перейдите сразу к нужной задаче.</p>
            </div>
          </div>
          <div className="overview-shortcuts">
            {(
              [
                { tab: 'headliners', label: 'Добавить артиста', icon: 'star', edit: 'new' },
                { tab: 'foodcourt', label: 'Добавить точку питания', icon: 'food', edit: 'new' },
                { tab: 'map', label: 'Открыть редактор карты', icon: 'map' },
                { tab: 'push', label: 'Подготовить уведомление', icon: 'bell' },
              ] as const
            ).map((item) => (
              <Link
                key={item.tab}
                href={adminHref(item.tab, { edit: 'edit' in item ? item.edit : undefined })}
              >
                <AdminIcon name={item.icon} size={19} />
                <span>{item.label}</span>
                <AdminIcon name="arrow" size={17} />
              </Link>
            ))}
          </div>
          <div className="overview-tip">
            <AdminIcon name="search" size={18} />
            <p>
              Ищете конкретную запись? Поиск сверху находит артистов, выступления и точки питания.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
