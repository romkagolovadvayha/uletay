import React, { useDeferredValue, useMemo, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigationProp } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import type { RootTabParamList, ScheduleStackParamList } from '../navigation/types';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { useFestivalSelectedDate } from '../hooks/useFestivalSelectedDate';
import { useNow } from '../hooks/useNow';
import { filterByFestivalDay, getFestivalDates, sortByStartTime } from '../utils/scheduleHelpers';
import { getFestivalDayDate } from '../utils/festivalTime';
import { resolveLinkedArtist } from '../utils/headlinersCore';
import { FestivalIcon } from '../components/FestivalIcon.web';
import { FestivalSearch } from '../components/FestivalControls.web';
import { DateTabBar } from '../components/DateTabBar';
import { ScheduleStageGrid } from '../components/ScheduleStageGrid';
import { LiquidDialog } from '../components/LiquidDialog';

export function ScheduleMainScreen({navigation}:NativeStackScreenProps<ScheduleStackParamList,'ScheduleMain'>) {
  const {data,isInitialLoading}=useAppData();const favorites=useFavorites();const now=useNow(30000);const bottomInset=useBottomTabBarHeight();
  const [date,setDate]=useFestivalSelectedDate(data.festival.startDate,data.festival.endDate,now);
  const dates=useMemo(()=>getFestivalDates(data.festival.startDate,data.festival.endDate),[data.festival.startDate,data.festival.endDate]);
  const hasPublishedSchedule=data.schedule.some(item=>dates.includes(getFestivalDayDate(item.date,item.startTime)));
  const [stage,setStage]=useState('all');const [saved,setSaved]=useState(false);const [panel,setPanel]=useState(false);const [draftStage,setDraftStage]=useState('all');const [draftSaved,setDraftSaved]=useState(false);
  const [search,setSearch]=useState(false);const [query,setQuery]=useState('');const deferredQuery=useDeferredValue(query);const trigger=useRef<HTMLButtonElement>(null);
  const items=useMemo(()=>sortByStartTime(filterByFestivalDay(data.schedule,date)).filter(event=>(stage==='all'||stage===event.stageId)&&(!saved||favorites.isFavorite(event.id))&&(!deferredQuery||resolveLinkedArtist(event,data.headliners).toLocaleLowerCase('ru').includes(deferredQuery.toLocaleLowerCase('ru')))).map(event=>({...event,artist:resolveLinkedArtist(event,data.headliners)||event.artist})),[data.schedule,data.headliners,date,stage,saved,deferredQuery,favorites]);
  const stages=stage==='all'?data.stages:data.stages.filter(item=>item.id===stage);
  const hasFilters=!!query||saved||stage!=='all';
  const closeSearch=()=>{setSearch(false);setQuery('');trigger.current?.focus({preventScroll:true});};
  const resetFilters=()=>{setQuery('');setSaved(false);setStage('all');};
  const emptyDescription=isInitialLoading?'Получаем данные фестиваля…':hasFilters?'Выберите другой день или сбросьте фильтры.':hasPublishedSchedule?'Выберите другой день фестиваля.':null;
  return <section className="fest-screen fest-schedule-screen" aria-label="Расписание фестиваля">
    <div className="fest-schedule-controls">
      <header className="fest-heading"><div><div className="fest-eyebrow">Улетай {data.festival.year}</div><h1>Расписание</h1></div><div className="fest-tools"><button type="button" className="fest-icon" aria-label="Фильтры расписания" aria-haspopup="dialog" aria-expanded={panel} aria-pressed={saved||stage!=='all'} onClick={()=>{setDraftStage(stage);setDraftSaved(saved);setPanel(true);}}><FestivalIcon name="filter"/></button><button ref={trigger} type="button" className="fest-icon" aria-label={search?'Закрыть поиск':'Поиск в расписании'} aria-expanded={search} onClick={()=>search?closeSearch():setSearch(true)}><FestivalIcon name={search?'close':'search'}/></button></div></header>
      <FestivalSearch open={search} value={query} onChange={setQuery} onClose={closeSearch} placeholder="Найти выступление"/>
      <DateTabBar dates={dates} selectedDate={date} onSelect={setDate}/>
      {hasFilters?<div className="fest-schedule-summary"><span role="status">Найдено: {items.length}{saved?' · Мой план':''}{stage!=='all'?` · ${stages[0]?.name||''}`:''}</span><button type="button" className="fest-text-button" onClick={resetFilters}>Сбросить фильтры</button></div>:null}
    </div>
    <div className="fest-schedule-grid"><ScheduleStageGrid performances={items} stages={stages} centerStageHeaders={!hasPublishedSchedule} selectedDate={date} now={now} bottomInset={bottomInset} isFavorite={favorites.isFavorite} onToggleFavorite={favorites.toggleFavorite} onPressPerformance={performanceId=>navigation.navigate('LiveDetail',{performanceId})} emptyContent={<div className="fest-empty" role="status"><h2>{isInitialLoading?'Загружаем расписание':hasFilters?'Ничего не найдено':hasPublishedSchedule?'Нет выступлений в этот день':'Расписание скоро появится'}</h2>{emptyDescription?<p className="fest-muted">{emptyDescription}</p>:null}{hasFilters?<button type="button" className="fest-button" onClick={resetFilters}>Сбросить фильтры</button>:!isInitialLoading&&!hasPublishedSchedule?<button type="button" className="fest-button" data-primary="true" onClick={()=>navigation.getParent<NavigationProp<RootTabParamList>>()?.navigate('HeadlinersTab',{screen:'HeadlinersMain',params:{year:String(data.festival.year)}})}>Хедлайнеры</button>:null}</div>}/></div>
    <LiquidDialog open={panel} onClose={()=>setPanel(false)} title="Фильтры расписания" variant="sheet" actions={[{label:'Сбросить',onPress:()=>{setDraftStage('all');setDraftSaved(false);}},{label:'Показать',tone:'primary',onPress:()=>{setStage(draftStage);setSaved(draftSaved);setPanel(false);}}]}><div className="fest-filter-section"><h3>Сцена</h3><div className="fest-scroll-pills">{[{id:'all',shortName:'Все сцены'},...data.stages].map(item=><button className="fest-pill" type="button" key={item.id} aria-pressed={draftStage===item.id} onClick={()=>setDraftStage(item.id)}>{item.shortName}</button>)}</div></div><label className="fest-check"><input type="checkbox" checked={draftSaved} onChange={e=>setDraftSaved(e.target.checked)}/>Только мой план</label></LiquidDialog>
  </section>;
}
