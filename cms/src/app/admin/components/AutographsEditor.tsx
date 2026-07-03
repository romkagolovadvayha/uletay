import Link from 'next/link';
import {
  deleteAutographAction,
  upsertAutographAction,
} from '../actions';
import { DeleteButton } from './DeleteButton';
import type { AutographSession, Stage } from '@/types';
import { presetHint } from '@/lib/image-presets';

type Props = {
  items: AutographSession[];
  stages: Stage[];
  editId?: string;
  stageFilter?: string;
  dateFilter?: string;
};

function stageLabel(stages: Stage[], stageId: string): string {
  return stages.find((s) => s.id === stageId)?.shortName ?? stageId;
}

export function AutographsEditor({ items, stages, editId, stageFilter, dateFilter }: Props) {
  const isNew = editId === 'new';
  const editing = isNew
    ? null
    : editId
      ? items.find((item) => item.id === editId) ?? null
      : null;

  let filtered = [...items];
  if (stageFilter) {
    filtered = filtered.filter((item) => item.stageId === stageFilter);
  }
  if (dateFilter) {
    filtered = filtered.filter((item) => item.date === dateFilter);
  }
  filtered.sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));

  const dates = [...new Set(items.map((item) => item.date))].sort();

  return (
    <>
      <div className="toolbar">
        <Link className="btn-primary" href="/admin?tab=autographs&edit=new">
          + Добавить автограф-сессию
        </Link>
        <form className="filters" method="get">
          <input type="hidden" name="tab" value="autographs" />
          <label>
            Сцена
            <select name="stage" defaultValue={stageFilter ?? ''}>
              <option value="">Все</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.shortName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Дата
            <select name="date" defaultValue={dateFilter ?? ''}>
              <option value="">Все</option>
              {dates.map((date) => (
                <option key={date} value={date}>
                  {date}
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
        <form action={upsertAutographAction} className="panel" encType="multipart/form-data">
          <h2>{isNew ? 'Новая сессия' : 'Редактирование'}</h2>
          <input type="hidden" name="isNew" value={isNew ? '1' : '0'} />
          {!isNew && editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="grid">
            <label>
              Сцена
              <select name="stageId" defaultValue={editing?.stageId ?? stages[0]?.id} required>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Дата
              <input name="date" type="date" defaultValue={editing?.date ?? ''} required />
            </label>
            <label>
              Начало
              <input name="startTime" type="time" defaultValue={editing?.startTime ?? ''} required />
            </label>
            <label>
              Конец
              <input name="endTime" type="time" defaultValue={editing?.endTime ?? ''} required />
            </label>
            <label className="span-2">
              Артист
              <input name="artist" defaultValue={editing?.artist ?? ''} required />
            </label>
            <label className="span-2">
              Место
              <input name="location" defaultValue={editing?.location ?? ''} placeholder="ПАЛАТОЧНЫЙ ГОРОДОК" />
            </label>
            <label className="span-2">
              URL картинки
              <input name="imageUrl" defaultValue={editing?.imageUrl ?? ''} />
            </label>
            <label className="span-2">
              Загрузить картинку
              <input type="file" name="file" accept="image/*" />
              <span className="hint">{presetHint('hero')}</span>
            </label>
          </div>

          {editing?.imageUrl ? (
            <img className="preview thumb" src={editing.imageUrl} alt={editing.artist} />
          ) : null}

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Сохранить
            </button>
            <Link className="btn-secondary" href="/admin?tab=autographs">
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
              <th>Дата</th>
              <th>Время</th>
              <th>Сцена</th>
              <th>Артист</th>
              <th>Место</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.imageUrl ? (
                    <img className="list-thumb" src={item.imageUrl} alt={item.artist} />
                  ) : (
                    '—'
                  )}
                </td>
                <td>{item.date}</td>
                <td>
                  {item.startTime}–{item.endTime}
                </td>
                <td>{stageLabel(stages, item.stageId)}</td>
                <td>{item.artist}</td>
                <td>{item.location ?? '—'}</td>
                <td className="row-actions">
                  <Link
                    className="btn-secondary btn-sm"
                    href={`/admin?tab=autographs&edit=${encodeURIComponent(item.id)}`}
                  >
                    Изменить
                  </Link>
                  <DeleteButton action={deleteAutographAction} id={item.id} />
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
