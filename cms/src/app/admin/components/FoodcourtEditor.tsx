import Link from 'next/link';
import { upsertFoodcourtAction } from '../actions';
import { AdminImageUpload } from './AdminImageUpload';
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
          <div className="panel-heading">
            <div>
              <h2>{isNew ? 'Новая точка' : `Редактирование: ${editing?.name ?? ''}`}</h2>
              <p>Информация, часы работы, цены и изображение карточки.</p>
            </div>
          </div>
          <input type="hidden" name="isNew" value={isNew ? '1' : '0'} />
          {!isNew && editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="panel-body grid">
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
            <div className="span-2">
              <AdminImageUpload
                aspect="square"
                currentSrc={resolveAdminImageSrc(editing?.imageUrl)}
                currentValue={editing?.imageUrl}
                hint={presetHint('thumb')}
                label="Изображение точки"
              />
            </div>
          </div>

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

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Точки фудкорта</h2>
            <p>Порядок без фильтра соответствует порядку в приложении.</p>
          </div>
          <span className="count-badge">{filtered.length}</span>
        </div>
        <div className="panel-body table-wrap">
          {filtered.length > 0 ? (
            <FoodcourtSortableTable
              key={tableItems.map((item) => item.id).join('|')}
              items={tableItems}
              sortable={!categoryFilter}
            />
          ) : (
            <p className="empty-state">По выбранному фильтру ничего не найдено</p>
          )}
        </div>
      </div>
    </>
  );
}
