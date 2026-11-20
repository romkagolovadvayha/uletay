'use client';

import { useState } from 'react';
import { ARTIST_GENRE_OPTIONS } from '../../../../../shared/music-genres';

export function ArtistGenresField({ selected = [] }: { selected?: string[] }) {
  const [query, setQuery] = useState('');
  const [values, setValues] = useState(new Set(selected));
  const matches = (genre: string) => genre.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru'));
  return <fieldset className="span-2 artist-genres-field">
    <legend>Музыкальные жанры</legend>
    <input type="hidden" name="genresPresent" value="1" />
    <label data-no-dirty>Найти жанр
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Например, фолк-рок" />
    </label>
    <div className="artist-genres-options">
      {ARTIST_GENRE_OPTIONS.map(genre => <label className="checkbox-label" key={genre} hidden={!matches(genre)}>
        <input type="checkbox" name="genres" value={genre} checked={values.has(genre)} onChange={event => {
          const checked = event.currentTarget.checked;
          setValues(previous => {
            const next = new Set(previous); if (checked) next.add(genre); else next.delete(genre); return next;
          });
        }} />
        <span>{genre}</span>
      </label>)}
    </div>
    {!ARTIST_GENRE_OPTIONS.some(matches) ? <p className="hint">Такого жанра в списке нет.</p> : null}
    <p className="hint">Выбрано: {values.size}. Жанры задаются вручную и не меняются при обновлении Last.fm.</p>
  </fieldset>;
}
