'use client';

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <main className="auth-page">
      <section className="auth-card" role="alert">
        <h1>Не удалось открыть раздел</h1>
        <p>
          Повторите попытку. Если ошибка сохраняется, проверьте подключение к базе данных и журнал
          CMS.
        </p>
        <button type="button" className="btn-primary" onClick={reset}>
          Повторить
        </button>
        <a href="/admin">Перейти к обзору</a>
      </section>
    </main>
  );
}
