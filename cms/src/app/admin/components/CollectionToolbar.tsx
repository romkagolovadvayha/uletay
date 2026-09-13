import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AdminTab } from '@/types';
import { adminHref } from '@/lib/admin-navigation';
import { AdminIcon } from './AdminIcon';

export function CollectionToolbar({
  tab,
  query = '',
  addLabel,
  filtered,
  children,
}: {
  tab: AdminTab;
  query?: string;
  addLabel: string;
  filtered?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="collection-toolbar">
      <form className="collection-filters" method="get" action="/admin">
        <input type="hidden" name="tab" value={tab} />
        <label className="collection-search">
          <span className="visually-hidden">Поиск в списке</span>
          <AdminIcon name="search" size={18} />
          <input type="search" name="q" defaultValue={query} placeholder="Поиск по названию…" />
        </label>
        {children}
        <button type="submit" className="btn-secondary">
          Найти
        </button>
        {filtered && (
          <Link className="filter-reset" href={adminHref(tab)}>
            Сбросить
          </Link>
        )}
      </form>
      <Link className="btn-primary" href={adminHref(tab, { edit: 'new' })}>
        + {addLabel}
      </Link>
    </div>
  );
}
