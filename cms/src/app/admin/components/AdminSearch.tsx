'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { matchesAdminSearch, type AdminSearchItem } from '@/lib/admin-navigation';
import { AdminIcon } from './AdminIcon';

export function AdminSearch({ items }: { items: AdminSearchItem[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const results = (
    query.trim()
      ? items.filter((item) => matchesAdminSearch(query, item.title, item.detail, item.keywords))
      : items.filter((item) => item.detail === 'Раздел')
  ).slice(0, 18);
  function open() {
    setQuery('');
    dialog.current?.showModal();
    input.current?.focus();
  }
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        open();
      }
    }
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, []);
  return (
    <>
      <button
        type="button"
        className="admin-search-trigger"
        onClick={open}
        aria-label="Поиск по админке"
      >
        <AdminIcon name="search" size={18} />
        <span>Найти в админке</span>
        <kbd>Ctrl K</kbd>
      </button>
      <dialog
        ref={dialog}
        className="admin-search-dialog"
        aria-labelledby="admin-search-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="admin-search-box">
          <div className="admin-search-heading">
            <h2 id="admin-search-title">Быстрый переход</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Закрыть поиск"
              onClick={() => dialog.current?.close()}
            >
              <AdminIcon name="close" />
            </button>
          </div>
          <label className="admin-search-input">
            <span className="visually-hidden">Раздел, артист или точка питания</span>
            <AdminIcon name="search" />
            <input
              ref={input}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Раздел, артист или точка питания…"
            />
          </label>
          <div className="admin-search-results" aria-label="Результаты поиска">
            {results.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(event) => {
                  if (!event.defaultPrevented) dialog.current?.close();
                }}
              >
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
                <AdminIcon name="arrow" size={18} />
              </Link>
            ))}
            {!results.length && (
              <p className="empty-state" role="status">
                Ничего не найдено. Попробуйте другое название.
              </p>
            )}
          </div>
          <p className="admin-search-footer">Tab — выбрать · Enter — открыть · Esc — закрыть</p>
        </div>
      </dialog>
    </>
  );
}
