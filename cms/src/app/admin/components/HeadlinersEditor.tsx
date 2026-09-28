import { LinkedArtistsField } from './LinkedArtistsField';
import { EditorForm, SaveBar } from './EditorForm';
import { CollectionToolbar } from './CollectionToolbar';
import { matchesAdminSearch, adminHref } from '@/lib/admin-navigation';
import { ContentRevision } from './ContentRevision';
import Link from 'next/link';
import { upsertHeadlinerAction } from '../actions';
import { AdminImageUpload } from './AdminImageUpload';
import { HeadlinersSortableTable } from './HeadlinersSortableTable';
import { HeadlinerMusicRefresh } from './HeadlinerMusicRefresh';
import type { Headliner } from '@/types';
import { presetHint } from '@/lib/image-presets';
import { resolveAdminImageSrc } from '@/lib/resolve-admin-image';
import { formatHeadlinerYears } from '@/lib/headliner-helpers';
import { formatAlternateNamesInput } from '@/lib/headliner-groups';

type Props = {
  items: Headliner[];
  editId?: string;
  query?: string;
  yearFilter?: string;
};

export function HeadlinersEditor({ items, editId, query = '', yearFilter }: Props) {
  const listHref = adminHref('headliners', { q: query, year: yearFilter });
  const isNew = editId === 'new';
  const editing = isNew ? null : editId ? (items.find((item) => item.id === editId) ?? null) : null;

  const years = [...new Set(items.flatMap((item) => item.years))].sort((a, b) => b - a);
  const filtered = items.filter(
    (item) =>
      matchesAdminSearch(query, item.name, item.alternateNames?.join(' ')) &&
      (!yearFilter || item.years.includes(Number(yearFilter))),
  );
  const tableItems = filtered.map((item) => ({
    ...item,
    imageSrc: resolveAdminImageSrc(item.imageUrl, item.name),
  }));

  if (editId && !isNew && !editing)
    return (
      <div className="panel">
        <h2>Запись не найдена</h2>
        <p>Возможно, её уже удалили.</p>
        <Link href="/admin?tab=headliners" className="btn-secondary">
          К списку
        </Link>
      </div>
    );

  return (
    <>
      {!editId ? (
        <CollectionToolbar
          key={listHref}
          tab="headliners"
          query={query}
          addLabel="Артиста"
          filtered={Boolean(query || yearFilter)}
        >
          <label>
            <span className="visually-hidden">Год участия</span>
            <select name="year" defaultValue={yearFilter ?? ''}>
              <option value="">Все годы</option>
              {[...new Set([...years, ...(yearFilter ? [Number(yearFilter)] : [])])]
                .sort((a, b) => b - a)
                .map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
            </select>
          </label>
        </CollectionToolbar>
      ) : (
        <Link className="editor-back" href={listHref}>
          ← К списку
        </Link>
      )}

      {editId ? (
        <EditorForm action={upsertHeadlinerAction} className="panel editor-panel">
          <ContentRevision />
          <input type="hidden" name="_returnTo" value={listHref} />
          <div className="panel-heading">
            <div>
              <h2>{isNew ? 'Новый артист' : `Редактирование: ${editing?.name ?? ''}`}</h2>
              <p>Основная карточка артиста, связи и изображение для приложения.</p>
            </div>
          </div>
          <input type="hidden" name="isNew" value={isNew ? '1' : '0'} />
          {!isNew && editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="panel-body grid">
            {editing && <HeadlinerMusicRefresh artist={editing} />}
            <label className="span-2">
              Имя артиста
              <input name="name" defaultValue={editing?.name ?? ''} required />
            </label>
            <label className="span-2">
              Описание
              <textarea name="description" rows={3} defaultValue={editing?.description ?? ''} />
            </label>
            <details className="advanced-panel span-2">
              <summary>Другие названия и связанные артисты</summary>
              <label>
                Дополнительные названия
                <textarea
                  name="alternateNames"
                  rows={3}
                  defaultValue={formatAlternateNamesInput(editing?.alternateNames)}
                  placeholder={'КняZZ\nКороль и Шут'}
                />
                <span className="hint">
                  Бывшие или альтернативные имена — по одному в строке. Музыкальные данные
                  обновляются автоматически раз в сутки.
                </span>
              </label>
              {!isNew && editing && (
                <LinkedArtistsField
                  items={items
                    .filter((item) => item.id !== editing.id)
                    .map((item) => ({ id: item.id, name: item.name }))}
                  selected={editing.linkedHeadlinerIds}
                />
              )}
            </details>
            <label>
              Цвет карточки
              <input name="imageTint" type="color" defaultValue={editing?.imageTint ?? '#4A1C1C'} />
            </label>
            <label>
              Годы участия
              <input
                name="years"
                defaultValue={editing ? formatHeadlinerYears(editing.years) : ''}
                placeholder="2026, 2027"
              />
              <span className="hint">
                Можно указать вручную. Годы также подтягиваются из расписания и автографов.
              </span>
            </label>
            <div className="span-2">
              <AdminImageUpload
                aspect="square"
                currentSrc={resolveAdminImageSrc(editing?.imageUrl, editing?.name)}
                currentValue={editing?.imageUrl}
                hint={presetHint('artist')}
                label="Фотография артиста"
              />
            </div>
          </div>

          <SaveBar cancelHref={listHref} />
        </EditorForm>
      ) : null}

      {!editId && (
        <div className="panel collection-panel">
          <div className="panel-heading">
            <div>
              <h2>Каталог артистов</h2>
              <p>Перетаскивание меняет порядок карточек в приложении.</p>
            </div>
            <span className="count-badge">{filtered.length}</span>
          </div>
          <div className="panel-body table-wrap">
            <HeadlinersSortableTable
              key={tableItems.map((item) => item.id).join('|')}
              items={tableItems}
              allItems={items.map(({ id, name }) => ({ id, name }))}
              listHref={listHref}
              sortable={!query && !yearFilter}
            />
            {filtered.length === 0 ? <p className="empty-state">Артисты не найдены</p> : null}
          </div>
        </div>
      )}
    </>
  );
}
