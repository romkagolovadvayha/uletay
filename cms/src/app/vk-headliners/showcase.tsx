'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { selectVkHeadliners } from '../../../../shared/vk-headliners';
import { VK_HEADLINERS_APP_ID } from '../../../../shared/vk-community-widget';
import { WidgetSetup } from './widget-setup';

type Card = ReturnType<typeof selectVkHeadliners>[number];
type Props = {
  cards: Card[];
  year: number;
  startDate: string;
  endDate: string;
  dates: string;
  allUrl: string;
  release: string;
};

function Arrow() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ArtistCard({ card }: { card: Card }) {
  const [failed, setFailed] = useState(false);
  return <article className="vh-card" id={`artist-${card.id}`} data-artist-id={card.id}>
    <a className="vh-photo" href={card.detailUrl} target="_blank" rel="noopener noreferrer" aria-label={`Об артисте: ${card.name}`}>
      {card.imageUrl && !failed
        ? <Image src={card.imageUrl} alt={card.name} width={640} height={480} unoptimized onError={() => setFailed(true)} />
        : <span className="vh-photo-placeholder" aria-hidden="true">УЛЕТАЙ<span>{card.name}</span></span>}
      <span className="vh-photo-arrow"><Arrow /></span>
    </a>
    <div className="vh-card-content">
      <a className="vh-artist" href={card.detailUrl} target="_blank" rel="noopener noreferrer"><h2>{card.name}</h2></a>
      <p className="vh-genre">{card.subtitle}</p>
      <a className="vh-listen" href={card.musicUrl} target="_blank" rel="noopener noreferrer" aria-label={`${card.musicLabel}: ${card.name}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.8c0-.8.9-1.3 1.6-.9l11 6.3c.7.4.7 1.4 0 1.8l-11 6.4c-.7.4-1.6-.1-1.6-.9V4.8Z" transform="translate(0 1)" /></svg>
        {card.musicLabel}
        <svg className="vh-external" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 12 12 4M4 4h8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </a>
    </div>
  </article>;
}

export function HeadlinersShowcase(props: Props) {
  useEffect(() => {
    if (Number(new URLSearchParams(window.location.search).get('vk_app_id')) !== VK_HEADLINERS_APP_ID) return;
    let disposed = false;
    let cleanup = () => {};
    void import('@vkontakte/vk-bridge').then(async ({ default: bridge }) => {
      if (disposed) return;
      await bridge.send('VKWebAppInit').catch(() => undefined);
      if (disposed) return;
      const applyTheme = (appearance: unknown) => {
        if (appearance === 'light' || appearance === 'dark') document.documentElement.dataset.vkTheme = appearance;
      };
      const onEvent: Parameters<typeof bridge.subscribe>[0] = ({ detail }) => {
        if (detail.type === 'VKWebAppUpdateConfig') applyTheme(detail.data.appearance);
      };
      bridge.subscribe(onEvent);
      void bridge.send('VKWebAppGetConfig').then((data) => { if (!disposed) applyTheme(data.appearance); }).catch(() => undefined);
      let previousSize = '';
      let timer: ReturnType<typeof setTimeout>;
      const observer = new ResizeObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          const width = document.documentElement.clientWidth;
          const height = Math.ceil(document.body.getBoundingClientRect().height);
          const size = `${width}:${height}`;
          if (!disposed && size !== previousSize && bridge.supports('VKWebAppResizeWindow')) {
            previousSize = size;
            void bridge.send('VKWebAppResizeWindow', { width, height }).catch(() => undefined);
          }
        }, 120);
      });
      observer.observe(document.body);
      cleanup = () => { observer.disconnect(); clearTimeout(timer); bridge.unsubscribe(onEvent); };
    }).catch(() => undefined);
    return () => { disposed = true; cleanup(); };
  }, []);

  useEffect(() => {
    const followArtist = () => {
      const artist = new URLSearchParams(window.location.hash.slice(1)).get('artist');
      if (artist) document.getElementById(`artist-${artist}`)?.scrollIntoView({ block: 'center' });
    };
    followArtist();
    window.addEventListener('hashchange', followArtist);
    return () => window.removeEventListener('hashchange', followArtist);
  }, []);

  return <main className="vh-page" aria-label="Участники фестиваля УЛЕТАЙ" data-vk-headliners="true" data-vk-app-id={VK_HEADLINERS_APP_ID} data-release={props.release}>
    <WidgetSetup cards={props.cards} dates={props.dates} year={props.year} startDate={props.startDate} endDate={props.endDate} />
    {props.cards.length ? <section className="vh-grid" aria-label="Участники фестиваля">
      {props.cards.map((card) => <ArtistCard key={card.id} card={card} />)}
    </section> : <section className="vh-empty">
      <h2>Скоро объявим участников</h2>
      <p>Готовимся к встрече на поле. Первые имена появятся здесь после анонса.</p>
    </section>}
    <nav className="vh-actions" aria-label="Фестиваль">
      <a className="vh-button vh-button-secondary" href={props.allUrl} target="_blank" rel="noopener noreferrer">Все участники <Arrow /></a>
    </nav>
  </main>;
}
