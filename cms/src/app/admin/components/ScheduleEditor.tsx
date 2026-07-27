import Link from 'next/link';
import {
  deleteScheduleAction,
  upsertScheduleAction,
} from '../actions';
import { DeleteButton } from './DeleteButton';
import { AdminImageThumb } from './AdminImageThumb';
import { HeadlinerSearchSelect } from './HeadlinerSearchSelect';
import { resolveAdminImageSrc } from '@/lib/resolve-admin-image';
import type { Headliner, SchedulePerformance, Stage } from '@/types';

type Props = {
  items: SchedulePerformance[];
  stages: Stage[];
  headliners: Headliner[];
  editId?: string;
  stageFilter?: string;
  dateFilter?: string;
};

function stageLabel(stages: Stage[], stageId: string): string {
  return stages.find((s) => s.id === stageId)?.shortName ?? stageId;
}

export function ScheduleEditor({ items, stages, headliners, editId, stageFilter, dateFilter }: Props) {
  const rows = items ?? [];
  const isNew = editId === 'new';
  const editing = isNew
    ? null
    : editId
      ? rows.find((item) => item.id === editId) ?? null
      : null;

  const headlinerById = new Map(headliners.map((headliner) => [headliner.id, headliner]));
  const headlinerOptions = headliners.map((headliner) => ({
    id: headliner.id,
    name: headliner.name,
    previewSrc: resolveAdminImageSrc(headliner.imageUrl, headliner.name),
  }));

  let filtered = [...rows];
  if (stageFilter) {
    filtered = filtered.filter((item) => item.stageId === stageFilter);
  }
  if (dateFilter) {
    filtered = filtered.filter((item) => item.date === dateFilter);
  }
  filtered.sort((a, b) => `${a.date ?? ''}${a.startTime ?? ''}`.localeCompare(`${b.date ?? ''}${b.startTime ?? ''}`));

  const dates = [...new Set(rows.map((item) => item.date).filter(Boolean))].sort();

  return (
    <>
      <div className="toolbar">
        <Link className="btn-primary" href="/admin?tab=schedule&edit=new">
          + Добавить выступление
        </Link>
        <form className="filters" method="get">
          <input type="hidden" name="tab" value="schedule" />
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
        <form action={upsertScheduleAction} className="panel">
          <div className="panel-heading">
            <div>
              <h2>{isNew ? 'Новое выступление' : `Редактирование: ${editing?.artist ?? ''}`}</h2>
              <p>Укажите сцену, время и выберите артиста из общего списка.</p>
            </div>
          </div>
          <input type="hidden" name="isNew" value={isNew ? '1' : '0'} />
          {!isNew && editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="panel-body grid">
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
              Хэдлайнер
              <HeadlinerSearchSelect
                name="headlinerId"
                headliners={headlinerOptions}
                defaultValue={editing?.headlinerId ?? headliners[0]?.id ?? ''}
                required
              />
              <span className="hint">
                Фото берётся из карточки хэдлайнера.{' '}
                <Link href="/admin?tab=headliners&edit=new">Добавить нового артиста</Link>
              </span>
            </label>
            <label className="checkbox-label">
              <input
                name="isCompetition"
                type="checkbox"
                value="1"
                defaultChecked={editing?.isCompetition ?? false}
              />
              Конкурсное выступление
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Сохранить
            </button>
            <Link className="btn-secondary" href="/admin?tab=schedule">
              Отмена
            </Link>
          </div>
        </form>
      ) : null}

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Программа выступлений</h2>
            <p>Используйте фильтры, чтобы быстро найти нужный слот.</p>
          </div>
          <span className="count-badge">{filtered.length}</span>
        </div>
        <div className="panel-body table-wrap">
          <table className="data-table">
          <thead>
            <tr>
              <th />
              <th>Дата</th>
              <th>Время</th>
              <th>Сцена</th>
              <th>Артист</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const headliner = headlinerById.get(item.headlinerId);
              return (
                <tr key={item.id}>
                  <td>
                    <AdminImageThumb
                      imageUrl={headliner?.imageUrl}
                      artist={item.artist}
                      alt={item.artist}
                      className="list-thumb"
                    />
                  </td>
                  <td>{item.date}</td>
                  <td>
                    {item.startTime}–{item.endTime}
                  </td>
                  <td>{stageLabel(stages, item.stageId)}</td>
                  <td>
                    {item.artist}
                    {item.isCompetition ? <span className="badge">конкурс</span> : null}
                  </td>
                  <td className="row-actions">
                    <Link className="btn-secondary btn-sm" href={`/admin?tab=schedule&edit=${encodeURIComponent(item.id)}`}>
                      Изменить
                    </Link>
                    <DeleteButton action={deleteScheduleAction} id={item.id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
          {filtered.length === 0 ? <p className="empty-state">Выступлений не найдено</p> : null}
        </div>
      </div>
    </>
  );
}
