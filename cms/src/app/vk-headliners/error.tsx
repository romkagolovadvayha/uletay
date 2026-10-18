'use client';

export default function HeadlinersError({ reset }: { reset: () => void }) {
  return <main style={{ maxWidth: 560, margin: '80px auto', padding: 24, fontFamily: 'Arial, sans-serif', lineHeight: 1.6 }}>
    <h1>Не удалось загрузить участников</h1>
    <p>Попробуйте ещё раз или откройте приложение фестиваля.</p>
    <button onClick={reset} style={{ padding: '14px 20px', marginRight: 16 }}>Повторить</button>
    <a href="https://uletayapp.ru/headliners" target="_blank" rel="noopener noreferrer">Все участники</a>
  </main>;
}
