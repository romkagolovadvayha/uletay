import React,{useDeferredValue,useMemo,useState} from 'react';
import {FlatList,Text,View,useWindowDimensions} from 'react-native';
import {SafeAreaView,useSafeAreaInsets} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useAppData} from '../context/DataContext';
import {useFavorites} from '../hooks/useFavorites';
import {NativeArtistCard} from '../components/festival-native/native-artist-card';
import {NativeHeading,NativeIconButton,NativeSearch,NativePills,NativeEmpty,NativeButton} from '../components/festival-native/native-controls';
import {LiquidDialog} from '../components/LiquidDialog';
import {MotionPressable} from '../components/MotionPressable';
import {Ionicons} from '@expo/vector-icons';
import {buildHeadlinerYearCategories,filterHeadlinersList,getPreviousHeadlinerYears,getSelectableHeadlinerYears,HEADLINER_SORT_OPTIONS,type HeadlinerSortMode} from '../utils/headlinerHelpers';
import {festivalNative as f} from '../theme/native-festival';
import type {HeadlinersStackParamList,MoreStackParamList} from '../navigation/types';
type Filters={sort:HeadlinerSortMode|'alpha';saved:boolean};
const defaults:Filters={sort:'popularity',saved:false};
export function HeadlinersScreen({navigation,route}:NativeStackScreenProps<HeadlinersStackParamList|MoreStackParamList,'HeadlinersMain'>){
  const {data,isInitialLoading}=useAppData(),favorites=useFavorites(),{width}=useWindowDimensions(),insets=useSafeAreaInsets();
  const [query,setQuery]=useState(''),needle=useDeferredValue(query),[localSearch,setSearch]=useState(false),[filters,setFilters]=useState(defaults),[draft,setDraft]=useState(defaults),[panel,setPanel]=useState(false);
  const search=localSearch||String(route.params?.search)==='true';
  const year=route.params?.year&&/^\d{4}$/.test(route.params.year)?route.params.year:String(data.festival.year);
  const years=useMemo(()=>buildHeadlinerYearCategories(getSelectableHeadlinerYears(data.headliners,data.festival.year)),[data]);
  const previous=data.headliners.some(artist=>artist.years.includes(Number(year)))?undefined:getPreviousHeadlinerYears(data.headliners,Number(year),1)[0];
  const items=useMemo(()=>{let list=filterHeadlinersList(data.headliners,{year:previous??Number(year),query:needle,sort:filters.sort==='alpha'?'popularity':filters.sort});if(filters.saved)list=list.filter(item=>favorites.isArtistFavorite(item.id));if(filters.sort==='alpha')list.sort((a,b)=>a.name.localeCompare(b.name,'ru'));return list;},[data.headliners,previous,year,needle,filters,favorites]);
  const closeSearch=()=>{setSearch(false);setQuery('');navigation.setParams({search:undefined});};
  return <SafeAreaView style={f.screen} edges={['top']}><NativeHeading title="Лайн-ап" kicker={`Улетай ${year}`}><NativeIconButton name="options-outline" label="Фильтры артистов" active={filters.saved||filters.sort!=='popularity'} onPress={()=>{setDraft(filters);setPanel(true);}}/><NativeIconButton name={search?'close':'search-outline'} label={search?'Закрыть поиск':'Поиск артистов'} onPress={()=>search?closeSearch():setSearch(true)}/></NativeHeading><NativeSearch open={search} value={query} onChange={setQuery} onClose={closeSearch}/><View style={{backgroundColor:'rgba(255,255,255,.025)',paddingVertical:3,marginBottom:10}}><NativePills items={years} selected={year} onSelect={year=>navigation.setParams({year})} label="Год фестиваля"/></View>
    <FlatList data={items} keyExtractor={item=>item.id} numColumns={2} initialNumToRender={8} maxToRenderPerBatch={6} windowSize={7} removeClippedSubviews={false} showsVerticalScrollIndicator={false} columnWrapperStyle={{gap:12,marginBottom:12}} contentContainerStyle={[f.content,{paddingBottom:84+insets.bottom}]} ListHeaderComponent={previous?<Text style={[f.muted,{paddingBottom:14}]}>Состав {year} пока не объявлен. Артисты {previous} года.</Text>:null} renderItem={({item})=><NativeArtistCard artist={item} width={(width-40)/2} saved={favorites.isArtistFavorite(item.id)} onSave={()=>favorites.toggleArtistFavorite(item.id)} onOpen={()=>navigation.navigate('HeadlinerDetail',{headlinerId:item.id})}/>} ListEmptyComponent={<NativeEmpty loading={isInitialLoading} title={isInitialLoading?'Загружаем лайн-ап':'Артисты не найдены'} description="Попробуй другой год или поисковый запрос."/>}/>
    <LiquidDialog variant="sheet" open={panel} onClose={()=>setPanel(false)} title="Артисты" actions={[{label:'Показать артистов',tone:'primary',onPress:()=>{setFilters(draft);setPanel(false);}}]}>{[...HEADLINER_SORT_OPTIONS,{id:'alpha' as const,label:'По алфавиту'}].map(option=><MotionPressable key={option.id} accessibilityRole="radio" accessibilityState={{checked:draft.sort===option.id}} onPress={()=>setDraft({...draft,sort:option.id})} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:48,padding:12}}><Text style={f.body}>{option.label}</Text>{draft.sort===option.id?<Ionicons name="checkmark" size={22} color="#ffda00"/>:null}</MotionPressable>)}<NativeButton label={draft.saved?'✓ Только избранное':'Только избранное'} icon="heart-outline" onPress={()=>setDraft({...draft,saved:!draft.saved})}/><NativeButton label="Сбросить" onPress={()=>setDraft(defaults)}/></LiquidDialog>
  </SafeAreaView>;
}
