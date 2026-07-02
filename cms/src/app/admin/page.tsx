import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  loadAdminData,
  logoutAction,
  saveFestivalAction,
  saveJsonTabAction,
  saveStagesAction,
  uploadImageAction,
} from './actions';
import type { AdminTab } from '@/types';

const TABS: Record<AdminTab, string> = {
  festival: 'Фестиваль',
  stages: 'Сцены',
  schedule: 'Расписание',
  autographs: 'Автографы',
  foodcourt: 'Фудкорт',
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; ok?: string; error?: string }>;
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
                  <input name="startDate" defaultValue={data.festival.startDate} />
                </label>
                <label>
                  Конец
                  <input name="endDate" defaultValue={data.festival.endDate} />
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
              </div>
              {data.festival.heroImageUrl ? (
                <img className="preview" src={data.festival.heroImageUrl} alt="hero" />
              ) : null}
              <button type="submit">Сохранить фестиваль</button>
            </form>
            <form action={uploadImageAction} className="panel" encType="multipart/form-data">
              <input type="hidden" name="target" value="festival_hero" />
              <label>
                Загрузить hero-картинку
                <input type="file" name="file" accept="image/*" required />
              </label>
              <button type="submit">Загрузить</button>
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
            <button type="submit">Сохранить сцены</button>
          </form>
        ) : null}

        {activeTab === 'schedule' || activeTab === 'autographs' || activeTab === 'foodcourt' ? (
          <>
            <form
              action={saveJsonTabAction.bind(null, activeTab)}
              className="panel"
            >
              <p className="hint">
                JSON-массив. Для картинок исполнителей добавьте поле <code>imageUrl</code>.
              </p>
              <textarea
                name="json"
                rows={24}
                defaultValue={JSON.stringify(data[activeTab], null, 2)}
              />
              <button type="submit">Сохранить {TABS[activeTab]}</button>
            </form>
            <section className="panel">
              <h2>Загрузка картинки</h2>
              <form action={uploadImageAction} encType="multipart/form-data">
                <input
                  type="hidden"
                  name="target"
                  value={
                    activeTab === 'schedule'
                      ? 'schedule'
                      : activeTab === 'autographs'
                        ? 'autograph'
                        : 'foodcourt'
                  }
                />
                <label>
                  ID записи
                  <input name="id" required placeholder="например south-2026-07-08-15:00-NADИ" />
                </label>
                <label>
                  Файл
                  <input type="file" name="file" accept="image/*" required />
                </label>
                <button type="submit">Загрузить картинку</button>
              </form>
            </section>
          </>
        ) : null}
      </main>
    </>
  );
}
