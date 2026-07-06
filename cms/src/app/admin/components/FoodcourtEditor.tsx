import Link from 'next/link';
import { upsertFoodcourtAction } from '../actions';
import { AdminImagePreview } from './AdminImageThumb';
import { FoodcourtSortableTable } from './FoodcourtSortableTable';
import type { FoodCourtCategory, FoodCourtVendor } from '@/types';
import { presetHint } from '@/lib/image-presets';
import { resolveAdminImageSrc } from '@/lib/resolve-admin-image';

const CATEGORIES: { value: FoodCourtCategory; label: string }[] = [
  { value: 'hot', label: 'Горячее' },
  { value: 'drinks', label: 'Напитки' },
  { value: 'desserts', label: 'Десерты' },
];

type Props = {
  items: FoodCourtVendor[];
  editId?: string;
  categoryFilter?: string;
};

export function FoodcourtEditor({ items, editId, categoryFilter }: Props) {
  const isNew = editId === 'new';
  const editing = isNew
    ? null
    : editId
      ? items.find((item) => item.id === editId) ?? null
      : null;

  let filtered = [...items];
  if (categoryFilter) {
    filtered = filtered.filter((item) => item.category === categoryFilter);
  }

  const tableItems = filtered.map((item) => ({
    ...item,
    imageSrc: resolveAdminImageSrc(item.imageUrl),
  }));

  return (
    <>
      <div className="toolbar">
        <Link className="btn-primary" href="/admin?tab=foodcourt&edit=new">
          + Добавить точку
        </Link>
        <form className="filters" method="get">
          <input type="hidden" name="tab" value="foodcourt" />
          <label>
            Категория
            <select name="category" defaultValue={categoryFilter ?? ''}>
              <option value="">Все</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-secondary btn-sm">
            Фильтр
          </button>
        </form>
      </div>

      {editId ? (
        <form action={upsertFoodcourtAction} className="panel" encType="multipart/form-data">
          <h2>{isNew ? 'Новая точка' : 'Редактирование'}</h2>
          <input type="hidden" name="isNew" value={isNew ? '1' : '0'} />
          {!isNew && editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="grid">
            <label className="span-2">
              Название
              <input name="name" defaultValue={editing?.name ?? ''} required />
            </label>
            <label>
              Категория
              <select name="category" defaultValue={editing?.category ?? 'hot'} required>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Цвет карточки
              <input name="imageTint" type="color" defaultValue={editing?.imageTint ?? '#5C3D2E'} />
            </label>
            <label className="span-2">
              Описание
              <input name="description" defaultValue={editing?.description ?? ''} required />
            </label>
            <label>
              Локация
              <input name="location" defaultValue={editing?.location ?? ''} required />
            </label>
            <label>
              Часы работы
              <input name="hours" defaultValue={editing?.hours ?? ''} placeholder="10:00 — 02:00" required />
            </label>
            <label>
              Цена от
              <input name="priceFrom" defaultValue={editing?.priceFrom ?? ''} placeholder="от 450 ₽" required />
            </label>
            <label>
              Диапазон цен
              <input name="priceRange" defaultValue={editing?.priceRange ?? ''} placeholder="200 - 600 ₽" />
            </label>
            <label>
              Расстояние
              <input name="distance" defaultValue={editing?.distance ?? ''} placeholder="80 м" required />
            </label>
            <label className="span-2">
              URL картинки
              <input name="imageUrl" defaultValue={editing?.imageUrl ?? ''} />
            </label>
            <label className="span-2">
              Загрузить картинку
              <input type="file" name="file" accept="image/*" />
              <span className="hint">{presetHint('thumb')}</span>
            </label>
          </div>

          <AdminImagePreview
            imageUrl={editing?.imageUrl}
            alt={editing?.name ?? 'preview'}
            className="preview thumb"
          />

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Сохранить
            </button>
            <Link className="btn-secondary" href="/admin?tab=foodcourt">
              Отмена
            </Link>
          </div>
        </form>
      ) : null}

      <div className="panel table-wrap">
        <p className="hint">{filtered.length} записей</p>
        {filtered.length > 0 ? (
          <FoodcourtSortableTable
            key={tableItems.map((item) => item.id).join('|')}
            items={tableItems}
            sortable={!categoryFilter}
          />
        ) : (
          <p className="hint">Нет записей</p>
        )}
      </div>
    </>
  );
}
