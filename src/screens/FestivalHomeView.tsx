import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from 'expo-asset';
import { CountdownTimer } from '../components/CountdownTimer';
import { FestivalIcon } from '../components/FestivalIcon.web';
import { FestivalArtistTile } from '../components/FestivalArtistTile.web';
import { LiquidDialog } from '../components/LiquidDialog.web';
import { FestivalWeather } from '../components/FestivalWeather.web';
import { FestivalNotifications } from '../components/FestivalNotifications.web';
import { APP_STORES } from '../constants/appDownload';
import { getArtistGenres } from '../utils/musicGenres';
import { isFestivalFinished, isFestivalOngoing, parseDateTime } from '../utils/scheduleHelpers';
import { useNow } from '../hooks/useNow';
import type { FestivalNotification } from '../../shared/notification-feed';
import type { FestivalWeather as Weather } from '../../shared/festival-weather';
import type { FestivalHomeAction, FestivalHomeModel } from './festivalHomeModel';

export type FestivalHomeViewProps = {
  model: FestivalHomeModel;
  focused: boolean;
  savedIds: string[];
  showDownloads: boolean;
  topInset?: number;
  localNotifications?: FestivalNotification[];
  onAction: (action: FestivalHomeAction) => Promise<void>;
  onToggleFavorite: (id: string) => Promise<void>;
  onNavigatePath: (path: string) => Promise<void>;
  onExternalLink?: (url: string) => Promise<void>;
  loadWeather?: () => Promise<Weather>;
  loadNotifications?: () => Promise<FestivalNotification[]>;
};
function allowsBackgroundVideo(){return typeof window!=='undefined'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&!(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData;}
const poster=()=>Asset.fromModule(require('../../public/hero-video-poster.webp')).uri;

function HomeAction({model,onAction}:{model:FestivalHomeModel;onAction:FestivalHomeViewProps['onAction']}) {
  const now=useNow(1000),festival=model.festival;
  const ongoing=isFestivalOngoing(festival.startDate,festival.endDate,now)&&!isFestivalFinished(festival.startDate,festival.endDate,model.schedule,now);
  return <div className="fest-hero-actions"><button type="button" className="fest-button" data-primary="true" onClick={()=>void onAction(ongoing?{type:'schedule'}:{type:'lineup',year:festival.year})}>{ongoing?'Расписание выступлений':'Кто приедет?'}</button></div>;
}

export function FestivalHomeView({model,focused,savedIds,showDownloads,topInset=0,localNotifications,onAction,onToggleFavorite,onNavigatePath,onExternalLink,loadWeather,loadNotifications}:FestivalHomeViewProps) {
  const {festival,center,artists,lineupYear,hasCurrent}=model;
  const [storeNotice,setStoreNotice]=useState(false),videoRef=useRef<HTMLVideoElement>(null);
  const [videoAllowed,setVideoAllowed]=useState(allowsBackgroundVideo),[videoFailed,setVideoFailed]=useState(false),[heroFailed,setHeroFailed]=useState(false);
  useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setVideoAllowed(allowsBackgroundVideo());media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  useEffect(()=>{
    const element=videoRef.current;if(!element||!videoAllowed||videoFailed)return;let active=true,inView=true;
    const update=()=>{if(!focused||document.hidden||!inView){element.pause();return;}element.muted=true;void element.play().catch((error:unknown)=>{if(error instanceof DOMException&&error.name==='AbortError')return;if(active&&focused&&!document.hidden&&inView)setVideoFailed(true);});};
    const observer=new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??false;update();});observer.observe(element);document.addEventListener('visibilitychange',update);update();return()=>{active=false;observer.disconnect();document.removeEventListener('visibilitychange',update);element.pause();};
  },[focused,videoAllowed,videoFailed]);
  const festivalStart=useMemo(()=>parseDateTime(festival.startDate,'12:00'),[festival.startDate]);
  const hero=heroFailed?poster():model.heroImageUrl||poster();
  const place=festival.locationShort.split(',').at(-1)?.trim().replace(/^(?:с|д|дер|пос)\.\s*/i,'')||'Лагуново';
  return <section className="fest-screen" aria-label="Главная"><div className="fest-home-layout">
    <div className="fest-hero">
      {videoAllowed&&!videoFailed?<video ref={videoRef} className="fest-hero-media" src={Asset.fromModule(require('../../assets/videos/background.webm')).uri} poster={hero} preload="metadata" autoPlay muted loop playsInline controls={false} disablePictureInPicture aria-hidden="true" onError={()=>setVideoFailed(true)}/>:<img className="fest-hero-media" src={hero} alt="Рок-фестиваль Улетай: сцена и зрители" fetchPriority="high" onError={()=>setHeroFailed(true)}/>}
      <div className="fest-hero-top" style={topInset?{paddingTop:16+topInset}:undefined}><FestivalWeather key={`${center?.latitude}:${center?.longitude}`} focused={focused} place={place} latitude={center?.latitude} longitude={center?.longitude} onExternalLink={onExternalLink} loadWeather={loadWeather}/><div className="fest-hero-tools"><FestivalNotifications focused={focused} onNavigate={onNavigatePath} localNotifications={localNotifications} loadNotifications={loadNotifications}/><button type="button" className="fest-icon" aria-label="Поиск артистов" onClick={()=>void onAction({type:'lineup',year:festival.year,search:true})}><FestivalIcon name="search"/></button></div></div>
      <div className="fest-hero-copy"><div className="fest-eyebrow">{festival.locationShort} · {festival.year} · {festival.ageRating}</div><h1>Увидимся на<br/>Улетай {festival.year}</h1><div className="fest-hero-countdown"><CountdownTimer targetDate={festivalStart} festivalStartDate={festival.startDate} festivalEndDate={festival.endDate} performances={model.schedule} compact prominent showLiveBadge={false} textStyle={{fontFamily:'FestivalDisplay',fontWeight:'900',fontStyle:'italic'}}/></div><HomeAction model={model} onAction={onAction}/></div>
    </div>
    <div className="fest-inner">
      {artists.length?<section aria-labelledby="home-headliners-title"><div className="fest-heading"><div><div className="fest-eyebrow">{hasCurrent?'Участники фестиваля':`Участники фестиваля · ${lineupYear}`}</div><h2 id="home-headliners-title">Хедлайнеры</h2></div><button type="button" className="fest-pill" onClick={()=>void onAction({type:'lineup',year:lineupYear})}>Все артисты</button></div><div className="fest-grid">{artists.map(artist=><FestivalArtistTile key={artist.id} id={artist.id} name={artist.name} imageUrl={artist.imageUrl} subtitle={getArtistGenres(artist,1)[0]} onOpen={()=>void onAction({type:'artist',id:artist.id})} saved={savedIds.includes(artist.id)} onSave={()=>void onToggleFavorite(artist.id)}/>)}</div></section>:null}
      {showDownloads?<section className="fest-downloads" aria-labelledby="home-downloads-title"><h2 id="home-downloads-title">Скачать приложение</h2><div className="fest-download-buttons">{APP_STORES.map(store=>{
        const content=<><img src={store.image} alt="" width={32} height={32} loading="lazy" decoding="async"/><span><small>{store.href?(store.name==='RuStore'?'Скачайте из':'Доступно в'):'Скоро в'}</small><strong>{store.name}</strong></span></>;
        return store.href?<a key={store.name} className="fest-button fest-store-button" data-store={store.name} href={store.href}>{content}</a>:<button className="fest-button fest-store-button" data-store={store.name} key={store.name} type="button" onClick={()=>setStoreNotice(true)}>{content}</button>;
      })}</div></section>:null}
    </div>
  </div>{showDownloads?<LiquidDialog open={storeNotice} onClose={()=>setStoreNotice(false)} title="Скоро в App Store" description="Приложение для iOS готовится к публикации. Пока пользуйтесь веб-версией." actions={[{label:'Понятно',tone:'primary',onPress:()=>setStoreNotice(false)}]}/>:null}</section>;
}
