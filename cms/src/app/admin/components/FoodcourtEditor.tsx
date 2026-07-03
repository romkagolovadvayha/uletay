import Link from 'next/link';
import {
  deleteFoodcourtAction,
  upsertFoodcourtAction,
} from '../actions';
import { DeleteButton } from './DeleteButton';
import type { FoodCourtCategory, FoodCourtVendor } from '@/types';
import { presetHint } from '@/lib/image-presets';

const CATEGORIES: { value: FoodCourtCategory; label: string }[] = [
  { value: 'hot', label: 'Горячее' },
  { value: 'drinks', label: 'Напитки' },
  { value: 'desserts', label: 'Десерты' },
];

const CATEGORY_LABEL: Record<FoodCourtCategory, string> = {
  hot: 'Горячее',
  drinks: 'Напитки',
  desserts: 'Десерты',
};

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
  filtered.sort((a, b) => a.name.localeCompare(b.name, 'ru'));

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

          {editing?.imageUrl ? (
            <img className="preview thumb" src={editing.imageUrl} alt={editing.name} />
          ) : null}

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
        <table className="data-table">
          <thead>
            <tr>
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
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.imageUrl ? (
                    <img className="list-thumb" src={item.imageUrl} alt={item.name} />
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
        {filtered.length === 0 ? <p className="hint">Нет записей</p> : null}
      </div>
    </>
  );
}
