'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type HeadlinerSearchOption = {
  id: string;
  name: string;
  previewSrc?: string;
};

type Props = {
  name: string;
  headliners: HeadlinerSearchOption[];
  defaultValue?: string;
  required?: boolean;
};

export function HeadlinerSearchSelect({ name, headliners, defaultValue = '', required }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const initial = headliners.find((item) => item.id === defaultValue);
  const [query, setQuery] = useState(initial?.name ?? '');
  const [selectedId, setSelectedId] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  const selected = headliners.find((item) => item.id === selectedId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return headliners;
    return headliners.filter((item) => item.name.toLowerCase().includes(q));
  }, [headliners, query]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(headliner: HeadlinerSearchOption) {
    setSelectedId(headliner.id);
    setQuery(headliner.name);
    setOpen(false);
  }

  const previewSrc = selected?.previewSrc;

  return (
    <div className="headliner-search" ref={wrapperRef}>
      <input type="hidden" name={name} value={selectedId} required={required} />
      <input
        type="search"
        className="headliner-search-input"
        value={query}
        placeholder="Начните вводить имя артиста…"
        autoComplete="off"
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          setOpen(true);
          const exact = headliners.find(
            (item) => item.name.toLowerCase() === value.trim().toLowerCase(),
          );
          setSelectedId(exact?.id ?? '');
        }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 ? (
        <ul className="headliner-search-list" role="listbox">
          {filtered.slice(0, 50).map((headliner) => (
            <li key={headliner.id}>
              <button
                type="button"
                className={selectedId === headliner.id ? 'is-selected' : undefined}
                onClick={() => pick(headliner)}
              >
                {headliner.name}
              </button>
            </li>
          ))}
        </ul>
      ) : open && query.trim() ? (
        <p className="hint headliner-search-empty">Ничего не найдено</p>
      ) : null}
      {previewSrc ? (
        <img className="preview thumb headliner-search-preview" src={previewSrc} alt={selected?.name ?? ''} />
      ) : selected ? (
        <p className="hint headliner-search-empty">У артиста нет фото — добавьте в разделе «Хэдлайнеры»</p>
      ) : null}
    </div>
  );
}
