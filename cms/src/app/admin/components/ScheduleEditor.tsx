import { EditorForm, SaveBar } from './EditorForm';
import { CollectionToolbar } from './CollectionToolbar';
import { matchesAdminSearch, adminHref } from '@/lib/admin-navigation';
import { ContentRevision } from './ContentRevision';
import Link from 'next/link';
import { deleteScheduleAction, upsertScheduleAction } from '../actions';
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
  query?: string;
  stageFilter?: string;
  dateFilter?: string;
};

function stageLabel(stages: Stage[], stageId: string): string {
  return stages.find((s) => s.id === stageId)?.shortName ?? stageId;
}

export function ScheduleEditor({
  items,
  stages,
  headliners,
  editId,
  query = '',
  stageFilter,
  dateFilter,
}: Props) {
  const rows = items ?? [];
  const listHref = adminHref('schedule', { q: query, stage: stageFilter, date: dateFilter });
  const isNew = editId === 'new';
  const editing = isNew ? null : editId ? (rows.find((item) => item.id === editId) ?? null) : null;

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
  filtered.sort((a, b) =>
    `${a.date ?? ''}${a.startTime ?? ''}`.localeCompare(`${b.date ?? ''}${b.startTime ?? ''}`),
  );

  filtered = filtered.filter((item) => matchesAdminSearch(query, item.artist));
  const dates = [...new Set(rows.map((item) => item.date).filter(Boolean))].sort();

  if (editId && !isNew && !editing)
    return (
      <div className="panel">
        <h2>Запись не найдена</h2>
        <p>Возможно, её уже удалили.</p>
        <Link href="/admin?tab=schedule" className="btn-secondary">
          К списку
        </Link>
      </div>
    );

  return (
    <>
      {!editId ? (
        <CollectionToolbar
          key={listHref}
          tab="schedule"
          query={query}
          addLabel="Выступление"
          filtered={Boolean(query || stageFilter || dateFilter)}
        >
          <label>
            <span className="visually-hidden">Сцена</span>
            <select name="stage" defaultValue={stageFilter ?? ''}>
              <option value="">Все сцены</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.shortName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">Дата</span>
            <select name="date" defaultValue={dateFilter ?? ''}>
              <option value="">Все даты</option>
              {dates.map((date) => (
                <option key={date} value={date}>
                  {date.split('-').reverse().join('.')}
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
        <EditorForm action={upsertScheduleAction} className="panel editor-panel">
          <ContentRevision />
          <input type="hidden" name="_returnTo" value={listHref} />
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
              <input
                name="startTime"
                type="time"
                defaultValue={editing?.startTime ?? ''}
                required
              />
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

          <SaveBar cancelHref={listHref} />
        </EditorForm>
      ) : null}

      {!editId && (
        <div className="panel collection-panel">
          <div className="panel-heading">
            <div>
              <h2>Программа выступлений</h2>
              <p>Используйте фильтры, чтобы быстро найти нужный слот.</p>
            </div>
            <span className="count-badge">{filtered.length}</span>
          </div>
          <div className="panel-body table-wrap">
            <table className="data-table responsive-table">
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
                      <td className="row-image">
                        <AdminImageThumb
                          imageUrl={headliner?.imageUrl}
                          artist={item.artist}
                          alt={item.artist}
                          className="list-thumb"
                        />
                      </td>
                      <td data-label="Дата">{item.date.split('-').reverse().join('.')}</td>
                      <td data-label="Время">
                        {item.startTime}–{item.endTime}
                      </td>
                      <td data-label="Сцена">{stageLabel(stages, item.stageId)}</td>
                      <td className="row-title">
                        {item.artist}
                        {item.isCompetition ? <span className="badge">конкурс</span> : null}
                      </td>
                      <td className="row-actions">
                        <Link
                          className="btn-secondary btn-sm"
                          href={`${listHref}&edit=${encodeURIComponent(item.id)}`}
                        >
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
      )}
    </>
  );
}
