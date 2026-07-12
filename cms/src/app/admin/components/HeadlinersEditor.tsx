import Link from 'next/link';
import { upsertHeadlinerAction } from '../actions';
import { AdminImagePreview } from './AdminImageThumb';
import { HeadlinersSortableTable } from './HeadlinersSortableTable';
import type { Headliner } from '@/types';
import { presetHint } from '@/lib/image-presets';
import { resolveAdminImageSrc } from '@/lib/resolve-admin-image';
import { formatHeadlinerYears } from '@/lib/headliner-helpers';

type Props = {
  items: Headliner[];
  editId?: string;
};

export function HeadlinersEditor({ items, editId }: Props) {
  const isNew = editId === 'new';
  const editing = isNew
    ? null
    : editId
      ? items.find((item) => item.id === editId) ?? null
      : null;

  const tableItems = items.map((item) => ({
    ...item,
    imageSrc: resolveAdminImageSrc(item.imageUrl, item.name),
  }));

  return (
    <>
      <div className="toolbar">
        <Link className="btn-primary" href="/admin?tab=headliners&edit=new">
          + Добавить хэдлайнера
        </Link>
      </div>

      {editId ? (
        <form action={upsertHeadlinerAction} className="panel" encType="multipart/form-data">
          <h2>{isNew ? 'Новый хэдлайнер' : 'Редактирование'}</h2>
          <input type="hidden" name="isNew" value={isNew ? '1' : '0'} />
          {!isNew && editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="grid">
            <label className="span-2">
              Имя артиста
              <input name="name" defaultValue={editing?.name ?? ''} required />
            </label>
            <label className="span-2">
              Описание
              <textarea name="description" rows={3} defaultValue={editing?.description ?? ''} />
            </label>
            <label>
              Цвет карточки
              <input
                name="imageTint"
                type="color"
                defaultValue={editing?.imageTint ?? '#4A1C1C'}
              />
            </label>
            <label>
              Годы (теги)
              <input
                name="years"
                defaultValue={editing ? formatHeadlinerYears(editing.years) : ''}
                placeholder="2026, 2027"
              />
              <span className="hint">
                Можно указать вручную. Годы также подтягиваются из расписания и автографов.
              </span>
            </label>
            <label className="span-2">
              URL картинки
              <input name="imageUrl" defaultValue={editing?.imageUrl ?? ''} placeholder="/api/uploads/..." />
            </label>
            <label className="span-2">
              Загрузить фото
              <input type="file" name="file" accept="image/*" />
              <span className="hint">{presetHint('artist')}</span>
            </label>
          </div>

          <AdminImagePreview
            imageUrl={editing?.imageUrl}
            artist={editing?.name}
            alt={editing?.name ?? 'preview'}
            className="preview thumb"
          />

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Сохранить
            </button>
            <Link className="btn-secondary" href="/admin?tab=headliners">
              Отмена
            </Link>
          </div>
        </form>
      ) : null}

      <div className="panel table-wrap">
        <p className="hint">{items.length} артистов в общем списке</p>
        <HeadlinersSortableTable items={tableItems} />
        {items.length === 0 ? <p className="hint">Нет хэдлайнеров</p> : null}
      </div>
    </>
  );
}
