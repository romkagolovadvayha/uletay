import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AutographsEditor } from './components/AutographsEditor';
import { FoodcourtEditor } from './components/FoodcourtEditor';
import { HeadlinersEditor } from './components/HeadlinersEditor';
import { MapEditor } from './components/MapEditor';
import { ScheduleEditor } from './components/ScheduleEditor';
import {
  loadAdminData,
  logoutAction,
  saveFestivalAction,
  saveStagesAction,
  uploadImageAction,
} from './actions';
import type { AdminTab } from '@/types';
import { presetHint } from '@/lib/image-presets';
import {
  resolveAdminFestivalHeroSrc,
  resolveAdminFestivalLogoSrc,
} from '@/lib/resolve-admin-image';

const TABS: Record<AdminTab, string> = {
  festival: 'Фестиваль',
  stages: 'Сцены',
  schedule: 'Расписание',
  autographs: 'Автографы',
  headliners: 'Хэдлайнеры',
  foodcourt: 'Фудкорт',
  map: 'Карта',
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    ok?: string;
    error?: string;
    edit?: string;
    stage?: string;
    date?: string;
    category?: string;
  }>;
}) {
  const params = await searchParams;
  const tab = (params.tab ?? 'festival') as AdminTab;
  const activeTab = tab in TABS ? tab : 'festival';

  let data;
  try {
    data = await loadAdminData();
  } catch {
    redirect('/admin/login');
  }

  return (
    <>
      <header className="topbar">
        <h1>УЛЕТАЙ — админка</h1>
        <form action={logoutAction}>
          <button type="submit" className="link-button">
            Выйти
          </button>
        </form>
      </header>

      <nav className="tabs">
        {(Object.entries(TABS) as [AdminTab, string][]).map(([key, label]) => (
          <Link key={key} className={activeTab === key ? 'active' : ''} href={`/admin?tab=${key}`}>
            {label}
          </Link>
        ))}
      </nav>

      <main className="container">
        {params.ok ? <p className="ok">Сохранено</p> : null}
        {params.error ? <p className="error">{decodeURIComponent(params.error)}</p> : null}

        {activeTab === 'festival' ? (
          <>
            <form action={saveFestivalAction} className="panel">
              <div className="grid">
                <label>
                  Название
                  <input name="name" defaultValue={data.festival.name} />
                </label>
                <label>
                  Год
                  <input name="year" type="number" defaultValue={data.festival.year} />
                </label>
                <label>
                  Начало
                  <input name="startDate" type="date" defaultValue={data.festival.startDate} />
                </label>
                <label>
                  Конец
                  <input name="endDate" type="date" defaultValue={data.festival.endDate} />
                </label>
                <label>
                  Локация
                  <input name="location" defaultValue={data.festival.location} />
                </label>
                <label>
                  Локация (коротко)
                  <input name="locationShort" defaultValue={data.festival.locationShort} />
                </label>
                <label>
                  Возраст
                  <input name="ageRating" defaultValue={data.festival.ageRating} />
                </label>
                <label>
                  Hero image URL
                  <input name="heroImageUrl" defaultValue={data.festival.heroImageUrl ?? ''} />
                </label>
                <label>
                  Logo image URL
                  <input name="logoImageUrl" defaultValue={data.festival.logoImageUrl ?? ''} />
                </label>
              </div>
              <img
                className="preview"
                src={resolveAdminFestivalHeroSrc(data.festival.heroImageUrl)}
                alt="hero"
              />
              <img
                className="preview logo-preview"
                src={resolveAdminFestivalLogoSrc(data.festival.logoImageUrl)}
                alt="logo"
              />
              <button type="submit" className="btn-primary">
                Сохранить фестиваль
              </button>
            </form>
            <form action={uploadImageAction} className="panel" encType="multipart/form-data">
              <input type="hidden" name="target" value="festival_logo" />
              <label>
                Загрузить логотип
                <input type="file" name="file" accept="image/*" required />
                <span className="hint">{presetHint('logo')}</span>
              </label>
              <button type="submit" className="btn-primary">
                Загрузить логотип
              </button>
            </form>
            <form action={uploadImageAction} className="panel" encType="multipart/form-data">
              <input type="hidden" name="target" value="festival_hero" />
              <label>
                Загрузить фон главной
                <input type="file" name="file" accept="image/*" required />
                <span className="hint">{presetHint('hero')}</span>
              </label>
              <button type="submit" className="btn-primary">
                Загрузить фон
              </button>
            </form>
          </>
        ) : null}

        {activeTab === 'stages' ? (
          <form action={saveStagesAction} className="panel">
            {data.stages.map((stage) => (
              <div key={stage.id} className="stage-row">
                <input type="hidden" name="stage_id" value={stage.id} />
                <label>
                  ID
                  <input value={stage.id} disabled />
                </label>
                <label>
                  Название
                  <input name="stage_name" defaultValue={stage.name} />
                </label>
                <label>
                  Короткое
                  <input name="stage_short" defaultValue={stage.shortName} />
                </label>
                <label>
                  Цвет
                  <input name="stage_color" type="color" defaultValue={stage.color ?? '#FFFFFF'} />
                </label>
              </div>
            ))}
            <button type="submit" className="btn-primary">
              Сохранить сцены
            </button>
          </form>
        ) : null}

        {activeTab === 'schedule' ? (
          <ScheduleEditor
            items={data.schedule}
            stages={data.stages}
            headliners={data.headliners}
            editId={params.edit}
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
            stageFilter={params.stage}
            dateFilter={params.date}
          />
        ) : null}

        {activeTab === 'headliners' ? (
          <HeadlinersEditor items={data.headliners} editId={params.edit} />
        ) : null}

        {activeTab === 'foodcourt' ? (
          <FoodcourtEditor
            items={data.foodcourt}
            editId={params.edit}
            categoryFilter={params.category}
          />
        ) : null}

        {activeTab === 'map' ? (
          <MapEditor data={data} />
        ) : null}
      </main>
    </>
  );
}
