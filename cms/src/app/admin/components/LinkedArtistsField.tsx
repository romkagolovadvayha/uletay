'use client';

import { useState } from 'react';
import { matchesAdminSearch } from '@/lib/admin-navigation';

export function LinkedArtistsField({
  items,
  selected = [],
}: {
  items: { id: string; name: string }[];
  selected?: string[];
}) {
  const [query, setQuery] = useState('');
  return (
    <div className="linked-headliners-field">
      <label data-no-dirty>
        Найти связанного артиста
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Введите имя…"
        />
      </label>
      <div className="linked-headliners-list">
        {items.map((item) => (
          <label
            className="checkbox-label"
            key={item.id}
            hidden={!matchesAdminSearch(query, item.name)}
          >
            <input
              type="checkbox"
              name="linkedHeadlinerIds"
              value={item.id}
              defaultChecked={selected.includes(item.id)}
            />
            <span>{item.name}</span>
          </label>
        ))}
      </div>
      {!items.some((item) => matchesAdminSearch(query, item.name)) && (
        <p className="hint">Совпадений нет.</p>
      )}
      <p className="hint">
        Выберите карточки одного артиста: их статистика и треки будут объединены.
      </p>
    </div>
  );
}
