import { AdminOverview } from './components/AdminOverview';
import { EditorForm, SaveBar } from './components/EditorForm';
import { buildAdminSearch } from '@/lib/admin-navigation';
import { redirect } from 'next/navigation';
import { AdminImageUpload } from './components/AdminImageUpload';
import { AdminNotice } from './components/AdminNotice';
import { AdminShell } from './components/AdminShell';
import { AutographsEditor } from './components/AutographsEditor';
import { FoodcourtEditor } from './components/FoodcourtEditor';
import { HeadlinersEditor } from './components/HeadlinersEditor';
import { MapEditor } from './components/MapEditor';
import { ScheduleEditor } from './components/ScheduleEditor';
import { PushEditor } from './components/PushEditor';
import { loadAdminData, saveFestivalAction, saveStagesAction } from './actions';
import { logoutAction } from './auth-actions';
import { getCurrentAdmin } from '@/lib/session';
import { AccessEditor } from './components/AccessEditor';
import type { AdminTab } from '@/types';
import { presetHint } from '@/lib/image-presets';
import {
  resolveAdminFestivalHeroSrc,
  resolveAdminFestivalLogoSrc,
} from '@/lib/resolve-admin-image';
import { config } from '@/lib/config';
import { getPushBroadcastHistory, getPushStats } from '@/lib/push';
import { ContentRevision, ContentRevisionProvider } from './components/ContentRevision';

