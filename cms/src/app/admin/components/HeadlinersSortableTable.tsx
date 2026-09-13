'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useContentRevision } from './ContentRevision';
import { useRef, useState, useTransition } from 'react';
import { deleteHeadlinerAction, reorderHeadlinersAction } from '../actions';
import { DeleteButton } from './DeleteButton';
import type { Headliner } from '@/types';
import { formatHeadlinerYears } from '@/lib/headliner-helpers';

type RowItem = Headliner & { imageSrc?: string };

type Props = {
  items: RowItem[];
  listHref: string;
  sortable?: boolean;
};

export function HeadlinersSortableTable({ items, sortable = true, listHref }: Props) {
  const revision = useContentRevision();
  const router = useRouter();
  const [rows, setRows] = useState(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const dragIndexRef = useRef<number | null>(null);
  const [isPending, startTransition] = useTransition();

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
    if (!sortable || isPending) return;
    dragIndexRef.current = index;
    setDragIndex(index);
  }

  function handleDragOver(event: React.DragEvent, index: number) {
    if (!sortable || isPending || dragIndexRef.current === null) return;
    event.preventDefault();
    setOverIndex(index);
  }

  function handleDrop(index: number) {
    if (!sortable || isPending) return;
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
    if (!sortable || isPending || index + direction < 0 || index + direction >= rows.length) return;
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
              <td className="drag-handle-cell">
                <button
                  type="button"
                  className="drag-handle"
                  disabled={!sortable || isPending}
                  draggable={sortable && !isPending}
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
                    disabled={!sortable || isPending || index === 0}
                    onClick={() => moveRow(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Опустить «${item.name}»`}
                    disabled={!sortable || isPending || index === rows.length - 1}
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
              <td className="row-title">{item.name}</td>
              <td data-label="Годы">{formatHeadlinerYears(item.years)}</td>
              <td className="row-description">
                <span>{item.description || 'Нет описания'}</span>
              </td>
              <td className="row-actions">
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
