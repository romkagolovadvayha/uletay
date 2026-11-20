import React, { useMemo, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HeadlinersStackParamList, MoreStackParamList, RootTabParamList } from '../navigation/types';
import type { NavigationProp } from '@react-navigation/native';
import { ArtistImage } from '../components/ArtistImage';
import { FestivalIcon } from '../components/FestivalIcon.web';
import { ArtistParticipationYears } from '../components/ArtistParticipationYears.web';
import { ArtistExpectation } from '../components/ArtistExpectation.web';
import { FestivalArtistTile } from '../components/FestivalArtistTile.web';
import { FavoriteBurst } from '../components/FavoriteBurst';
import { YandexMusicLink } from '../components/YandexMusicLink';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { formatLastFmCount, formatTrackDuration } from '../utils/lastfmFormat';
import { getHeadlinerDisplayAlternateNames } from '../utils/headlinerGroups';
import { resolveSimilarHeadliners } from '../utils/headlinerHelpers';
import { resolveTrackYandexArtist } from '../utils/yandexMusic';
import { formatDayMonthLabel, formatTimeRange } from '../utils/scheduleHelpers';
import { getArtistGenres } from '../utils/musicGenres';
import { getArtistExpectationYear } from '../utils/artistExpectation';
import { useNow } from '../hooks/useNow';
import { buildArtistShareData, openArtistShare } from '../utils/artistShare.web';
import { resolveArtistProfile } from '../../shared/artist-identity';

