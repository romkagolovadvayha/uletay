export type FestivalNotification={id:string;title:string;body:string;url:string;createdAt:string};
export function safeNotificationPath(value:unknown):string{
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u0020]/.test(value))return '/';
  try{const url=new URL(value,'https://uletayapp.ru');const pathname=decodeURIComponent(url.pathname);if(/[\\\u0000-\u0020]/.test(pathname))return '/';return /^\/(?:$|map(?:\/[^/]+)?$|schedule(?:\/(?:live|full)(?:\/[^/]+)?)?$|autographs(?:\/[^/]+)?$|favorites$|headliners(?:\/[^/]+)?$|foodcourt(?:\/[^/]+)?$|chat$|rules$|settings$)/.test(pathname)?`${url.pathname}${url.search}${url.hash}`:'/';}catch{return '/';}
}
export function readNotificationEntries(value:unknown):FestivalNotification[]{
  if(!Array.isArray(value))return [];
  return value.slice(0,100).filter((row):row is FestivalNotification=>!!row&&typeof row==='object'&&typeof row.id==='string'&&row.id.length<200&&typeof row.title==='string'&&typeof row.body==='string'&&typeof row.createdAt==='string'&&Number.isFinite(Date.parse(row.createdAt))).map(row=>({id:row.id,title:row.title.slice(0,160),body:row.body.slice(0,2000),url:safeNotificationPath(row.url),createdAt:row.createdAt}));
}
