import React from 'react';
import { Asset } from 'expo-asset';
import { buildYandexMusicArtistSearchUrl, buildYandexMusicSearchUrl } from '../utils/yandexMusic';

const logo = Asset.fromModule(require('../../assets/images/yandex-music-logo.webp')).uri;

export function YandexMusicLink({ artist, track, variant = 'icon', size = 32 }: {
  artist: string; track?: string; variant?: 'icon' | 'listen'; size?: number;
}) {
  const label = track ? `Открыть «${track}» в Яндекс Музыке` : `Слушать ${artist} в Яндекс Музыке`;
  return <a
    className={variant === 'listen' ? 'fest-button fest-yandex-listen' : 'fest-icon fest-yandex-icon'}
    href={track ? buildYandexMusicSearchUrl(artist, track) : buildYandexMusicArtistSearchUrl(artist)}
    aria-label={label} title={label} target="_blank" rel="noopener noreferrer"
  >
    <img src={logo} alt="" width={Math.min(size, 28)} height={Math.min(size, 28)} decoding="async" />
    {variant === 'listen' ? <span>Слушать в Яндекс Музыке</span> : null}
  </a>;
}
