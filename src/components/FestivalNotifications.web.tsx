import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {apiFetch} from '../api/apiFetch';
import {readNotificationEntries,type FestivalNotification} from '../../shared/notification-feed';
import {readNotificationInbox,subscribeNotificationInbox} from '../utils/notificationInbox';
import {FestivalIcon} from './FestivalIcon.web';
import {LiquidDialog} from './LiquidDialog';
const CACHE='uletay-news-cache-v1',SEEN='uletay-news-seen-v1';
function cached(){try{return readNotificationEntries(JSON.parse(localStorage.getItem(CACHE)||'[]'));}catch{return [];}}
function seenIds(){try{const value=JSON.parse(localStorage.getItem(SEEN)||'[]');return new Set<string>(Array.isArray(value)?value.filter((id:unknown)=>typeof id==='string').slice(-200):[]);}catch{return new Set<string>();}}
export function FestivalNotifications({focused=true,onNavigate,localNotifications,loadNotifications}:{focused?:boolean;onNavigate:(path:string)=>Promise<void>;localNotifications?:FestivalNotification[];loadNotifications?:()=>Promise<FestivalNotification[]>}){
  const [open,setOpen]=useState(false);const [remote,setRemote]=useState<FestivalNotification[]>(cached);const [local,setLocal]=useState<FestivalNotification[]>([]);const [seen,setSeen]=useState(seenIds);const [loading,setLoading]=useState(true);const [error,setError]=useState(false);const [reload,setReload]=useState(0);
  const externalInbox=localNotifications!==undefined;
  useEffect(()=>{if(externalInbox)return;let active=true;void readNotificationInbox().then(rows=>{if(active)setLocal(rows);});const unsubscribe=subscribeNotificationInbox(setLocal);return()=>{active=false;unsubscribe();};},[externalInbox]);
  useEffect(()=>{
    if(!focused)return;const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;let running=false;
    const refresh=async()=>{if(running||document.hidden||controller.signal.aborted)return;running=true;try{const rows=await (loadNotifications?loadNotifications():(async()=>{const response=await apiFetch('/notifications',{headers:{Accept:'application/json'},signal:controller.signal});if(!response.ok)throw Error('Notifications unavailable');const value=await response.json();if(!Array.isArray(value.items))throw Error('Invalid notifications');return value.items;})());if(controller.signal.aborted)return;const items=readNotificationEntries(rows);setRemote(items);setError(false);try{localStorage.setItem(CACHE,JSON.stringify(items));}catch{}}catch{if(!controller.signal.aborted)setError(true);}finally{running=false;if(!controller.signal.aborted){setLoading(false);timer=setTimeout(()=>void refresh(),5*60*1000);}}};
    void refresh();const wake=()=>{if(!document.hidden&&!running){if(timer)clearTimeout(timer);void refresh();}};window.addEventListener('online',wake);document.addEventListener('visibilitychange',wake);return()=>{controller.abort();if(timer)clearTimeout(timer);window.removeEventListener('online',wake);document.removeEventListener('visibilitychange',wake);};
  },[focused,reload,loadNotifications]);
  const items=useMemo(()=>[...new Map([...remote,...(localNotifications??local)].map(item=>[item.id,item])).values()].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,100),[remote,local,localNotifications]);
  const unread=items.filter(item=>!seen.has(item.id)).length;
  const markRead=useCallback((ids:string[])=>{setSeen(previous=>{const next=new Set([...previous,...ids].slice(-200));try{localStorage.setItem(SEEN,JSON.stringify([...next]));}catch{}return next;});},[]);
  const show=()=>{markRead(items.map(item=>item.id));setOpen(true);};
  return <>
    <button type="button" className="fest-icon fest-notifications-trigger" aria-label="Уведомления" aria-haspopup="dialog" aria-expanded={open} onClick={show}><FestivalIcon name="bell"/>{unread?<span className="fest-notification-badge" aria-hidden="true">{unread>9?'9+':unread}</span>:null}</button>
    <LiquidDialog open={open} onClose={()=>setOpen(false)} title="Уведомления" variant="sheet">
      {error?<div className="fest-notice fest-error" role="status">Не удалось обновить уведомления. <button className="fest-text-button" type="button" onClick={()=>{setLoading(true);setReload(value=>value+1);}}>Повторить</button></div>:null}
      {unread?<button className="fest-text-button" type="button" onClick={()=>markRead(items.map(item=>item.id))}>Отметить всё прочитанным</button>:null}
      {items.length?<div className="fest-notification-list">{items.map(item=><button key={item.id} className="fest-notification-row" type="button" data-unread={!seen.has(item.id)} onClick={()=>{markRead([item.id]);setOpen(false);void onNavigate(item.url);}}><span className="fest-notification-symbol"><FestivalIcon name={item.id.startsWith('fav-')?'calendar':'bell'} size={20}/></span><span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('ru-RU',{timeZone:'Europe/Samara',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</time><strong>{item.title}</strong><span className="fest-notification-body">{item.body}</span></span></button>)}</div>:<div className="fest-empty" role="status"><FestivalIcon name="bell" size={42}/><h3>{loading?'Загружаем уведомления…':'Пока тихо'}</h3>{!loading?<p className="fest-muted">Здесь появятся сообщения организаторов и полученные напоминания об избранных событиях.</p>:null}</div>}
    </LiquidDialog>
  </>;
}
