import React,{useCallback,useDeferredValue,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {useIsFocused} from '@react-navigation/native';
import {apiFetch} from '../api/apiFetch';
import {API_BASE_URL} from '../config/api';
import {FestivalIcon} from '../components/FestivalIcon.web';
import {FestivalSearch} from '../components/FestivalControls.web';
import {LiquidDialog} from '../components/LiquidDialog';
import {DeferredIonicons} from '../components/DeferredIonicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {MoreStackParamList} from '../navigation/types';
import {useAppData} from '../context/DataContext';
import {sortWishArtists,normalizeWishArtistName,type WishFeed,type WishVoteResult} from '../../shared/artist-wishes';
type Session={user:{id:number;name:string}|null;csrf:string;bearer:string|null;loginAvailable:boolean};
function wishError(error:unknown){return error instanceof TypeError||error instanceof DOMException?'Не удалось связаться с сервером. Проверь интернет и попробуй ещё раз.':error instanceof Error?error.message:'Не удалось выполнить запрос. Попробуй ещё раз.';}
async function read<T>(response:Response):Promise<T>{const data=await response.json().catch(()=>({error:'Не удалось загрузить голосование'}));if(!response.ok)throw Object.assign(new Error(data.error||'Не удалось выполнить запрос'),{status:response.status});return data as T;}
function WishImage({url}:{url:string}){const [failed,setFailed]=useState(false);return url&&!failed?<img src={url} alt="" loading="lazy" decoding="async" onError={()=>setFailed(true)}/>:<span className="fest-wish-placeholder"><FestivalIcon name="music" size={28}/></span>;}
export function ArtistWishesScreen({navigation}:NativeStackScreenProps<MoreStackParamList,'ArtistWishes'>){
  const {data}=useAppData();
  const availableArtistIds=useMemo(()=>new Set(data.headliners.map(artist=>artist.id)),[data.headliners]);
  const focused=useIsFocused();const [feed,setFeed]=useState<WishFeed|null>(null);const [session,setSession]=useState<Session|null>(null);const sessionRef=useRef<Session|null>(null);
  const [mine,setMine]=useState<Set<string>>(new Set());const [pending,setPending]=useState<Set<string>>(new Set());const pendingRef=useRef(new Set<string>());
  const [query,setQuery]=useState('');const deferred=useDeferredValue(query);const [search,setSearch]=useState(false);const searchButton=useRef<HTMLButtonElement>(null);
  const [limit,setLimit]=useState(60);const accountReadAt=useRef(0);
  const voteVersion=useRef(0);
  const layoutContext=useRef('');
  const [onlyMine,setOnlyMine]=useState(false);const [login,setLogin]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [burst,setBurst]=useState<string|null>(null);
  const alive=useRef(true);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);const list=useRef<HTMLOListElement>(null);const positions=useRef(new Map<string,number>());const flights=useRef<Animation[]>([]);
  const headers=useCallback(()=>({Accept:'application/json','Content-Type':'application/json',...(sessionRef.current?{'X-Chat-CSRF':sessionRef.current.csrf,...(sessionRef.current.bearer?{Authorization:`Bearer ${sessionRef.current.bearer}`}:{})}:{})}),[]);
  const load=useCallback(async(signal?:AbortSignal)=>{
    const version=voteVersion.current;
    const [data,account]=await Promise.all([read<WishFeed>(await apiFetch('/wishes',{signal})),sessionRef.current&&Date.now()-accountReadAt.current<20*60*1000?Promise.resolve(sessionRef.current):read<Session>(await apiFetch('/chat/session',{credentials:'include',signal})).then(value=>{accountReadAt.current=Date.now();return value;})]);
    if(signal?.aborted||!alive.current)return;sessionRef.current=account;setSession(account);
    const votes=account.user?await read<{artistIds:string[]}>(await apiFetch('/wishes/mine',{credentials:'include',headers:headers(),signal})):null;
    if(signal?.aborted||!alive.current)return;
    // Never overwrite a pending user's vote with an older polling response.
    if(!pendingRef.current.size&&version===voteVersion.current){setFeed(data);setMine(new Set(votes?.artistIds||[]));setError('');}
  },[headers]);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;if(timer.current)clearTimeout(timer.current);flights.current.forEach(animation=>animation.cancel());};},[]);
  useEffect(()=>{if(!notice)return;const timeout=setTimeout(()=>setNotice(''),2400);return()=>clearTimeout(timeout);},[notice]);
  useEffect(()=>{if(!focused)return;const controller=new AbortController();let polling=false;const refresh=async()=>{if(polling||document.hidden||pendingRef.current.size)return;polling=true;try{await load(controller.signal);}catch(e){if(!controller.signal.aborted)setError(wishError(e));}finally{polling=false;}};void refresh();const interval=setInterval(()=>void refresh(),30000);const wake=()=>{if(!document.hidden)void refresh();};window.addEventListener('online',wake);document.addEventListener('visibilitychange',wake);return()=>{controller.abort();clearInterval(interval);window.removeEventListener('online',wake);document.removeEventListener('visibilitychange',wake);};},[focused,load]);
  const artists=useMemo(()=>{const needle=normalizeWishArtistName(deferred);return sortWishArtists(feed?.artists||[]).filter(artist=>(!onlyMine||mine.has(artist.id))&&[artist.name,...(artist.aliases||[])].some(name=>normalizeWishArtistName(name).includes(needle)));},[feed,onlyMine,mine,deferred]);
  useLayoutEffect(()=>{const rows=Array.from(list.current?.querySelectorAll<HTMLElement>('[data-wish-id]')||[]);const next=new Map<string,number>();const context=deferred+'|'+onlyMine+'|'+limit;const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches||layoutContext.current!==context;layoutContext.current=context;flights.current.forEach(animation=>animation.cancel());flights.current=[];for(const row of rows){const id=row.dataset.wishId!;const top=row.offsetTop;next.set(id,top);const previous=positions.current.get(id);if(!reduce&&previous!==undefined&&Math.abs(previous-top)>1)flights.current.push(row.animate([{transform:`translateY(${previous-top}px)`},{transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.22,1,.36,1)'}));}positions.current=next;},[artists,limit,deferred,onlyMine]);
  const vote=async(id:string)=>{
    if(!sessionRef.current?.user){setLogin(true);return;}if(pendingRef.current.has(id))return;
    const voted=!mine.has(id);voteVersion.current++;pendingRef.current.add(id);setPending(new Set(pendingRef.current));setError('');
    try{const value=await read<WishVoteResult>(await apiFetch('/wishes/vote',{method:'POST',credentials:'include',headers:headers(),body:JSON.stringify({artistId:id,voted}),replaySafe:true}));if(!alive.current)return;
      setMine(current=>{const next=new Set(current);if(value.voted)next.add(id);else next.delete(id);return next;});
      setFeed(current=>current?{...current,artists:current.artists.map(artist=>artist.id===id?{...artist,votes:value.votes,communityRequests:value.communityRequests,support:value.support}:artist)}:current);
      setNotice(voted?'Голос принят. Пусть желание сбудется!':'Голос снят');if(voted&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){setBurst(id);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setBurst(null),900);}
    }catch(e){if(alive.current){setError(wishError(e));if([401,403].includes((e as {status?:number}).status||0)){sessionRef.current=null;setSession(null);setMine(new Set());setLogin(true);}}}finally{pendingRef.current.delete(id);if(alive.current)setPending(new Set(pendingRef.current));}
  };
  const max=Math.max(1,...(feed?.artists.map(artist=>artist.support)||[]));const closeSearch=()=>{setSearch(false);setQuery('');setLimit(60);searchButton.current?.focus({preventScroll:true});};
  const authError=new URLSearchParams(window.location.search).has('auth');
  return <section className="fest-screen fest-wishes" aria-label="Пожелания артистов"><div className="fest-inner">
    <header className="fest-heading"><div><div className="fest-eyebrow">Улетай {feed?.year||2027}</div><h1>КОГО ЖДЁМ?</h1></div><div className="fest-tools fest-wish-tools"><button type="button" className="fest-pill" aria-pressed={onlyMine} onClick={()=>{if(!session?.user){setLogin(true);return;}setOnlyMine(!onlyMine);setLimit(60);}}>Мои{mine.size?` · ${mine.size}`:''}</button><button ref={searchButton} type="button" className="fest-icon" aria-label={search?'Закрыть поиск':'Найти артиста для голосования'} aria-expanded={search} onClick={()=>search?closeSearch():setSearch(true)}><FestivalIcon name={search?'close':'search'}/></button></div></header>
    <FestivalSearch open={search} value={query} onChange={value=>{setQuery(value);setLimit(60);}} onClose={closeSearch} placeholder="Кого хочешь услышать?"/>
    {error?<div className="fest-notice fest-error" role="alert">{error} <button type="button" className="fest-text-button" onClick={()=>void load().catch(e=>setError(wishError(e)))}>Повторить</button></div>:null}
    {authError?<p className="fest-notice" role="status">Вход через VK не завершён. Попробуй ещё раз.</p>:null}
    <p className="fest-wish-status" role="status" aria-live="polite">{notice||(!feed&&!error?'Загружаем пожелания…':'')}</p>
    <ol className="fest-wish-list" ref={list}>{artists.slice(0,limit).map(artist=><li key={artist.id} data-wish-id={artist.id} className="fest-wish-row" data-voted={mine.has(artist.id)}>
      <span className="fest-wish-progress" aria-hidden="true" style={{transform:`scaleX(${artist.support/max})`}}/>
      <div className="fest-wish-photo"><WishImage url={artist.imageUrl}/></div><div className="fest-wish-copy"><h2>{artist.name}</h2><div className="fest-wish-counts"><strong>{artist.support.toLocaleString('ru')} {artist.support%100>=11&&artist.support%100<=14?'голосов':artist.support%10===1?'голос':artist.support%10>=2&&artist.support%10<=4?'голоса':'голосов'}</strong>{artist.confirmed?<span className="fest-wish-confirmed" title={`Уже в лайн-апе ${feed?.year}`}><FestivalIcon name="check" size={12}/>В лайн-апе</span>:null}</div></div>
      {availableArtistIds.has(artist.id)?<button type="button" className="fest-wish-open" aria-label={`Открыть артиста ${artist.name}`} onClick={()=>navigation.navigate('HeadlinerDetail',{headlinerId:artist.id})}/>:null}
      <button type="button" className="fest-icon fest-wish-vote" aria-label={`${mine.has(artist.id)?'Снять голос за':'Голосовать за'} ${artist.name}`} aria-pressed={mine.has(artist.id)} disabled={pending.has(artist.id)} aria-busy={pending.has(artist.id)} onClick={()=>void vote(artist.id)}><FestivalIcon name="heart" filled={mine.has(artist.id)} size={23}/>{burst===artist.id?<span className="fest-particles" aria-hidden="true">{Array.from({length:9},(_,i)=><span key={i} style={{'--hx':`${(i-4)*12}px`,'--hy':`${-40-Math.sin(i/8*Math.PI)*45}px`,'--hr':`${(i-4)*20}deg`,animationDelay:`${i*18}ms`} as React.CSSProperties}><FestivalIcon name={i%3===0?'spark':'heart'} size={i%2?12:16} filled/></span>)}</span>:null}</button>
    </li>)}</ol>
    {artists.length>limit?<button type="button" className="fest-button" style={{marginTop:18,width:'100%'}} onClick={()=>setLimit(value=>value+60)}>Показать ещё · {artists.length-limit}</button>:null}
    {feed&&!artists.length?<div className="fest-empty"><h2>{onlyMine?'Пока нет голосов':'Артист не найден'}</h2><p className="fest-muted">{onlyMine?'Вернись к списку и поддержи любимых.':'Попробуй другое написание имени.'}</p><button type="button" className="fest-button" onClick={()=>{setQuery('');setOnlyMine(false);}}>Показать всех</button></div>:null}
    <p className="fest-muted fest-wish-footer">Пожелания помогают услышать сообщество. Участие артиста подтверждается только в лайн-апе.</p>
    <LiquidDialog open={login} onClose={()=>setLogin(false)} title="Пусть тебя услышат" description="Войди через VK, чтобы голосовать. Один аккаунт — один голос за каждого артиста." variant="sheet"><a className="fest-button fest-vk-login" href={`${API_BASE_URL}/chat/auth/vk?returnTo=%2Fwishes`}><span aria-hidden="true"><DeferredIonicons name="logo-vk" size={28} color="#fff"/></span>Войти через VK</a></LiquidDialog>
  </div></section>;
}
