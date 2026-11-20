import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { apiFetch } from '../api/apiFetch';
import { API_BASE_URL } from '../config/api';
import { FestivalIcon } from '../components/FestivalIcon.web';
import { LiquidDialog } from '../components/LiquidDialog';
import { DeferredIonicons } from '../components/DeferredIonicons';

import {CHAT_BLOCKED_KEY,readBlockedUsers,visibleChatMessages} from '../../shared/chat-safety';
type Message={example?:boolean;id:number;userId:number;name:string;avatar:string|null;text:string;deleted:boolean;createdAt:string;reply:{id:number;userId?:number;name:string;text:string}|null};
type Session={user:{id:number;name:string;avatar:string|null}|null;csrf:string;bearer:string|null;loginAvailable:boolean};
const DRAFT_KEY='uletay_chat_draft_v1';
function readDraft(){try{return localStorage.getItem(DRAFT_KEY)||'';}catch{return '';}}
function chatDateLabel(value:string){
  const date=new Date(value);const today=new Date();const yesterday=new Date(today);yesterday.setDate(today.getDate()-1);
  if(date.toDateString()===today.toDateString())return 'Сегодня';
  if(date.toDateString()===yesterday.toDateString())return 'Вчера';
  return date.toLocaleDateString('ru-RU',{day:'numeric',month:'long',...(date.getFullYear()!==today.getFullYear()?{year:'numeric'}:{})});
}
function Avatar({name,src}:{name:string;src:string|null}){
  const [failed,setFailed]=useState(false);
  const sprite=src?.match(/^(\/chat-preview\/avatars-v1\.webp)#avatar=(\d+)$/);
  const index=sprite?Number(sprite[2]):-1;
  if(sprite&&index>=0&&index<25&&!failed)return <span className="fest-avatar fest-avatar-sprite" aria-hidden="true"><img src={sprite[1]} alt="" loading="lazy" decoding="async" onError={()=>setFailed(true)} style={{left:`${-(index%5)*100}%`,top:`${-Math.floor(index/5)*100}%`}}/></span>;
  return src&&!failed?<img className="fest-avatar" src={src} alt="" referrerPolicy="no-referrer" loading="lazy" onError={()=>setFailed(true)}/>:<span className="fest-avatar" aria-hidden="true">{name.slice(0,1).toLocaleUpperCase('ru')}</span>;
}
async function result<T>(response:Response):Promise<T>{const payload=await response.json().catch(()=>({error:'Сервис временно недоступен'}));if(!response.ok)throw Object.assign(new Error(payload.error||'Не удалось выполнить запрос'),{status:response.status});return payload as T;}
function mergeMessages(current:Message[],incoming:Message[],removed:number[]=[]){const rows=new Map(current.map(row=>[row.id,row]));for(const row of incoming)rows.set(row.id,row);return [...rows.values()].sort((a,b)=>a.id-b.id).map(row=>({...row,...(removed.includes(row.id)?{deleted:true,text:''}:{}),reply:row.reply&&removed.includes(row.reply.id)?{...row.reply,text:'Сообщение удалено'}:row.reply}));}

export function ChatScreen() {
  const focused=useIsFocused();const [session,setSession]=useState<Session|null>(null);const sessionRef=useRef<Session|null>(null);
  const streamLive=useRef(false);
  const [messages,setMessages]=useState<Message[]>([]);const messagesRef=useRef<Message[]>([]);
  const [draft,setDraft]=useState(readDraft);const [reply,setReply]=useState<Message|null>(null);const [sending,setSending]=useState(false);const sendingRef=useRef(false);
  const [loading,setLoading]=useState(true);const [loadingOlder,setLoadingOlder]=useState(false);const [hasMore,setHasMore]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [newCount,setNewCount]=useState(0);const [deleteTarget,setDeleteTarget]=useState<number|null>(null);
  const [accountOpen,setAccountOpen]=useState(false);const [loginOpen,setLoginOpen]=useState(false);const feed=useRef<HTMLDivElement>(null);const input=useRef<HTMLTextAreaElement>(null);
  const [selectedMessageId,setSelectedMessageId]=useState<number|null>(null);
  const [blocked,setBlocked]=useState<number[]>(()=>typeof window==='undefined'?[]:readBlockedUsers(localStorage.getItem(CHAT_BLOCKED_KEY)));
  const visible=useMemo(()=>visibleChatMessages(messages,blocked),[messages,blocked]);
  const blockSelected=()=>{if(!selectedMessage)return;const ids=[...new Set([...blocked,selectedMessage.userId])];setBlocked(ids);try{localStorage.setItem(CHAT_BLOCKED_KEY,JSON.stringify(ids));}catch{}setSelectedMessageId(null);setReply(null);setNotice('Участник заблокирован. Его сообщения скрыты.');};
  const selectedMessage=messages.find(message=>message.id===selectedMessageId&&!message.deleted)||null;
  const scrollIntent=useRef<{type:'bottom'}|{type:'preserve';height:number;top:number}|null>(null);const nearBottom=useRef(true);const requestRef=useRef<{text:string;replyTo:number|null;id:string}|null>(null);const alive=useRef(true);
  const headers=useCallback(()=>({'Content-Type':'application/json',Accept:'application/json',...(sessionRef.current?{'X-Chat-CSRF':sessionRef.current.csrf,...(sessionRef.current.bearer?{Authorization:`Bearer ${sessionRef.current.bearer}`}:{})}:{})}),[]);
  useEffect(()=>{sessionRef.current=session;},[session]);
  useEffect(()=>{messagesRef.current=messages;},[messages]);
  useEffect(()=>{const timer=setTimeout(()=>{try{localStorage.setItem(DRAFT_KEY,draft);}catch{}},200);return()=>clearTimeout(timer);},[draft]);
  useLayoutEffect(()=>{const intent=scrollIntent.current;const node=feed.current;if(!intent||!node)return;if(intent.type==='bottom'){node.scrollTop=node.scrollHeight;nearBottom.current=true;setNewCount(0);}else node.scrollTop=intent.top+node.scrollHeight-intent.height;scrollIntent.current=null;},[messages]);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(timer);},[notice]);
  useEffect(()=>{
    if(!focused||typeof EventSource==='undefined')return;
    let stream:EventSource|null=null;let retry:ReturnType<typeof setTimeout>|null=null;let disposed=false;
    const close=()=>{stream?.close();stream=null;streamLive.current=false;};
    const connect=()=>{if(disposed||document.hidden||stream)return;stream=new EventSource(`${API_BASE_URL}/chat/events`);
      stream.onopen=()=>{streamLive.current=true;};
      stream.addEventListener('chat',event=>{try{const value=JSON.parse((event as MessageEvent).data);if(value.type==='removed'&&Number.isSafeInteger(value.id)){setMessages(current=>mergeMessages(current,[],[value.id]));return;}const message=value.message as Message;if(value.type!=='message'||!Number.isSafeInteger(message?.id)||typeof message.text!=='string')return;const exists=messagesRef.current.some(row=>row.id===message.id);if(nearBottom.current)scrollIntent.current={type:'bottom'};else if(!exists)setNewCount(count=>count+1);setMessages(current=>mergeMessages(current,[message]));}catch{/* Polling will recover malformed or interrupted events. */}});
      stream.onerror=()=>{close();if(!disposed)retry=setTimeout(connect,30000);};
    };
    const visibility=()=>{if(document.hidden)close();else connect();};
    connect();document.addEventListener('visibilitychange',visibility);window.addEventListener('online',connect);
    return()=>{disposed=true;if(retry)clearTimeout(retry);close();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',connect);};
  },[focused]);

  const refreshSession=useCallback(async(signal?:AbortSignal)=>{
    const data=await result<Session>(await apiFetch('/chat/session',{headers:{Accept:'application/json'},credentials:'include',signal}));if(alive.current){sessionRef.current=data;setSession(data);if(data.user)setLoginOpen(false);}return data;
  },[]);
  useEffect(()=>{
    if(!focused)return;const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;let running=false;
    const poll=async(initial=false)=>{
      if(running||controller.signal.aborted)return;
      if(document.hidden){timer=setTimeout(()=>void poll(),4000);return;}
      running=true;let nextPoll=streamLive.current?20000:4000;
      try{
        if(initial)await refreshSession(controller.signal).catch(error=>{if(!controller.signal.aborted)setError(error.message);});
        const latest=messagesRef.current.at(-1)?.id;const path=latest?`/chat/messages?after=${latest}`:'/chat/messages';
        const data=await result<{messages:Message[];hasMore:boolean;removed?:number[]}>(await apiFetch(path,{headers:{Accept:'application/json'},signal:controller.signal}));
        if(controller.signal.aborted)return;
        if(latest&&data.hasMore)nextPoll=100;
        if(!latest)setHasMore(data.hasMore);
        if(data.messages.length||data.removed?.length){
          if(nearBottom.current||!latest)scrollIntent.current={type:'bottom'};else setNewCount(count=>count+data.messages.filter(row=>row.id>(latest||0)).length);
          setMessages(current=>mergeMessages(current,data.messages,data.removed));
        }
        if(!initial)setError('');setLoading(false);
      }catch(error){if(!controller.signal.aborted){setError((error as Error).message);setLoading(false);}}
      finally{running=false;if(!controller.signal.aborted)timer=setTimeout(()=>void poll(),nextPoll);}
    };
    void poll(true);
    const wake=()=>{if(!document.hidden&&!running){if(timer)clearTimeout(timer);void poll();}};
    document.addEventListener('visibilitychange',wake);window.addEventListener('online',wake);
    return()=>{controller.abort();if(timer)clearTimeout(timer);document.removeEventListener('visibilitychange',wake);window.removeEventListener('online',wake);};
  },[focused,refreshSession]);

  const older=async()=>{
    if(loadingOlder||!messages.length)return;setLoadingOlder(true);
    try{const data=await result<{messages:Message[];hasMore:boolean}>(await apiFetch(`/chat/messages?before=${messages[0].id}`,{headers:{Accept:'application/json'}}));if(feed.current)scrollIntent.current={type:'preserve',height:feed.current.scrollHeight,top:feed.current.scrollTop};setMessages(current=>mergeMessages(current,data.messages));setHasMore(data.hasMore);}catch(error){setError((error as Error).message);}finally{setLoadingOlder(false);}
  };
  const requestLogin=()=>{
    // Blur before opening so dismissing the dialog cannot restore focus to the
    // guest input and immediately open it again (or raise the mobile keyboard).
    input.current?.blur();
    setSelectedMessageId(null);setDeleteTarget(null);
    setLoginOpen(true);
  };
  const closeMessageSheet=()=>{setSelectedMessageId(null);setLoginOpen(false);setDeleteTarget(null);};
  const replyToSelected=()=>{
    if(!selectedMessage)return;
    if(!sessionRef.current?.user){requestLogin();return;}
    setReply(selectedMessage);
    const panel=document.getElementById('chat-message-sheet');
    // Wait for the native modal to release inert content before focusing input.
    if(panel instanceof HTMLDialogElement&&panel.open)panel.addEventListener('close',()=>{if(sessionRef.current?.user)input.current?.focus({preventScroll:true});},{once:true});
    closeMessageSheet();
  };
  const send=async(event?:React.FormEvent)=>{
    event?.preventDefault();
    if(!sessionRef.current?.user){requestLogin();return;}
    const text=draft.trim();if(sendingRef.current||!text)return;
    if([...text].length>2000){setError('Сообщение должно содержать не больше 2000 символов');return;}
    sendingRef.current=true;setSending(true);setError('');const replyTo=reply?.id||null;
    if(!requestRef.current||requestRef.current.text!==text||requestRef.current.replyTo!==replyTo)requestRef.current={text,replyTo,id:crypto.randomUUID()};
    try{
      const data=await result<{message:Message}>(await apiFetch('/chat/messages',{method:'POST',headers:headers(),credentials:'include',body:JSON.stringify({text,replyTo,requestId:requestRef.current.id}),replaySafe:true}));
      scrollIntent.current={type:'bottom'};setMessages(current=>mergeMessages(current,[data.message]));setDraft(current=>current.trim()===text?'':current);setReply(current=>current?.id===replyTo?null:current);requestRef.current=null;setNotice('Сообщение отправлено');input.current?.focus({preventScroll:true});
    }catch(error){if((error as {status?:number}).status===401){sessionRef.current=null;setSession(null);setError('');requestLogin();void refreshSession().catch(()=>{});}else setError((error as Error).message);}
    finally{sendingRef.current=false;setSending(false);}
  };
  const remove=async()=>{if(!deleteTarget)return;const id=deleteTarget;try{await result(await apiFetch(`/chat/messages/${id}`,{method:'DELETE',headers:headers(),credentials:'include'}));setMessages(current=>mergeMessages(current,[],[id]));setDeleteTarget(null);}catch(error){setError((error as Error).message);}};
  const report=async(id:number)=>{try{await result(await apiFetch('/chat/report',{method:'POST',headers:headers(),credentials:'include',body:JSON.stringify({messageId:id})}));setNotice('Жалоба отправлена модератору');}catch(error){setError((error as Error).message);}};
  const logout=async()=>{try{await result(await apiFetch('/chat/session',{method:'DELETE',headers:headers(),credentials:'include'}));setSession(null);sessionRef.current=null;setAccountOpen(false);setDraft('');setReply(null);try{localStorage.removeItem(DRAFT_KEY);}catch{}await refreshSession();}catch(error){setError((error as Error).message);}};
  const jumpBottom=()=>{if(feed.current){feed.current.scrollTo({top:feed.current.scrollHeight,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});setNewCount(0);nearBottom.current=true;}};
  const authError=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('auth'):null;
  return <section className="fest-chat" aria-label="Общий чат фестиваля">
    <header className="fest-chat-header"><FestivalIcon name="chat" size={26}/><div style={{flex:1}}><h1>Общий чат</h1></div><button type="button" className="fest-icon" aria-label="Аккаунт и настройки чата" aria-haspopup="dialog" onClick={()=>sessionRef.current?.user?setAccountOpen(true):requestLogin()}><FestivalIcon name="settings"/></button></header>
    <div ref={feed} className="fest-chat-feed" role="log" aria-label="Сообщения общего чата" aria-live="polite" aria-relevant="additions" onScroll={()=>{const node=feed.current;if(node)nearBottom.current=node.scrollHeight-node.scrollTop-node.clientHeight<100;}}>
      {hasMore?<button type="button" className="fest-pill fest-chat-load" disabled={loadingOlder} onClick={()=>void older()}>{loadingOlder?'Загружаем…':'Предыдущие сообщения'}</button>:null}
      {loading?<p role="status" className="fest-muted">Загружаем сообщения…</p>:messages.length===0?<div className="fest-empty"><FestivalIcon name="chat" size={48}/><h2 className="fest-display" style={{fontSize:40}}>Здесь собираются свои</h2><p className="fest-muted">Поздоровайся, найди компанию или спроси о фестивале.</p></div>:visible.map((message,index)=><React.Fragment key={message.id}>
        {index===0||new Date(visible[index-1].createdAt).toDateString()!==new Date(message.createdAt).toDateString()?<div className="fest-chat-date" role="separator" aria-label={chatDateLabel(message.createdAt)}><span>{chatDateLabel(message.createdAt)}</span></div>:null}
        <article id={`chat-message-${message.id}`} className="fest-message" data-own={message.userId===session?.user?.id}>
          <Avatar name={message.name} src={message.avatar}/>
          <div
            className="fest-message-main" role={message.deleted?undefined:'button'} tabIndex={message.deleted?undefined:0}
            aria-label={message.deleted?undefined:`Действия с сообщением от ${message.name}`}
            aria-describedby={message.deleted?undefined:`chat-message-text-${message.id}`}
            aria-haspopup={message.deleted?undefined:'dialog'} aria-expanded={message.deleted?undefined:selectedMessageId===message.id}
            onClick={event=>{const selection=window.getSelection();if(message.deleted||(selection?.toString()&&event.currentTarget.contains(selection.anchorNode)))return;setSelectedMessageId(message.id);}}
            onKeyDown={event=>{if(!message.deleted&&(event.key==='Enter'||event.key===' ')){event.preventDefault();setSelectedMessageId(message.id);}}}
          >
            <div className="fest-message-meta"><strong>{message.name}</strong><time dateTime={message.createdAt} title={new Date(message.createdAt).toLocaleString('ru-RU')}>{new Date(message.createdAt).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</time></div>
            {message.reply?<div className="fest-reply"><strong>{message.reply.name}</strong>{message.reply.text}</div>:null}
            <p id={`chat-message-text-${message.id}`} className={message.deleted?'fest-muted':undefined}>{message.deleted?'Сообщение удалено':message.text}</p>
          </div>
        </article>
      </React.Fragment>)}
      {newCount>0?<button type="button" className="fest-pill fest-chat-new" onClick={jumpBottom}>Новых сообщений: {newCount}</button>:null}
    </div>
    <div className="fest-chat-compose">
      {error?<div className="fest-notice fest-error" role="alert" style={{margin:'0 0 10px'}}>{error} <button className="fest-text-button" type="button" onClick={()=>void refreshSession().then(()=>setError('')).catch(e=>setError(e.message))}>Повторить</button></div>:null}
      {authError?<p className="fest-notice fest-error" role="status">{authError==='unavailable'?'Вход через VK временно недоступен. Попробуйте позже.':'Вход не завершён. Попробуйте войти через VK ещё раз.'}</p>:null}
      {notice?<p className="fest-live-note" role="status">{notice}</p>:null}
      {session?.user?<div className="fest-live-note" style={{marginBottom:8}}>Вы пишете как {session.user.name}</div>:null}
      {reply?<div className="fest-reply"><div><strong>Ответ: {reply.name}</strong>{reply.text.slice(0,160)}</div><button type="button" className="fest-icon" aria-label="Отменить ответ" onClick={()=>setReply(null)}><FestivalIcon name="close" size={18}/></button></div>:null}
      <form onSubmit={event=>void send(event)}>
        <textarea
          ref={input} value={draft} onChange={event=>setDraft(event.target.value)}
          aria-label="Сообщение в общий чат" placeholder="Напиши своим…" maxLength={4000} rows={1}
          readOnly={!session?.user} aria-haspopup={!session?.user?'dialog':undefined}
          onPointerDown={event=>{if(!sessionRef.current?.user){event.preventDefault();requestLogin();}}}
          onFocus={()=>{if(!sessionRef.current?.user)requestLogin();}}
          onKeyDown={event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();void send();}}}
        />
        <button type="submit" className="fest-button" data-primary="true" disabled={sending||!!session?.user&&!draft.trim()} aria-label={sending?'Отправляем сообщение':'Отправить сообщение'}><FestivalIcon name="send" size={22}/></button>
      </form>
    </div>
    <LiquidDialog open={accountOpen} onClose={()=>setAccountOpen(false)} title="Мой аккаунт" variant="sheet" description={session?.user?.name} actions={[{label:'Выйти из VK-сессии',onPress:()=>void logout()}]}><p className="fest-muted">Здесь можно общаться, отвечать участникам и сообщать модератору о нарушениях.</p><a className="fest-button" href="/api/chat/account">Удалить профиль и данные</a>{blocked.length?<button className="fest-button" onClick={()=>{setBlocked([]);try{localStorage.removeItem(CHAT_BLOCKED_KEY);}catch{}}}>Разблокировать участников ({blocked.length})</button>:null}</LiquidDialog>
    <LiquidDialog
      id="chat-message-sheet" open={loginOpen||deleteTarget!==null||!!selectedMessage} onClose={closeMessageSheet} variant="sheet"
      title={loginOpen?'Войди, чтобы общаться':deleteTarget!==null?'Удалить сообщение?':'Сообщение'}
      description={loginOpen?'Продолжая вход через VK, вы принимаете правила общения: без оскорблений, травли, незаконного контента и спама. Жалоба и блокировка доступны в меню сообщения.':deleteTarget!==null?'Вместо текста останется отметка об удалении.':undefined}
      actions={deleteTarget!==null?[{label:'Отмена',onPress:closeMessageSheet},{label:'Удалить',tone:'destructive',onPress:()=>void remove()}]:undefined}
    >
      {loginOpen?<a className="fest-button fest-vk-login" href={`${API_BASE_URL}/chat/auth/vk`} onClick={()=>{try{localStorage.setItem(DRAFT_KEY,draft);}catch{}}}><span aria-hidden="true"><DeferredIonicons name="logo-vk" size={28} color="#fff"/></span>Войти через VK</a>:deleteTarget===null&&selectedMessage?<>
        <div className="fest-chat-action-preview"><strong>{selectedMessage.name}</strong><p>{selectedMessage.text}</p></div>
        <div className="fest-chat-actions">
          <button type="button" className="fest-chat-action" onClick={replyToSelected}><FestivalIcon name="reply" size={22}/><span>Ответить</span></button>
          {selectedMessage.userId===session?.user?.id?<button type="button" className="fest-chat-action" data-destructive="true" onClick={()=>{setDeleteTarget(selectedMessage.id);setSelectedMessageId(null);}}><FestivalIcon name="trash" size={22}/><span>Удалить</span></button>:<button type="button" className="fest-chat-action" onClick={()=>{if(!sessionRef.current?.user){requestLogin();return;}const id=selectedMessage.id;closeMessageSheet();void report(id);}}><FestivalIcon name="flag" size={22}/><span>Пожаловаться</span></button>}
          {selectedMessage.userId!==session?.user?.id?<button type="button" className="fest-chat-action" onClick={blockSelected}><FestivalIcon name="close" size={22}/><span>Заблокировать участника</span></button>:null}
        </div>
      </>:null}
    </LiquidDialog>
  </section>;
}
