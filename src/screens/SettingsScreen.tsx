import React,{useState} from 'react';
import {ScrollView,Text,View} from 'react-native';
import {SafeAreaView,useSafeAreaInsets} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {NativeIconButton,NativeButton} from '../components/festival-native/native-controls';
import {FavoriteNotificationsCard} from '../components/FavoriteNotificationsCard';
import {LiquidDialog} from '../components/LiquidDialog';
import {useDemoMode} from '../context/DemoModeContext';
import {useAppData} from '../context/DataContext';
import {clearOfflineAppCache} from '../utils/clearOfflineAppCache';
import {openExternalUrl} from '../utils/openExternalUrl';
import {PRIVACY_POLICY_URL} from '../constants/legal';
import type {MoreStackParamList} from '../navigation/types';
import {festivalNative as f} from '../theme/native-festival';
export function SettingsScreen({navigation}:NativeStackScreenProps<MoreStackParamList,'Settings'>){
 const {mode,setMode,demoDescription}=useDemoMode(),{refreshData}=useAppData(),insets=useSafeAreaInsets(),[reset,setReset]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const clear=async()=>{setReset(false);setBusy(true);try{await clearOfflineAppCache({reload:false});await refreshData(true);setNotice('Данные обновлены. Избранное сохранено.');}catch{setNotice('Не удалось обновить данные. Попробуй ещё раз.');}finally{setBusy(false);}};
 return <SafeAreaView edges={['top']} style={f.screen}><View style={f.header}><NativeIconButton name="arrow-back" label="Назад" onPress={()=>navigation.goBack()}/><Text accessibilityRole="header" style={[f.display,{flex:1}]}>Настройки</Text></View><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[f.content,{gap:20,paddingBottom:84+insets.bottom}]}><Text style={f.sectionTitle}>Уведомления</Text><FavoriteNotificationsCard/><Text style={f.sectionTitle}>Режим фестиваля</Text><View style={[f.glass,{padding:15,gap:12}]}><NativeButton label="Текущее время" primary={mode==='real'} onPress={()=>void setMode('real')}/><NativeButton label="Демо фестиваля" primary={mode==='demo'} onPress={()=>void setMode('demo')}/><Text style={f.muted}>{mode==='demo'?demoDescription:'Актуальные данные и время фестиваля.'}</Text></View><Text style={f.sectionTitle}>Данные</Text><NativeButton label="Обновить данные" icon="refresh-outline" busy={busy} onPress={()=>void clear()}/><NativeButton label="Сбросить кэш" icon="trash-outline" disabled={busy} onPress={()=>setReset(true)}/>{notice?<Text accessibilityRole="alert" style={f.muted}>{notice}</Text>:null}<Text style={f.sectionTitle}>Информация</Text><NativeButton label="Правила фестиваля" icon="document-text-outline" onPress={()=>navigation.navigate('FestivalRules')}/><NativeButton label="Политика конфиденциальности" icon="shield-checkmark-outline" onPress={()=>void openExternalUrl(PRIVACY_POLICY_URL)}/></ScrollView><LiquidDialog open={reset} onClose={()=>setReset(false)} title="Сбросить кэш?" description="Артисты и расписание загрузятся заново. Избранное и настройки сохранятся." actions={[{label:'Сбросить',tone:'destructive',onPress:()=>void clear()},{label:'Отмена',onPress:()=>setReset(false)}]}/></SafeAreaView>;
}
