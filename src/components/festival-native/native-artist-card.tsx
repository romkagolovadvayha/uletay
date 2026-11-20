import React,{memo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {ArtistImage} from '../ArtistImage';
import {FavoriteBurst} from '../FavoriteBurst';
import {MotionPressable} from '../MotionPressable';
import type {Headliner} from '../../types';
import {getHeadlinerDisplayAlternateNames} from '../../utils/headlinerGroups';
import {getArtistGenres} from '../../utils/musicGenres';
import {appFont} from '../../theme/typography';
export const NativeArtistCard=memo(function NativeArtistCard({artist,width,saved,onSave,onOpen}:{artist:Headliner;width:number;saved:boolean;onSave:()=>void;onOpen:()=>void}){
  const alternate=getHeadlinerDisplayAlternateNames(artist).join(' · '),genres=getArtistGenres(artist);
  return <View style={{width,aspectRatio:.88,overflow:'visible'}}><MotionPressable accessibilityRole="button" accessibilityLabel={`Артист ${artist.name}`} onPress={onOpen} style={styles.card}><ArtistImage imageUrl={artist.imageUrl} artist={artist.name} variant="card" style={StyleSheet.absoluteFill}/><LinearGradient colors={['transparent','rgba(14,4,11,.2)','rgba(14,4,11,.96)']} locations={[0,.42,1]} style={StyleSheet.absoluteFill}/><View style={styles.caption}>{alternate?<Text numberOfLines={1} style={styles.alternate}>{alternate}</Text>:null}<Text numberOfLines={2} style={styles.name}>{artist.name}</Text>{genres.length?<Text numberOfLines={1} style={styles.genres}>{genres.slice(0,2).join(' · ')}</Text>:null}</View></MotionPressable><View style={styles.heart}><FavoriteBurst isFavorite={saved} onToggleFavorite={onSave} label={artist.name} size={23}/></View></View>;
});
const styles=StyleSheet.create({card:{flex:1,borderRadius:18,borderCurve:'continuous',overflow:'hidden',backgroundColor:'#291321'},caption:{position:'absolute',bottom:13,left:12,right:10,gap:2},name:{fontFamily:'FestivalDisplay',fontSize:23,lineHeight:24,textTransform:'uppercase',color:'#fff'},alternate:{...appFont('medium'),fontSize:10,lineHeight:13,color:'#d8cbd3'},genres:{...appFont('regular'),fontSize:9,lineHeight:13,color:'#b9aab4'},heart:{position:'absolute',top:5,right:5,borderRadius:22,backgroundColor:'rgba(13,5,11,.25)',overflow:'visible'}});
