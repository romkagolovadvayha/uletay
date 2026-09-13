import { EditorForm, SaveBar } from './EditorForm';
import { CollectionToolbar } from './CollectionToolbar';
import { matchesAdminSearch, adminHref } from '@/lib/admin-navigation';
import { ContentRevision } from './ContentRevision';
import { FoodcourtMenuFields } from './FoodcourtMenuFields';
import Link from 'next/link';
import { upsertFoodcourtAction } from '../actions';
import { AdminImageUpload } from './AdminImageUpload';
import { FoodcourtSortableTable } from './FoodcourtSortableTable';
import type { FoodCourtCategory, FoodCourtVendor } from '@/types';
import { presetHint } from '@/lib/image-presets';
import { resolveAdminFoodcourtImageSrc } from '@/lib/resolve-admin-image';

const CATEGORIES: { value: FoodCourtCategory; label: string }[] = [
  { value: 'hot', label: 'Горячее' },
  { value: 'drinks', label: 'Напитки' },
  { value: 'desserts', label: 'Десерты' },
];

type Props = {
  items: FoodCourtVendor[];
  editId?: string;
  query?: string;
  categoryFilter?: string;
};

export function FoodcourtEditor({ items, editId, query = '', categoryFilter }: Props) {
  const listHref = adminHref('foodcourt', { q: query, category: categoryFilter });
  const isNew = editId === 'new';
  const editing = isNew ? null : editId ? (items.find((item) => item.id === editId) ?? null) : null;

  let filtered = [...items];
  if (categoryFilter) {
    filtered = filtered.filter((item) => item.category === categoryFilter);
  }

  filtered = filtered.filter((item) => matchesAdminSearch(query, item.name, item.location));
  const tableItems = filtered.map((item) => ({
    ...item,
    imageSrc: resolveAdminFoodcourtImageSrc(item.imageUrl, item.id),
  }));

  if (editId && !isNew && !editing)
    return (
      <div className="panel">
        <h2>Запись не найдена</h2>
        <p>Возможно, её уже удалили.</p>
        <Link href="/admin?tab=foodcourt" className="btn-secondary">
          К списку
        </Link>
      </div>
    );

  return (
    <>
      {!editId ? (
        <CollectionToolbar
          key={listHref}
          tab="foodcourt"
          query={query}
          addLabel="Точку питания"
          filtered={Boolean(query || categoryFilter)}
        >
          <label>
            <span className="visually-hidden">Категория</span>
            <select name="category" defaultValue={categoryFilter ?? ''}>
              <option value="">Все категории</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
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
        <EditorForm action={upsertFoodcourtAction} className="panel editor-panel">
          <ContentRevision />
          <input type="hidden" name="_returnTo" value={listHref} />
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
              <input
                name="hours"
                defaultValue={editing?.hours ?? ''}
                placeholder="10:00 — 02:00"
                required
              />
            </label>
            <label>
              Цена от
              <input
                name="priceFrom"
                defaultValue={editing?.priceFrom ?? ''}
                placeholder="от 450 ₽"
                required
              />
            </label>
            <label>
              Диапазон цен
              <input
                name="priceRange"
                defaultValue={editing?.priceRange ?? ''}
                placeholder="200 - 600 ₽"
              />
            </label>
            <label>
              Расстояние
              <input
                name="distance"
                defaultValue={editing?.distance ?? ''}
                placeholder="80 м"
                required
              />
            </label>
            <div className="span-2">
              <AdminImageUpload
                aspect="square"
                currentSrc={resolveAdminFoodcourtImageSrc(editing?.imageUrl, editing?.id)}
                currentValue={editing?.imageUrl}
                hint={presetHint('thumb')}
                label="Изображение точки"
              />
            </div>
          </div>

          <FoodcourtMenuFields initialMenu={editing?.menu} />
          <details className="advanced-panel">
            <summary>Контакты и дополнительная информация</summary>
            <div className="grid">
              <label>
                Название организации
                <input name="legalName" defaultValue={editing?.legalName ?? ''} maxLength={300} />
              </label>
              <label>
                Контакты
                <input name="contacts" defaultValue={editing?.contacts ?? ''} maxLength={500} />
              </label>
              <label className="span-2">
                Примечание для посетителей
                <textarea
                  name="notes"
                  defaultValue={editing?.notes ?? ''}
                  rows={3}
                  maxLength={2000}
                />
              </label>
            </div>
          </details>
          <SaveBar cancelHref={listHref} />
        </EditorForm>
      ) : null}

      {!editId && (
        <div className="panel collection-panel">
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
                listHref={listHref}
                sortable={!categoryFilter && !query}
              />
            ) : (
              <p className="empty-state">По выбранному фильтру ничего не найдено</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
