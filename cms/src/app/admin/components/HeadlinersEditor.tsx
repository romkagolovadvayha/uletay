import { ContentRevision } from './ContentRevision';
import Link from 'next/link';
import { upsertHeadlinerAction } from '../actions';
import { AdminImageUpload } from './AdminImageUpload';
import { HeadlinersSortableTable } from './HeadlinersSortableTable';
import type { Headliner } from '@/types';
import { presetHint } from '@/lib/image-presets';
import { resolveAdminImageSrc } from '@/lib/resolve-admin-image';
import { formatHeadlinerYears } from '@/lib/headliner-helpers';
import { formatAlternateNamesInput } from '@/lib/headliner-groups';

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
<ContentRevision />
          <div className="panel-heading">
            <div>
              <h2>{isNew ? 'Новый хэдлайнер' : `Редактирование: ${editing?.name ?? ''}`}</h2>
              <p>Основная карточка артиста, связи и изображение для приложения.</p>
            </div>
          </div>
          <input type="hidden" name="isNew" value={isNew ? '1' : '0'} />
          {!isNew && editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="panel-body grid">
            <label className="span-2">
              Имя артиста
              <input name="name" defaultValue={editing?.name ?? ''} required />
            </label>
            <label className="span-2">
              Описание
              <textarea name="description" rows={3} defaultValue={editing?.description ?? ''} />
            </label>
            <label className="span-2">
              Дополнительные названия
              <textarea
                name="alternateNames"
                rows={3}
                defaultValue={formatAlternateNamesInput(editing?.alternateNames)}
                placeholder={'КняZZ\nКороль и Шут'}
              />
              <span className="hint">
                Бывшие или альтернативные имена — по одному в строке. Last.fm подтянется при
                ночном синке в GitHub Actions, не при сохранении.
              </span>
            </label>
            {!isNew && editing ? (
              <div className="span-2 linked-headliners-field">
                <span className="field-label">Связанные хэдлайнеры</span>
                <div className="linked-headliners-list">
                  {items
                    .filter((item) => item.id !== editing.id)
                    .map((item) => (
                      <label key={item.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          name="linkedHeadlinerIds"
                          value={item.id}
                          defaultChecked={editing.linkedHeadlinerIds?.includes(item.id)}
                        />
                        <span>{item.name}</span>
                      </label>
                    ))}
                </div>
                <span className="hint">
                  Другие карточки того же артиста (например, «КняZZ» и «Король и Шут»). Статистика
                  и треки суммируются.
                </span>
              </div>
            ) : null}
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

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Все хэдлайнеры</h2>
            <p>Перетаскивание меняет порядок карточек в приложении.</p>
          </div>
          <span className="count-badge">{items.length}</span>
        </div>
        <div className="panel-body table-wrap">
          <HeadlinersSortableTable items={tableItems} />
          {items.length === 0 ? <p className="empty-state">Хэдлайнеров пока нет</p> : null}
        </div>
      </div>
    </>
  );
}