type Props=NativeStackScreenProps<HeadlinersStackParamList|MoreStackParamList,'HeadlinerDetail'>;
export function HeadlinerDetailScreen({navigation,route}:Props) {
  const {data}=useAppData();const favorites=useFavorites();const [shareMessage,setShareMessage]=useState('');
  const [sharing,setSharing]=useState(false);const sharePending=useRef(false);
  const now=useNow();
  const artist=useMemo(()=>resolveArtistProfile(data.headliners,route.params.headlinerId),[data.headliners,route.params.headlinerId]);
  const years=useMemo(()=>[...new Set(artist?.years||[])].sort((a,b)=>b-a),[artist]);
  const similar=useMemo(()=>artist?.lastfm?.similarArtists.length?resolveSimilarHeadliners(data.headliners,artist.id,artist.lastfm.similarArtists):[],[data.headliners,artist]);
  if(!artist)return <section className="fest-screen"><div className="fest-inner fest-empty"><h1>Артист не найден</h1><button type="button" className="fest-button" onClick={()=>navigation.goBack()}>Назад</button></div></section>;
  const root=navigation.getParent<NavigationProp<RootTabParamList>>();
  const ids=[artist.id,...(artist.linkedHeadlinerIds||[])];
  const byTime=(a:{date:string;startTime:string},b:{date:string;startTime:string})=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime);
  const performances=data.schedule.filter(item=>ids.includes(item.headlinerId)&&item.date.startsWith(`${data.festival.year}-`)).sort(byTime);
  const autographs=data.autographs.filter(item=>ids.includes(item.headlinerId)&&item.date.startsWith(`${data.festival.year}-`)).sort(byTime);
  const aliases=getHeadlinerDisplayAlternateNames(artist);const profile=artist.lastfm;
  const genres=getArtistGenres(artist);
  const description=artist.description?.trim();
  const showDescription=description&&description.toLocaleLowerCase('ru')!==artist.name.trim().toLocaleLowerCase('ru');
  const expectationYear=getArtistExpectationYear(data,now);
  const share=async()=>{
    if(sharePending.current)return;sharePending.current=true;setSharing(true);setShareMessage('');
    try{
      const result=await openArtistShare(buildArtistShareData(artist.name,window.location.href),{share:typeof navigator.share==='function'?data=>navigator.share(data):undefined,secure:window.isSecureContext});
      if(result==='insecure')setShareMessage('Для системного меню «Поделиться» открой приложение по защищённой HTTPS-ссылке.');
      else if(result==='unsupported')setShareMessage('В этом браузере системное меню «Поделиться» недоступно.');
      else if(result==='failed')setShareMessage('Не удалось открыть меню «Поделиться». Попробуй ещё раз.');
    }finally{sharePending.current=false;setSharing(false);}
  };
  return <section className="fest-screen fest-artist-profile" aria-label={artist.name}><div className="fest-home-layout"><div className="fest-detail-hero">
    <div className="fest-artist-image"><ArtistImage imageUrl={artist.imageUrl} artist={artist.name} variant="hero" style={{width:'100%',height:'100%'}}/></div>
    <div className="fest-hero-top">
      <button type="button" className="fest-icon" aria-label="Назад к артистам" onClick={()=>navigation.canGoBack()?navigation.goBack():navigation.navigate('HeadlinersMain')}><FestivalIcon name="back"/></button>
      <div className="fest-artist-toolbar">
        <FavoriteBurst isFavorite={favorites.isArtistFavorite(artist.id)} onToggleFavorite={()=>favorites.toggleArtistFavorite(artist.id)} label={artist.name}/>
        <button type="button" className="fest-icon" aria-label="Поделиться артистом" aria-busy={sharing} disabled={sharing} onClick={()=>void share()}><FestivalIcon name="share"/></button>
        <YandexMusicLink artist={artist.name} variant="icon"/>
      </div>
    </div>
    <div className="fest-detail-copy">{aliases.length?<p className="fest-muted fest-artist-alias">{aliases.join(' · ')}</p>:null}<h1>{artist.name}</h1>{showDescription?<p>{description}</p>:null}{genres.length?<div className="fest-tags" aria-label="Жанры">{genres.map(genre=><span key={genre}>{genre}</span>)}</div>:null}</div>
  </div><div className="fest-inner fest-detail-content">
    {shareMessage?<p role="status" className="fest-notice">{shareMessage}</p>:null}
    {years.length?<section className="fest-artist-section fest-artist-years" aria-labelledby="artist-years-title"><h2 id="artist-years-title">КОГДА БЫЛИ?</h2><ArtistParticipationYears years={years} currentYear={data.festival.year}/></section>:null}
    {performances.length||autographs.length?<section className="fest-artist-section fest-artist-events" aria-label="Выступления и встречи">
      {performances.map(item=><button type="button" className="fest-artist-event" key={item.id} aria-label={`Открыть выступление: ${formatDayMonthLabel(item.date)} ${item.date.slice(0,4)}, ${item.startTime}`} onClick={()=>root?.navigate('ScheduleTab',{screen:'LiveDetail',params:{performanceId:item.id}})}><FestivalIcon name="music"/><span><small>Выступление · {data.stages.find(stage=>stage.id===item.stageId)?.name}</small><strong>{formatDayMonthLabel(item.date)} {item.date.slice(0,4)} · {formatTimeRange(item.startTime,item.endTime)}</strong></span><FestivalIcon name="back" size={20}/></button>)}
      {autographs.map(item=><button type="button" className="fest-artist-event" key={item.id} aria-label={`Открыть автограф-сессию: ${formatDayMonthLabel(item.date)} ${item.date.slice(0,4)}, ${item.startTime}`} onClick={()=>root?.navigate('Autographs',{screen:'AutographDetail',params:{sessionId:item.id}})}><FestivalIcon name="calendar"/><span><small>{item.location||'Автограф-сессия'}</small><strong>{formatDayMonthLabel(item.date)} {item.date.slice(0,4)} · {formatTimeRange(item.startTime,item.endTime)}</strong></span><FestivalIcon name="back" size={20}/></button>)}
    </section>:null}
    {profile?<div className="fest-stats fest-artist-stats" aria-label="Статистика прослушиваний"><div><strong>{formatLastFmCount(profile.listeners)}</strong><small>слушателей</small></div><div><strong>{formatLastFmCount(profile.playcount)}</strong><small>прослушиваний</small></div></div>:null}
    <ArtistExpectation key={`${artist.id}:${expectationYear}`} artistId={artist.id} year={expectationYear}/>
    {profile?<>
      {profile.topTracks.length?<section className="fest-artist-section" aria-labelledby="artist-tracks-title"><h2 id="artist-tracks-title">Популярные треки</h2><ol className="fest-artist-tracks">{profile.topTracks.slice(0,6).map((track,index)=><li className="fest-artist-track" key={`${track.rank}-${track.name}`}><span className="fest-artist-track-rank" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><div className="fest-artist-track-copy"><strong>{track.name}</strong><small>{formatLastFmCount(track.playcount)} прослушиваний{formatTrackDuration(track.durationSec)?` · ${formatTrackDuration(track.durationSec)}`:''}</small></div><YandexMusicLink artist={resolveTrackYandexArtist(artist,track)} track={track.name} variant="icon"/></li>)}</ol></section>:null}
    </>:null}
    {similar.length?<section className="fest-artist-section"><h2>Похожие артисты</h2><div className="fest-grid">{similar.map(item=><FestivalArtistTile key={item.id} id={item.id} name={item.name} imageUrl={item.imageUrl} onOpen={()=>navigation.navigate('HeadlinerDetail',{headlinerId:item.id})} onSave={()=>favorites.toggleArtistFavorite(item.id)} saved={favorites.isArtistFavorite(item.id)}/>)}</div></section>:null}
  </div></div></section>;
}
