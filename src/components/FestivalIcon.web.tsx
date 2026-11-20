import React from 'react';

const paths: Record<string, React.ReactNode> = {
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  heart: <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z"/>,
  filter: <><path d="M5 3v6m0 4v8M12 3v10m0 4v4M19 3v2m0 4v12"/><path d="M2 9h6v4H2zM9 13h6v4H9zM16 5h6v4h-6z"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18M7 15h2m3 0h2m3 0h1M7 18h2"/></>,
  map: <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5ZM9 3v16m6-14v16"/></>,
  music: <><path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  chat: <path d="M21 11.5a9 9 0 0 1-9 9 10 10 0 0 1-4-.8L3 21l1.3-5A9 9 0 1 1 21 11.5Z"/>,
  back: <path d="m14 5-7 7 7 7M7 12h14"/>,
  external: <><path d="M14 3h7v7M21 3 10 14M10 3H4v17h17v-6"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></>,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>,
  send: <path d="m22 2-7 20-4-9-9-4L22 2ZM11 13 22 2"/>,
  reply: <path d="m9 5-6 6 6 6M3 11h11a7 7 0 0 1 7 7"/>,
  flag: <><path d="M5 21V3m0 1c5-4 9 4 14 0v11c-5 4-9-4-14 0"/></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  spark: <path d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7L12 2Z"/>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="m9 3 6 0 1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z"/></>,
  play: <path d="m9 5 12 7-12 7V5Z"/>,
  share: <><circle cx="18" cy="4" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="20" r="3"/><path d="m8.5 10.5 7-5m-7 8 7 5"/></>,
};
export function FestivalIcon({name, size=24, filled=false}: {name:string; size?:number; filled?:boolean}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={filled?'currentColor':'none'} stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.music}</svg>;
}
