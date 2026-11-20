import React, { useMemo } from 'react';
import { useIsFocused, useLinkTo } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { useInstalledAppMode } from '../hooks/useInstalledAppMode.web';
import { resolveMediaUrl } from '../config/api';
import type { RootTabParamList } from '../navigation/types';
import {FestivalHomeView} from './FestivalHomeView';
import { buildFestivalHomeModel, type FestivalHomeAction } from './festivalHomeModel';

export function FestivalHomeExperience({navigation}:{navigation:BottomTabNavigationProp<RootTabParamList,'HomeTab'>}) {
  const {data}=useAppData(),favorites=useFavorites(),focused=useIsFocused(),linkTo=useLinkTo(),installed=useInstalledAppMode();
  const model=useMemo(()=>buildFestivalHomeModel(data,resolveMediaUrl),[data]);
  const onAction=async(action:FestivalHomeAction)=>{
    if(action.type==='schedule')navigation.navigate('ScheduleTab',{screen:'ScheduleMain'});
    else if(action.type==='artist')navigation.navigate('HeadlinersTab',{screen:'HeadlinerDetail',params:{headlinerId:action.id}});
    else navigation.navigate('HeadlinersTab',{screen:'HeadlinersMain',params:{year:String(action.year),search:action.search}});
  };
  return <FestivalHomeView model={model} focused={focused} savedIds={model.artists.filter(artist=>favorites.isArtistFavorite(artist.id)).map(artist=>artist.id)}
    showDownloads={!installed} onAction={onAction} onToggleFavorite={async id=>{favorites.toggleArtistFavorite(id);}} onNavigatePath={async path=>{linkTo(path);}}/>;
}