const TABS: Record<AdminTab, string> = {
  overview: 'Обзор',
  festival: 'Фестиваль',
  stages: 'Сцены',
  schedule: 'Расписание',
  autographs: 'Автографы',
  headliners: 'Хэдлайнеры',
  foodcourt: 'Фудкорт',
  map: 'Карта',
  push: 'Push',
  access: 'Доступы',
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    year?: string;
    ok?: string;
    error?: string;
    edit?: string;
    stage?: string;
    date?: string;
    category?: string;
    pushResult?: string;
  }>;
}) {
  const params = await searchParams;
  const tab = (params.tab ?? 'overview') as AdminTab;
  const activeTab = Object.hasOwn(TABS, tab) ? tab : 'overview';

  const admin = await getCurrentAdmin();
  if (!admin) redirect('/admin/login');
  if (activeTab === 'access' && admin.role !== 'owner') redirect('/admin');
  const data = await loadAdminData();

  return (
    <ContentRevisionProvider key={data.revision} value={data.revision}>
      <AdminShell
        activeTab={activeTab}
        admin={admin}
        logoutAction={logoutAction}
        searchItems={buildAdminSearch(data).filter((item) => admin.role === 'owner' || item.href !== '/admin?tab=access')}
        festivalName={data.festival.name}
        festivalYear={data.festival.year}
      >
        {activeTab === 'overview' && <AdminOverview data={data} />}
        {activeTab === 'access' && <AccessEditor />}
        {params.ok ? <AdminNotice tone="success">Изменения сохранены</AdminNotice> : null}
        {params.error ? <AdminNotice tone="error">{params.error}</AdminNotice> : null}

        {activeTab === 'festival' ? (
          <EditorForm action={saveFestivalAction} className="admin-form">
            <ContentRevision />
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Основная информация</h2>
                  <p>Базовые данные, которые отображаются в приложении и на сайте.</p>
                </div>
              </div>
              <div className="panel-body">
                <div className="grid">
                  <label className="span-2">
                    Название
                    <input name="name" defaultValue={data.festival.name} required />
                  </label>
                  <label>
                    Год
                    <input
                      name="year"
                      type="number"
                      min="2020"
                      max="2100"
                      defaultValue={data.festival.year}
                      required
                    />
                  </label>
                  <label>
                    Возрастной рейтинг
                    <select name="ageRating" defaultValue={data.festival.ageRating}>
                      {['0+', '6+', '12+', '16+', '18+'].map((rating) => (
                        <option key={rating} value={rating}>
                          {rating}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Даты и локация</h2>
                  <p>Период проведения и подписи места для разных размеров экрана.</p>
                </div>
              </div>
              <div className="panel-body">
                <div className="grid">
                  <label>
                    Дата начала
                    <input
                      name="startDate"
                      type="date"
                      defaultValue={data.festival.startDate}
                      required
                    />
                  </label>
                  <label>
                    Дата окончания
                    <input
                      name="endDate"
                      type="date"
                      defaultValue={data.festival.endDate}
                      required
                    />
                  </label>
                  <label className="span-2">
                    Полная локация
                    <input name="location" defaultValue={data.festival.location} required />
                    <span className="hint">Например: Удмуртия, с. Лагуново</span>
                  </label>
                  <label className="span-2">
                    Короткая подпись
                    <input
                      name="locationShort"
                      defaultValue={data.festival.locationShort}
                      required
                    />
                    <span className="hint">Используется в компактных карточках и заголовках.</span>
                  </label>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Медиа-материалы</h2>
                  <p>Файлы автоматически обрезаются и оптимизируются при сохранении.</p>
                </div>
              </div>
              <div className="panel-body image-fields-grid">
                <AdminImageUpload
                  aspect="logo"
                  currentSrc={resolveAdminFestivalLogoSrc(data.festival.logoImageUrl)}
                  currentValue={data.festival.logoImageUrl}
                  fileName="logoFile"
                  hint={presetHint('logo')}
                  label="Логотип фестиваля"
                  removeName="removeLogoImage"
                  valueName="logoImageUrl"
                />
                <AdminImageUpload
                  aspect="hero"
                  currentSrc={resolveAdminFestivalHeroSrc(data.festival.heroImageUrl)}
                  currentValue={data.festival.heroImageUrl}
                  fileName="heroFile"
                  hint={presetHint('hero')}
                  label="Фон главной страницы"
                  removeName="removeHeroImage"
                  valueName="heroImageUrl"
                />
              </div>
            </section>

            <SaveBar />
          </EditorForm>
        ) : null}

        {activeTab === 'stages' ? (
          <EditorForm action={saveStagesAction} className="admin-form">
            <ContentRevision />
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Список сцен</h2>
                  <p>Цвет используется в расписании, фильтрах и на карте.</p>
                </div>
                <span className="count-badge">{data.stages.length}</span>
              </div>
              <div className="panel-body stage-list">
                {data.stages.map((stage) => (
                  <div key={stage.id} className="stage-row">
                    <input type="hidden" name="stage_id" value={stage.id} />
                    <label>
                      Название
                      <input name="stage_name" defaultValue={stage.name} />
                    </label>
                    <label>
                      Короткое название
                      <input name="stage_short" defaultValue={stage.shortName} />
                    </label>
                    <label>
                      Цвет
                      <span className="color-field">
                        <input
                          name="stage_color"
                          type="color"
                          defaultValue={stage.color ?? '#FFFFFF'}
                        />
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </section>
            <SaveBar />
          </EditorForm>
        ) : null}

        {activeTab === 'schedule' ? (
          <ScheduleEditor
            items={data.schedule}
            stages={data.stages}
            headliners={data.headliners}
            editId={params.edit}
            query={params.q}
            stageFilter={params.stage}
            dateFilter={params.date}
          />
        ) : null}

        {activeTab === 'autographs' ? (
          <AutographsEditor
            items={data.autographs}
            stages={data.stages}
            headliners={data.headliners}
            editId={params.edit}
            query={params.q}
            stageFilter={params.stage}
            dateFilter={params.date}
          />
        ) : null}

        {activeTab === 'headliners' ? (
          <HeadlinersEditor
            yearFilter={params.year && /^\d{4}$/.test(params.year) ? params.year : undefined}
            items={data.headliners}
            editId={params.edit}
            query={params.q}
          />
        ) : null}

        {activeTab === 'foodcourt' ? (
          <FoodcourtEditor
            items={data.foodcourt}
            editId={params.edit}
            query={params.q}
            categoryFilter={params.category}
          />
        ) : null}

        {activeTab === 'map' ? <MapEditor data={data} /> : null}

        {activeTab === 'push' ? (
          <PushEditor
            data={data}
            stats={await getPushStats()}
            history={await getPushBroadcastHistory()}
            resultMessage={params.pushResult}
            webPushConfigured={Boolean(config.vapidPublicKey && config.vapidPrivateKey)}
          />
        ) : null}
      </AdminShell>
    </ContentRevisionProvider>
  );
}
