import React, { useDeferredValue, useMemo, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HeadlinersStackParamList, MoreStackParamList } from '../navigation/types';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { buildHeadlinerYearCategories, filterHeadlinersList, getPreviousHeadlinerYears, getSelectableHeadlinerYears, HEADLINER_SORT_OPTIONS, type HeadlinerSortMode } from '../utils/headlinerHelpers';
import { FestivalArtistTile } from '../components/FestivalArtistTile.web';
import { FestivalIcon } from '../components/FestivalIcon.web';
import { FestivalCarousel, FestivalSearch } from '../components/FestivalControls.web';
import { LiquidDialog } from '../components/LiquidDialog';
import { getArtistGenres } from '../utils/musicGenres';
import { getHeadlinerDisplayAlternateNames } from '../utils/headlinerGroups';

type Props=NativeStackScreenProps<HeadlinersStackParamList|MoreStackParamList,'HeadlinersMain'>;
type Filters={sort:HeadlinerSortMode|'alpha';saved:boolean};
const defaults:Filters={sort:'popularity',saved:false};
export function HeadlinersScreen({navigation,route}:Props) {
  const {data,isInitialLoading}=useAppData();const favorites=useFavorites();
  const [query,setQuery]=useState('');const deferredQuery=useDeferredValue(query);
  const requestedSearch=String(route.params?.search)==='true';
  const [localSearch,setSearch]=useState(requestedSearch);const search=localSearch||requestedSearch;const searchButton=useRef<HTMLButtonElement>(null);
  const [filters,setFilters]=useState<Filters>(defaults);const [draft,setDraft]=useState<Filters>(defaults);const [panel,setPanel]=useState(false);
  const activeYear=route.params?.year&&/^\d{4}$/.test(route.params.year)?route.params.year:String(data.festival.year);
  const years=useMemo(()=>buildHeadlinerYearCategories(getSelectableHeadlinerYears(data.headliners,data.festival.year)),[data.headliners,data.festival.year]);
  const hasYear=data.headliners.some(artist=>artist.years.includes(Number(activeYear)));
  const previous=hasYear?undefined:getPreviousHeadlinerYears(data.headliners,Number(activeYear),1)[0];
  const displayedYear=previous??Number(activeYear);
  const items=useMemo(()=>{
    let list=filterHeadlinersList(data.headliners,{year:displayedYear,query:deferredQuery,sort:filters.sort==='alpha'?'popularity':filters.sort});
    if(filters.saved)list=list.filter(item=>favorites.isArtistFavorite(item.id));
    if(filters.sort==='alpha')list.sort((a,b)=>a.name.localeCompare(b.name,'ru'));
    return list;
  },[data.headliners,displayedYear,deferredQuery,filters,favorites]);
  const closeSearch=()=>{setSearch(false);setQuery('');navigation.setParams({search:undefined});searchButton.current?.focus({preventScroll:true});};
  const activeFilters=filters.saved||filters.sort!=='popularity';
  return <section className="fest-screen fest-lineup-screen" aria-label="Лайн-ап"><div className="fest-inner">
    <header className="fest-heading"><div><div className="fest-eyebrow">{Number(activeYear)===data.festival.year?`Улетай ${activeYear}`:'Архив фестиваля'}</div><h1>Лайн-ап</h1></div><div className="fest-tools"><button type="button" className="fest-icon" aria-label="Открыть фильтры артистов" aria-haspopup="dialog" aria-expanded={panel} aria-pressed={!!activeFilters} onClick={()=>{setDraft(filters);setPanel(true);}}><FestivalIcon name="filter"/></button><button ref={searchButton} type="button" className="fest-icon" aria-label={search?'Закрыть поиск':'Открыть поиск артистов'} aria-expanded={search} onClick={()=>search?closeSearch():setSearch(true)}><FestivalIcon name={search?'close':'search'}/></button></div></header>
    <FestivalSearch open={search} value={query} onChange={setQuery} onClose={closeSearch}/>
    <div className="fest-lineup-selectors"><FestivalCarousel items={years} value={activeYear} onChange={year=>navigation.setParams({year})} label="Год фестиваля"/></div>
    {previous?<div className="fest-notice">Состав {activeYear} года ещё не объявлен. Ниже — артисты предыдущего фестиваля <strong>{previous}</strong> года.</div>:null}
    {query||activeFilters?<p className="fest-muted" aria-live="polite" style={{marginBottom:18}}>Найдено: {items.length} · <button type="button" className="fest-text-button" onClick={()=>{setQuery('');setFilters(defaults);}}>Сбросить</button></p>:null}
    {items.length?<div className="fest-grid">{items.map(artist=><FestivalArtistTile key={artist.id} id={artist.id} name={artist.name} imageUrl={artist.imageUrl} alternateName={getHeadlinerDisplayAlternateNames(artist).join(' · ')} subtitle={getArtistGenres(artist,2).join(' · ')} saved={favorites.isArtistFavorite(artist.id)} onSave={()=>favorites.toggleArtistFavorite(artist.id)} onOpen={()=>navigation.navigate('HeadlinerDetail',{headlinerId:artist.id})}/>)}</div>:<div className="fest-empty" role="status"><h2>{isInitialLoading?'Загружаем лайн-ап':query||activeFilters?'Ничего не найдено':`До встречи на Улетай ${activeYear}`}</h2><p className="fest-muted">{query||activeFilters?'Попробуйте другое имя, год или сбросьте фильтры.':'Состав участников появится после объявления организаторов.'}</p></div>}
  </div>
  <LiquidDialog open={panel} onClose={()=>setPanel(false)} title="Фильтры" variant="sheet" actions={[{label:'Сбросить',onPress:()=>setDraft(defaults)},{label:'Показать артистов',tone:'primary',onPress:()=>{setFilters(draft);setPanel(false);}}]}>
    <div className="fest-filter-section"><label className="fest-check"><input type="checkbox" checked={draft.saved} onChange={e=>setDraft({...draft,saved:e.target.checked})}/>Только избранные артисты</label></div>
    <div className="fest-filter-section"><h3>Порядок</h3><div className="fest-scroll-pills">{[...HEADLINER_SORT_OPTIONS,{id:'alpha' as const,label:'А–Я'}].map(option=><button type="button" className="fest-pill" key={option.id} aria-pressed={draft.sort===option.id} onClick={()=>setDraft({...draft,sort:option.id})}>{option.label}</button>)}</div></div>
  </LiquidDialog></section>;
}
