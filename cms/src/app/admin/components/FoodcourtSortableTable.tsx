'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useContentRevision } from './ContentRevision';
import { useRef, useState, useTransition } from 'react';
import { deleteFoodcourtAction, reorderFoodcourtAction } from '../actions';
import { DeleteButton } from './DeleteButton';
import type { FoodCourtCategory, FoodCourtVendor } from '@/types';

const CATEGORY_LABEL: Record<FoodCourtCategory, string> = {
  hot: 'Горячее',
  drinks: 'Напитки',
  desserts: 'Десерты',
};

type RowItem = FoodCourtVendor & { imageSrc?: string };

type Props = {
  items: RowItem[];
  sortable: boolean;
};

export function FoodcourtSortableTable({ items, sortable }: Props) {
  const revision = useContentRevision();
  const router = useRouter();
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
      const result = await reorderFoodcourtAction(nextRows.map((row) => row.id), revision);
      setStatus(result.ok ? 'idle' : 'error');
      if (result.ok) router.refresh();
    });
  }

  function handleDragStart(index: number) {
    if (!sortable) return;
    dragIndexRef.current = index;
    setDragIndex(index);
  }

  function handleDragOver(event: React.DragEvent, index: number) {
    if (!sortable || dragIndexRef.current === null) return;
    event.preventDefault();
    setOverIndex(index);
  }

  function handleDrop(index: number) {
    if (!sortable) return;
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
      {sortable ? (
        <p className="hint">Перетащите строки за ⋮⋮, чтобы изменить порядок в приложении.</p>
      ) : (
        <p className="hint">Сбросьте фильтр категории, чтобы менять порядок перетаскиванием.</p>
      )}
      {status === 'saving' || isPending ? <p className="hint">Сохранение порядка…</p> : null}
      {status === 'error' ? <p className="error">Не удалось сохранить порядок</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            {sortable ? <th aria-label="Порядок" /> : null}
            <th />
            <th>Название</th>
            <th>Категория</th>
            <th>Локация</th>
            <th>Часы</th>
            <th>Цена</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((item, index) => (
            <tr
              key={item.id}
              className={[
                sortable ? 'sortable-row' : '',
                dragIndex === index ? 'sortable-row-dragging' : '',
                overIndex === index && dragIndex !== index ? 'sortable-row-over' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onDragOver={(event) => handleDragOver(event, index)}
              onDrop={() => handleDrop(index)}
            >
              {sortable ? (
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
              ) : null}
              <td>
                {item.imageSrc ? (
                  <img className="list-thumb" src={item.imageSrc} alt={item.name} />
                ) : (
                  '—'
                )}
              </td>
              <td>{item.name}</td>
              <td>{CATEGORY_LABEL[item.category]}</td>
              <td>{item.location}</td>
              <td>{item.hours}</td>
              <td>{item.priceFrom}</td>
              <td className="row-actions">
                <Link
                  className="btn-secondary btn-sm"
                  href={`/admin?tab=foodcourt&edit=${encodeURIComponent(item.id)}`}
                >
                  Изменить
                </Link>
                <DeleteButton action={deleteFoodcourtAction} id={item.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
