import React, { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { apiFetch } from '../api/apiFetch';
import { API_BASE_URL } from '../config/api';
import { formatWishVoteCount, type ArtistExpectationRating, type WishVoteResult } from '../../shared/artist-wishes';
import { FestivalIcon } from './FestivalIcon.web';
import { FavoriteParticles } from './FavoriteBurst.web';
import { LiquidDialog } from './LiquidDialog';
import { DeferredIonicons } from './DeferredIonicons';

type Session={user:{id:number}|null;csrf:string;bearer:string|null;loginAvailable:boolean};
const cache=new Map<string,ArtistExpectationRating>();
async function read<T>(response:Response):Promise<T>{const value=await response.json();if(!response.ok)throw Object.assign(new Error(value.error||'Не удалось выполнить запрос'),{status:response.status});return value;}

export function ArtistExpectation({artistId,year}:{artistId:string;year:number}){
  const focused=useIsFocused(),key=`${year}:${artistId}`;
  const [rating,setRating]=useState<ArtistExpectationRating|null>(()=>cache.get(key)||null);
  const [error,setError]=useState(''),[attempt,setAttempt]=useState(0),[voted,setVoted]=useState(false),[pending,setPending]=useState(false),[login,setLogin]=useState(false);
  const session=useRef<Session|null>(null),pendingRef=useRef(false),version=useRef(0),button=useRef<HTMLButtonElement>(null),alive=useRef(true);
  const [burst,setBurst]=useState<{id:number;x:number;y:number}|null>(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{if(!burst)return;const timer=setTimeout(()=>setBurst(null),900);return()=>clearTimeout(timer);},[burst]);
  useEffect(()=>{
    if(!focused)return;const controller=new AbortController();let running=false;
    const load=async()=>{
      if(running||document.hidden||controller.signal.aborted||pendingRef.current)return;
      const atVersion=version.current;running=true;
      try{
        const params=new URLSearchParams({artistId,year:String(year)});
        const [value,account]=await Promise.all([
          apiFetch(`/wishes/rating?${params}`,{signal:controller.signal}).then(read<ArtistExpectationRating>),
          session.current?Promise.resolve(session.current):apiFetch('/chat/session',{credentials:'include',signal:controller.signal}).then(read<Session>),
        ]);
        if(controller.signal.aborted)return;session.current=account;
        const mine=account.user?await apiFetch(`/wishes/mine?year=${year}`,{credentials:'include',signal:controller.signal,headers:{'X-Chat-CSRF':account.csrf,...(account.bearer?{Authorization:`Bearer ${account.bearer}`}:{})}}).then(read<{artistIds:string[]}>):null;
        if(!controller.signal.aborted&&!pendingRef.current&&atVersion===version.current){cache.set(key,value);setRating(value);setVoted(mine?.artistIds.includes(value.artistId)||false);setError('');}
      }catch{if(!controller.signal.aborted)setError('Не удалось загрузить голоса');}finally{running=false;}
    };
    void load();const interval=setInterval(()=>void load(),30_000),wake=()=>void load();
    window.addEventListener('online',wake);document.addEventListener('visibilitychange',wake);
    return()=>{controller.abort();clearInterval(interval);window.removeEventListener('online',wake);document.removeEventListener('visibilitychange',wake);};
  },[artistId,year,key,focused,attempt]);
  const vote=async()=>{
    const account=session.current;if(!account?.user){setLogin(true);return;}if(pendingRef.current)return;
    pendingRef.current=true;setPending(true);setError('');version.current++;
    try{
      const value=await apiFetch('/wishes/vote',{method:'POST',credentials:'include',replaySafe:true,headers:{'Content-Type':'application/json','X-Chat-CSRF':account.csrf,...(account.bearer?{Authorization:`Bearer ${account.bearer}`}:{})},body:JSON.stringify({artistId,voted:!voted,year})}).then(read<WishVoteResult>);
      if(!alive.current)return;setVoted(value.voted);setRating(previous=>previous?{...previous,support:value.support}:previous);
      if(value.voted&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){const rect=button.current?.querySelector('svg')?.getBoundingClientRect();if(rect)setBurst({id:Date.now(),x:rect.x+rect.width/2,y:rect.y+rect.height/2});}
      setAttempt(value=>value+1);
    }catch(error){if(alive.current){setError(error instanceof TypeError?'Не удалось связаться с сервером':(error as Error).message);if([401,403].includes((error as {status?:number}).status||0)){session.current=null;setVoted(false);setLogin(true);}}}
    finally{pendingRef.current=false;if(alive.current)setPending(false);}
  };
  return <section className="fest-expectation" aria-labelledby="artist-expectation-title">
    <header><h2 id="artist-expectation-title">Ждут на Улетай</h2></header>
    {rating?<><div className="fest-expectation-numbers"><div><strong>{rating.support.toLocaleString('ru')}</strong><span>{formatWishVoteCount(rating.support).replace(/^[\d\s\u00a0]+/,'')}</span></div><div className="fest-expectation-place"><strong>{rating.rank?`№ ${rating.rank}`:'—'}</strong><span>{rating.rank?'среди ожидаемых':'пока без голосов'}</span></div></div>
      <button ref={button} type="button" className="fest-button fest-expectation-vote" aria-label={voted?'Снять голос за артиста':'Голосовать за артиста'} aria-pressed={voted} aria-busy={pending} disabled={pending} onClick={()=>void vote()}><FestivalIcon name="heart" filled={voted} size={20}/>{pending?'Сохраняем…':voted?'Я жду!':'Хочу увидеть'}</button>
    </>:!error?<p role="status" className="fest-muted">Считаем голоса…</p>:null}
    {error?<p className="fest-expectation-error" role="status">{error} <button type="button" className="fest-text-button" onClick={()=>{setError('');setAttempt(value=>value+1);}}>Повторить</button></p>:null}
    {burst?<FavoriteParticles key={burst.id} origin={burst}/>:null}
    <LiquidDialog open={login} onClose={()=>setLogin(false)} title="Пусть тебя услышат" description="Войди через VK, чтобы голосовать за любимых артистов." variant="sheet"><a className="fest-button fest-vk-login" href={`${API_BASE_URL}/chat/auth/vk?returnTo=${encodeURIComponent(window.location.pathname)}`}><span aria-hidden="true"><DeferredIonicons name="logo-vk" size={28} color="#fff"/></span>Войти через VK</a></LiquidDialog>
  </section>;
}
