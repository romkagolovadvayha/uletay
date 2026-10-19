'use client';

import { useEffect, useState } from 'react';
import type { selectVkHeadliners } from '../../../../shared/vk-headliners';
import { buildCommunityWidget, isHeadlinersTestGroup, VK_HEADLINERS_APP_URL, VK_HEADLINERS_TEST_GROUP_ID, widgetSetupContext, type WidgetLayout } from '../../../../shared/vk-community-widget';

type Props = { cards: ReturnType<typeof selectVkHeadliners>; dates: string; year: number };
const initialContext = { visible: false, inApp: false, inTestGroup: false };

function withTimeout<T>(request: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('VK response timeout')), milliseconds);
    request.then((value) => { clearTimeout(timer); resolve(value); }, (error: unknown) => { clearTimeout(timer); reject(error); });
  });
}

export function WidgetSetup({ cards, dates, year }: Props) {
  const [context, setContext] = useState(initialContext);
  const [layout, setLayout] = useState<WidgetLayout>('tiles');
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const update = () => setContext(widgetSetupContext(window.location.search, window.location.hash));
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  async function install(addFirst: boolean) {
    if (busy || !context.inApp) return;
    setBusy(true);
    setFailed(false);
    setMessage('Подключаемся к ВК…');
    let step: 'init' | 'add' | 'preview' = 'init';
    try {
      const { default: bridge } = await import('@vkontakte/vk-bridge');
      await withTimeout(bridge.send('VKWebAppInit'), 10000);
      if (addFirst) {
        step = 'add';
        setMessage('В окне ВК выберите сообщество TEST.');
        const result = await withTimeout(bridge.send('VKWebAppAddToCommunity', { hide_success_modal: true }), 180000);
        if (!isHeadlinersTestGroup(result.group_id)) {
          setFailed(true);
          setMessage('Выбрано другое сообщество. Виджет туда не опубликован. Повторите добавление и выберите TEST.');
          return;
        }
        setAdded(true);
      }
      step = 'preview';
      setMessage('Открываем предпросмотр. Подтвердите установку в окне ВК.');
      const widget = buildCommunityWidget(cards, dates, year, layout);
      const result = await withTimeout(bridge.send('VKWebAppShowCommunityWidgetPreviewBox', { group_id: VK_HEADLINERS_TEST_GROUP_ID, ...widget }), 180000);
      // Per VK docs result=true only confirms preview display, not publication.
      setMessage(result.result ? 'Предпросмотр открыт. Сохраните виджет в окне ВК, затем проверьте страницу TEST.' : 'ВК не подтвердил открытие предпросмотра. Попробуйте ещё раз.');
      setFailed(!result.result);
    } catch (error: unknown) {
      const value = error as { error_data?: { error_code?: number }; error_type?: string };
      const code = typeof value?.error_data?.error_code === 'number' ? ` (код ${value.error_data.error_code})` : '';
      setFailed(true);
      setMessage(step === 'add'
        ? `Добавление отменено или недоступно${code}. Проверьте, что в настройках приложения разрешено добавление в сообщества, и выберите TEST.`
        : step === 'preview'
          ? `ВК не открыл предпросмотр${code}. Если приложение ещё не добавлено в TEST, сначала нажмите «Добавить приложение».`
          : `Не удалось подключиться к ВК${code}. Откройте приложение внутри ВКонтакте и повторите.`);
    } finally { setBusy(false); }
  }

  if (!context.visible) return null;
  return <section className="vh-setup" aria-labelledby="widget-setup-title">
    <p className="vh-eyebrow">Настройка сообщества TEST</p>
    <h2 id="widget-setup-title">Виджет на странице ВК</h2>
    <p>Шесть участников с фото сообществ, жанрами и ссылками на музыку. Таймер, все участники и билеты — внутри приложения.</p>
    {!context.inApp ? <a className="vh-button vh-button-primary" href={`${VK_HEADLINERS_APP_URL}#setup`} target="_blank" rel="noopener noreferrer">Открыть настройку в ВК</a> : <>
      <label className="vh-layout-label">Вид в сообществе
        <select value={layout} disabled={busy} onChange={(event) => setLayout(event.target.value as WidgetLayout)}>
          <option value="tiles">Плитки с фотографиями</option>
          <option value="compact_list">Компактный список</option>
        </select>
      </label>
      <p className="vh-setup-note">Расположение плиток зависит от версии ВК. На странице приложения доступны все шесть карточек.</p>
      <div className="vh-setup-actions">
        <button className="vh-button vh-button-primary" disabled={busy || !cards.length} onClick={() => void install(!added && !context.inTestGroup)}>
          {busy ? 'Ожидаем ВК…' : added || context.inTestGroup ? 'Показать виджет в TEST' : 'Добавить приложение и виджет'}
        </button>
        <button className="vh-setup-link" disabled={busy || !cards.length} onClick={() => void install(added || context.inTestGroup)}>
          {added || context.inTestGroup ? 'Добавить приложение' : 'Уже добавлено — открыть предпросмотр'}
        </button>
      </div>
    </>}
    {message && <p className={failed ? 'vh-setup-message vh-setup-error' : 'vh-setup-message'} role={failed ? 'alert' : 'status'}>{message}</p>}
    <a className="vh-setup-link" href={`https://vk.com/club${VK_HEADLINERS_TEST_GROUP_ID}`} target="_blank" rel="noopener noreferrer">Проверить сообщество TEST ↗</a>
  </section>;
}
