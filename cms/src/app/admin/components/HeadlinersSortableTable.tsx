'use client';

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { deleteHeadlinerAction, reorderHeadlinersAction } from '../actions';
import { DeleteButton } from './DeleteButton';
import type { Headliner } from '@/types';
import { formatHeadlinerYears } from '@/lib/headliner-helpers';

type RowItem = Headliner & { imageSrc?: string };

type Props = {
  items: RowItem[];
};

export function HeadlinersSortableTable({ items }: Props) {
  const [rows, setRows] = useState(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const dragIndexRef = useRef<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function commitOrder(nextRows: RowItem[]) {
    setRows(nextRows);
    setStatus('saving');
    startTransition(async () => {
      const result = await reorderHeadlinersAction(nextRows.map((row) => row.id));
      setStatus(result.ok ? 'idle' : 'error');
    });
  }

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
    setDragIndex(index);
  }

  function handleDragOver(event: React.DragEvent, index: number) {
    if (dragIndexRef.current === null) return;
    event.preventDefault();
    setOverIndex(index);
  }

  function handleDrop(index: number) {
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

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <>
      <p className="hint">Перетащите строки за ⋮⋮, чтобы изменить порядок в приложении.</p>
      {status === 'saving' || isPending ? <p className="hint">Сохранение порядка…</p> : null}
      {status === 'error' ? <p className="error">Не удалось сохранить порядок</p> : null}

      <table className="data-table">
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
                  draggable
                  aria-label={`Переместить «${item.name}»`}
                  onDragStart={() => handleDragStart(index)}
                  onDragEnd={handleDragEnd}
                >
                  ⋮⋮
                </button>
              </td>
              <td>
                {item.imageSrc ? (
                  <img className="list-thumb" src={item.imageSrc} alt={item.name} />
                ) : (
                  '—'
                )}
              </td>
              <td>{item.name}</td>
              <td>{formatHeadlinerYears(item.years)}</td>
              <td>{item.description}</td>
              <td className="row-actions">
                <Link
                  className="btn-secondary btn-sm"
                  href={`/admin?tab=headliners&edit=${encodeURIComponent(item.id)}`}
                >
                  Изменить
                </Link>
                <DeleteButton action={deleteHeadlinerAction} id={item.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
