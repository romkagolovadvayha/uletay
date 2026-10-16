'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useContentRevision } from './ContentRevision';
import { useRef, useState, useTransition } from 'react';
import { deleteHeadlinerAction, reorderHeadlinersAction } from '../actions';
import { DeleteButton } from './DeleteButton';
import type { Headliner } from '@/types';
import { formatHeadlinerYears } from '@/lib/headliner-helpers';
import { HeadlinerRefreshStatus, useHeadlinerMusicRefresh } from './HeadlinerMusicRefresh';

type RowItem = Headliner & { imageSrc?: string };

type Props = {
  items: RowItem[];
  allItems: { id: string; name: string }[];
  listHref: string;
  sortable?: boolean;
};

export function HeadlinersSortableTable({ items, allItems, sortable = true, listHref }: Props) {
  const revision = useContentRevision();
  const router = useRouter();
  const [rows, setRows] = useState(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const dragIndexRef = useRef<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const refresh = useHeadlinerMusicRefresh();
  const locked = isPending || refresh.busy;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedRows = rows.filter((item) => selected.has(item.id));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;

  function commitOrder(nextRows: RowItem[]) {
    const previous = rows;
    setRows(nextRows);
    setStatus('saving');
    startTransition(async () => {
      try {
        const result = await reorderHeadlinersAction(
          nextRows.map((row) => row.id),
          revision,
        );
        setStatus(result.ok ? 'idle' : 'error');
        if (result.ok) router.refresh();
        else setRows(previous);
      } catch {
        setRows(previous);
        setStatus('error');
      }
    });
  }

  function handleDragStart(index: number) {
    if (!sortable || locked) return;
    dragIndexRef.current = index;
    setDragIndex(index);
  }

  function handleDragOver(event: React.DragEvent, index: number) {
    if (!sortable || locked || dragIndexRef.current === null) return;
    event.preventDefault();
    setOverIndex(index);
  }

  function handleDrop(index: number) {
    if (!sortable || locked) return;
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    setDragIndex(null);
    setOverIndex(null);
    if (from === null || from === index) return;

    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    commitOrder(next);
  }

  function moveRow(index: number, direction: number) {
    if (!sortable || locked || index + direction < 0 || index + direction >= rows.length) return;
    const next = [...rows];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    commitOrder(next);
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <>
      <div className="music-refresh-panel">
        <h3>Обновление данных из Last.fm</h3>
        <p className="hint">Загрузить заново песни, жанры, биографию, похожих артистов и статистику. Связанные артисты обновляются вместе.</p>
        <div className="music-refresh-controls">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={allSelected}
              disabled={locked || !rows.length}
              onChange={(event) => setSelected(event.target.checked ? new Set(rows.map((row) => row.id)) : new Set())}
            />
            Выбрать всех в списке
          </label>
          <button type="button" className="btn-secondary" disabled={locked || !selectedRows.length} onClick={() => void refresh.start(selectedRows)}>
            Обновить выбранных ({selectedRows.length})
          </button>
          <button type="button" className="btn-secondary" disabled={locked || !allItems.length} onClick={() => void refresh.start(allItems)}>
            Обновить всех ({allItems.length})
          </button>
        </div>
        {rows.length !== allItems.length && <p className="hint">«Обновить всех» обновляет весь каталог, независимо от поиска и года.</p>}
        <HeadlinerRefreshStatus refresh={refresh} />
      </div>
      <p className="hint">
        {sortable
          ? 'Порядок в приложении: перетащите за ⋮⋮ или используйте стрелки.'
          : 'Сбросьте поиск и фильтры, чтобы изменить порядок.'}
      </p>
      {status === 'saving' || isPending ? <p className="hint">Сохранение порядка…</p> : null}
      {status === 'error' ? <p className="error">Не удалось сохранить порядок</p> : null}

      <table className="data-table responsive-table">
        <thead>
          <tr>
            <th aria-label="Выбор артистов" />
            <th aria-label="Порядок" />
            <th />
            <th>Артист</th>
            <th>Годы</th>
            <th>Описание</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((item, index) => (
            <tr
              key={item.id}
              className={[
                'sortable-row',
                dragIndex === index ? 'sortable-row-dragging' : '',
                overIndex === index && dragIndex !== index ? 'sortable-row-over' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onDragOver={(event) => handleDragOver(event, index)}
              onDrop={() => handleDrop(index)}
            >
              <td className="music-refresh-select">
                <input
                  type="checkbox"
                  aria-label={`Выбрать «${item.name}»`}
                  checked={selected.has(item.id)}
                  disabled={locked}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setSelected((current) => {
                      const next = new Set(current);
                      if (checked) next.add(item.id);
                      else next.delete(item.id);
                      return next;
                    });
                  }}
                />
              </td>
              <td className="drag-handle-cell">
                <button
                  type="button"
                  className="drag-handle"
                  disabled={!sortable || locked}
                  draggable={sortable && !locked}
                  aria-label={`Переместить «${item.name}»`}
                  onDragStart={() => handleDragStart(index)}
                  onDragEnd={handleDragEnd}
                >
                  ⋮⋮
                </button>
                <span className="order-buttons">
                  <button
                    type="button"
                    aria-label={`Поднять «${item.name}»`}
                    disabled={!sortable || locked || index === 0}
                    onClick={() => moveRow(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Опустить «${item.name}»`}
                    disabled={!sortable || locked || index === rows.length - 1}
                    onClick={() => moveRow(index, 1)}
                  >
                    ↓
                  </button>
                </span>
              </td>
              <td className="row-image">
                {item.imageSrc ? (
                  <img loading="lazy" className="list-thumb" src={item.imageSrc} alt={item.name} />
                ) : (
                  '—'
                )}
              </td>
              <td className="row-title">
                {item.name}
                {refresh.profiles[item.id] && <span className="music-refresh-done">Данные обновлены</span>}
              </td>
              <td data-label="Годы">{formatHeadlinerYears(item.years)}</td>
              <td className="row-description">
                <span>{item.description || 'Нет описания'}</span>
              </td>
              <td className="row-actions">
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  aria-label={`Обновить данные «${item.name}»`}
                  disabled={locked}
                  onClick={() => void refresh.start([item])}
                >
                  Обновить данные
                </button>
                <Link
                  className="btn-secondary btn-sm"
                  href={`${listHref}&edit=${encodeURIComponent(item.id)}`}
                >
                  Изменить
                </Link>
                <DeleteButton recordName={item.name} action={deleteHeadlinerAction} id={item.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
