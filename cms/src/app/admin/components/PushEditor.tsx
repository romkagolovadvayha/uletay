'use client';

import { useState, type FormEvent } from 'react';
import { SubmitButton } from './EditorForm';
import type { AppData } from '@/types';
import type { PushBroadcastHistoryItem, PushStats } from '@/lib/push';
import { sendPushBroadcastAction } from '../actions';

type PushEditorProps = {
  data: AppData;
  stats: PushStats;
  history: PushBroadcastHistoryItem[];
  resultMessage?: string;
  webPushConfigured: boolean;
};

function optionPath(prefix: string, id: string): string {
  return `${prefix}/${encodeURIComponent(id)}`;
}

function handleSubmit(event: FormEvent<HTMLFormElement>) {
  const form = event.currentTarget;
  const formData = new FormData(form);
  const title = String(formData.get('title') ?? '');
  const audience = String(formData.get('audience') ?? 'all');
  const audienceLabel =
    audience === 'native'
      ? 'в приложения'
      : audience === 'web'
        ? 'в веб-версию'
        : 'всем подписчикам';
  if (
    !window.confirm(
      `Отправить «${title}» ${audienceLabel}? Отменить рассылку после отправки нельзя.`,
    )
  ) {
    event.preventDefault();
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Samara',
  }).format(new Date(value));
}

export function PushEditor({
  data,
  stats,
  history,
  resultMessage,
  webPushConfigured,
}: PushEditorProps) {
  const [preview, setPreview] = useState({ title: '', body: '' });
  const total = stats.ios + stats.android + stats.web;

  return (
    <>
      <section className="push-stats" aria-label="Активные push-подписки">
        <div>
          <strong>{total}</strong>
          <span>Всего</span>
        </div>
        <div>
          <strong>{stats.ios}</strong>
          <span>iOS</span>
        </div>
        <div>
          <strong>{stats.android}</strong>
          <span>Android</span>
        </div>
        <div>
          <strong>{stats.web}</strong>
          <span>Веб</span>
        </div>
      </section>

      {resultMessage ? <p className="ok">{resultMessage}</p> : null}
      {!webPushConfigured ? (
        <p className="warning">
          Уведомления для веб-версии пока не подключены. Обратитесь к администратору сервера.
          Рассылка в iOS и Android доступна.
        </p>
      ) : null}

      <div className="push-compose-layout">
        <form
          action={sendPushBroadcastAction}
          className="panel push-form"
          onSubmit={handleSubmit}
          onChange={(event) => {
            const form = new FormData(event.currentTarget);
            setPreview({
              title: String(form.get('title') ?? ''),
              body: String(form.get('body') ?? ''),
            });
          }}
        >
          <div>
            <h2>Новая рассылка</h2>
            <p className="hint">
              Уведомление отправится сразу. Пользователь по нажатию попадёт на выбранный экран.
            </p>
          </div>

          <label>
            Заголовок
            <input
              name="title"
              required
              maxLength={120}
              placeholder="Изменение в расписании"
              autoComplete="off"
            />
          </label>

          <label>
            Текст уведомления
            <textarea
              name="body"
              required
              maxLength={500}
              rows={4}
              placeholder="Расскажите коротко, что произошло и зачем открыть приложение"
            />
          </label>

          <div className="grid">
            <label>
              Получатели
              <select name="audience" defaultValue="all">
                <option value="all">Все подписчики</option>
                <option value="native">Только iOS и Android</option>
                <option value="web">Только веб-версия</option>
              </select>
            </label>

            <label>
              Куда перейти по нажатию
              <select name="targetPath" defaultValue="/">
                <optgroup label="Основные экраны">
                  <option value="/">Главная</option>
                  <option value="/schedule">Расписание</option>
                  <option value="/favorites">Моё расписание</option>
                  <option value="/map">Карта</option>
                  <option value="/autographs">Автограф-сессии</option>
                  <option value="/headliners">Хэдлайнеры</option>
                  <option value="/playlist">Плейлист</option>
                  <option value="/foodcourt">Фудкорт</option>
                  <option value="/about">О фестивале</option>
                  <option value="/rules">Правила</option>
                  <option value="/settings">Настройки</option>
                </optgroup>
                {data.schedule.length ? (
                  <optgroup label="Выступления">
                    {data.schedule.map((item) => (
                      <option key={item.id} value={optionPath('/schedule/live', item.id)}>
                        {item.artist} — {item.date}, {item.startTime}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {data.autographs.length ? (
                  <optgroup label="Автограф-сессии">
                    {data.autographs.map((item) => (
                      <option key={item.id} value={optionPath('/autographs', item.id)}>
                        {item.artist} — {item.date}, {item.startTime}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {data.headliners.length ? (
                  <optgroup label="Хэдлайнеры">
                    {data.headliners.map((item) => (
                      <option key={item.id} value={optionPath('/headliners', item.id)}>
                        {item.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {data.foodcourt.length ? (
                  <optgroup label="Фудкорт">
                    {data.foodcourt.map((item) => (
                      <option key={item.id} value={optionPath('/foodcourt', item.id)}>
                        {item.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </label>
          </div>

          <details className="push-advanced">
            <summary>Указать адрес экрана вручную</summary>
            <label>
              Адрес внутри приложения
              <input
                name="customPath"
                maxLength={255}
                placeholder="/map/entrance-main"
                autoComplete="off"
              />
              <span className="hint">
                Если заполнено, заменяет выбор выше. Допустимы только внутренние экраны приложения.
              </span>
            </label>
          </details>
          <SubmitButton pendingLabel="Отправляем…">Отправить уведомление</SubmitButton>
        </form>
        <aside className="push-preview">
          <span className="admin-eyebrow">Предпросмотр</span>
          <div className="push-phone">
            <div className="push-phone-time">12:00</div>
            <div className="push-notification">
              <span>УЛЕТАЙ · сейчас</span>
              <strong>{preview.title || 'Заголовок уведомления'}</strong>
              <p>{preview.body || 'Здесь появится текст вашего сообщения.'}</p>
            </div>
          </div>
          <p className="hint">Пример отображения. Вид уведомления зависит от устройства.</p>
        </aside>
      </div>

      <section className="panel">
        <h2>История рассылок</h2>
        {history.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Когда</th>
                  <th>Сообщение</th>
                  <th>Переход</th>
                  <th>Результат</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>
                      <strong>{item.title}</strong>
                      <div className="push-history-body">{item.body}</div>
                    </td>
                    <td>
                      <code>{item.targetPath}</code>
                    </td>
                    <td>
                      <div>
                        Приложения: {item.nativeAccepted} / {item.nativeFailed}
                      </div>
                      <div>
                        Веб: {item.webSent} / {item.webFailed}
                      </div>
                      {item.errors.length ? (
                        <div className="push-history-error">{item.errors.join('; ')}</div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="hint">Рассылок ещё не было.</p>
        )}
        <p className="hint">
          Для приложений первое число означает, что Expo принял сообщение к доставке; второе —
          ошибки при передаче.
        </p>
      </section>
    </>
  );
}
