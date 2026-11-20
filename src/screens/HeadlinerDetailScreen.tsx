import React,{useMemo} from 'react';
import {ScrollView,Share,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useLinkTo} from '@react-navigation/native';
import {ArtistImage} from '../components/ArtistImage';
import {FavoriteBurst} from '../components/FavoriteBurst';
import {YandexMusicLink} from '../components/YandexMusicLink';
import {MotionPressable} from '../components/MotionPressable';
import {NativeIconButton,NativeEmpty} from '../components/festival-native/native-controls';
import {NativeArtistCard} from '../components/festival-native/native-artist-card';
import {NativeArtistExpectation} from '../components/festival-native/native-artist-expectation';
import {useAppData} from '../context/DataContext';
import {useFavorites} from '../hooks/useFavorites';
import {useNow} from '../hooks/useNow';
import {resolveArtistProfile} from '../../shared/artist-identity';
import {getHeadlinerDisplayAlternateNames} from '../utils/headlinerGroups';
import {getArtistGenres} from '../utils/musicGenres';
import {getArtistExpectationYear} from '../utils/artistExpectation';
import {resolveSimilarHeadliners} from '../utils/headlinerHelpers';
import {formatLastFmCount,formatTrackDuration} from '../utils/lastfmFormat';
import {resolveTrackYandexArtist} from '../utils/yandexMusic';
import {formatDayMonthLabel,formatTimeRange} from '../utils/scheduleHelpers';
import type {HeadlinersStackParamList,MoreStackParamList} from '../navigation/types';
import {festivalNative as f} from '../theme/native-festival';
import {appFont} from '../theme/typography';
export function HeadlinerDetailScreen({navigation,route}:NativeStackScreenProps<HeadlinersStackParamList|MoreStackParamList,'HeadlinerDetail'>){
 const {data}=useAppData(),favorites=useFavorites(),insets=useSafeAreaInsets(),{width}=useWindowDimensions(),now=useNow(),linkTo=useLinkTo();
 const artist=useMemo(()=>resolveArtistProfile(data.headliners,route.params.headlinerId),[data.headliners,route.params.headlinerId]);
 if(!artist)return <View style={[f.screen,{paddingTop:insets.top}]}><NativeIconButton name="arrow-back" label="Назад" onPress={()=>navigation.goBack()}/><NativeEmpty title="Артист не найден"/></View>;
 const aliases=getHeadlinerDisplayAlternateNames(artist),genres=getArtistGenres(artist),years=[...new Set(artist.years)].sort((a,b)=>b-a),profile=artist.lastfm;
 const ids=[artist.id,...(artist.linkedHeadlinerIds||[])],events=data.schedule.filter(item=>ids.includes(item.headlinerId)&&item.date.startsWith(`${data.festival.year}-`)).sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime));
 const autographs=data.autographs.filter(item=>ids.includes(item.headlinerId)&&item.date.startsWith(`${data.festival.year}-`));
 const similar=profile?.similarArtists.length?resolveSimilarHeadliners(data.headliners,artist.id,profile.similarArtists).slice(0,6):[];
 return <View style={f.screen}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:90+insets.bottom}}><View style={{minHeight:width*1.16}}><ArtistImage imageUrl={artist.imageUrl} artist={artist.name} variant="hero" style={StyleSheet.absoluteFill}/><LinearGradient colors={['rgba(10,4,9,.2)','transparent','#260b1d']} locations={[0,.32,1]} style={StyleSheet.absoluteFill}/><View style={[styles.toolbar,{paddingTop:insets.top+10}]}><NativeIconButton name="arrow-back" label="Назад к артистам" onPress={()=>navigation.canGoBack()?navigation.goBack():navigation.navigate('HeadlinersMain')}/><View style={{flexDirection:'row',alignItems:'center',gap:5}}><View style={styles.heart}><FavoriteBurst label={artist.name} isFavorite={favorites.isArtistFavorite(artist.id)} onToggleFavorite={()=>favorites.toggleArtistFavorite(artist.id)}/></View><NativeIconButton name="share-outline" label="Поделиться артистом" onPress={()=>void Share.share({title:artist.name,message:`${artist.name} — Улетай\nhttps://uletayapp.ru/headliners/${encodeURIComponent(artist.id)}`}).catch(()=>{})}/><YandexMusicLink artist={artist.name} variant="icon" size={44}/></View></View><View style={styles.copy}>{aliases.length?<Text style={styles.alias}>{aliases.join(' · ')}</Text>:null}<Text accessibilityRole="header" style={[f.display,{fontSize:Math.min(50,width*.115),lineHeight:Math.min(54,width*.125),textAlign:'center'}]}>{artist.name}</Text>{artist.description&&artist.description.toLowerCase()!==artist.name.toLowerCase()?<Text style={[f.muted,{textAlign:'center',marginTop:8}]}>{artist.description}</Text>:null}{genres.length?<View style={styles.tags}>{genres.map(genre=><View key={genre} style={styles.tag}><Text style={[f.muted,{fontSize:10}]}>{genre}</Text></View>)}</View>:null}</View></View>
 <View style={[f.content,{gap:24,paddingTop:14,paddingBottom:0}]}>{years.length?<View><Text style={[f.sectionTitle,{fontSize:19,color:'#bcabb7',textAlign:'center',marginBottom:10}]}>КОГДА БЫЛИ?</Text><View style={styles.years}>{years.map(year=><Text accessibilityLabel={`Улетай ${year}${year===data.festival.year?', в лайн-апе':''}`} key={year} style={[styles.year,{width:(width-28)/7,color:year===data.festival.year?'#ffda00':'#d0c0ca'}]}>{year}</Text>)}</View></View>:null}
 {events.map(item=><MotionPressable key={item.id} accessibilityRole="button" onPress={()=>linkTo(`/schedule/live/${encodeURIComponent(item.id)}`)} style={[f.glass,{padding:16,gap:7}]}><Text style={f.muted}>Выступление · {data.stages.find(stage=>stage.id===item.stageId)?.name}</Text><Text style={f.body}>{formatDayMonthLabel(item.date)} · {formatTimeRange(item.startTime,item.endTime)}</Text></MotionPressable>)}
 {autographs.map(item=><MotionPressable key={item.id} accessibilityRole="button" onPress={()=>linkTo(`/autographs/${encodeURIComponent(item.id)}`)} style={[f.glass,{padding:16,gap:7}]}><Text style={f.muted}>Автограф-сессия · {item.location}</Text><Text style={f.body}>{formatDayMonthLabel(item.date)} · {formatTimeRange(item.startTime,item.endTime)}</Text></MotionPressable>)}
 {profile?<View style={styles.stats}>{[[profile.listeners,'слушателей'],[profile.playcount,'прослушиваний']].map(([value,label])=><View key={String(label)} style={{flex:1,alignItems:'center'}}><Text style={[f.sectionTitle,{fontSize:29}]}>{formatLastFmCount(value as number|undefined)}</Text><Text style={[f.muted,{fontSize:10}]}>{label}</Text></View>)}</View>:null}
 <NativeArtistExpectation key={`${artist.id}:${getArtistExpectationYear(data,now)}`} artistId={artist.id} year={getArtistExpectationYear(data,now)}/>
 {profile?.topTracks.length?<View style={{gap:10}}><Text style={f.sectionTitle}>Популярные треки</Text>{profile.topTracks.slice(0,6).map((track,index)=><View key={`${index}-${track.name}`} style={[f.glass,styles.track]}><Text style={[f.sectionTitle,{fontSize:22,color:'#8c6d83'}]}>{String(index+1).padStart(2,'0')}</Text><View style={{flex:1,gap:4}}><Text numberOfLines={2} style={[f.body,appFont('semiBold'),{fontSize:12}]}>{track.name}</Text><Text style={[f.muted,{fontSize:9}]}>{formatLastFmCount(track.playcount)} прослушиваний{formatTrackDuration(track.durationSec)?` · ${formatTrackDuration(track.durationSec)}`:''}</Text></View><YandexMusicLink artist={resolveTrackYandexArtist(artist,track)} track={track.name} variant="icon" size={44}/></View>)}</View>:null}
 {similar.length?<View style={{gap:14}}><Text style={f.sectionTitle}>Похожие артисты</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{similar.map(item=><NativeArtistCard key={item.id} artist={item} width={(width-40)/2} saved={favorites.isArtistFavorite(item.id)} onSave={()=>favorites.toggleArtistFavorite(item.id)} onOpen={()=>navigation.push('HeadlinerDetail',{headlinerId:item.id})}/>)}</View></View>:null}
 </View></ScrollView></View>;
}
const styles=StyleSheet.create({toolbar:{paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},heart:{backgroundColor:'rgba(10,5,9,.3)',borderRadius:22,borderWidth:1,borderColor:'rgba(255,255,255,.13)',alignItems:'center',justifyContent:'center',width:44,height:44},copy:{flex:1,justifyContent:'flex-end',padding:24,paddingTop:200,alignItems:'center'},alias:{...appFont('medium'),fontSize:13,lineHeight:18,color:'#c5b3bf',textAlign:'center',marginBottom:3},tags:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:6,marginTop:12},tag:{paddingHorizontal:11,paddingVertical:6,backgroundColor:'rgba(255,255,255,.065)',borderRadius:16},years:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center'},year:{fontFamily:'FestivalDisplay',fontSize:19,lineHeight:33,textAlign:'center'},stats:{flexDirection:'row',justifyContent:'center',gap:10},track:{padding:12,flexDirection:'row',alignItems:'center',gap:13}});
