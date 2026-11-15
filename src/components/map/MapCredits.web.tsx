import React from 'react';
import { mapControlLayout } from '../../theme/map';

const credits = [
  ['OpenFreeMap', 'https://openfreemap.org/'],
  ['© OpenMapTiles', 'https://openmaptiles.org/'],
  ['© OpenStreetMap', 'https://www.openstreetmap.org/copyright'],
] as const;

export function MapCredits() {
  return <>
    <div className="festival-map-credits" aria-label="Источники данных карты">
      {credits.map(([label, href]) => <a key={href} href={href} target="_blank" rel="noopener noreferrer">{label}</a>)}
    </div>
    <style>{`
      .festival-map-credits{position:absolute;left:50%;bottom:${mapControlLayout.attributionBottom}px;transform:translateX(-50%);max-width:calc(100% - 24px);display:flex;gap:5px;align-items:center;font:10px/${mapControlLayout.attributionHeight}px system-ui,sans-serif;color:#D4D4D8;opacity:.7;text-shadow:0 1px 2px #000;z-index:1}
      .festival-map-credits a{color:inherit;text-decoration:underline;text-underline-offset:2px;white-space:nowrap}
      .festival-map-credits:focus-within{opacity:1}
      .festival-map-credits a:active{color:#FFF}
      @media(hover:hover){.festival-map-credits:hover{opacity:1}}
    `}</style>
  </>;
}
