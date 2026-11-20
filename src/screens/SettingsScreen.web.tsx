import React, { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MoreStackParamList } from '../navigation/types';
import { useDemoMode } from '../context/DemoModeContext';
import { useAppData } from '../context/DataContext';
import { clearOfflineAppCache } from '../utils/clearOfflineAppCache';
import { FavoriteNotificationsCard } from '../components/FavoriteNotificationsCard';
import { FestivalIcon } from '../components/FestivalIcon.web';
import { LiquidDialog } from '../components/LiquidDialog';
import { PRIVACY_POLICY_URL } from '../constants/legal';
export function SettingsScreen({navigation}:NativeStackScreenProps<MoreStackParamList,'Settings'>) {
  const {mode,ready,setMode,demoDescription}=useDemoMode();const {refreshData}=useAppData();
  const [panel,setPanel]=useState<'time'|'notifications'|null>(null);const [reset,setReset]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const clear=async()=>{if(busy)return;setBusy(true);try{await clearOfflineAppCache();await refreshData();setMessage('Данные загружены заново. Избранное сохранено.');setReset(false);}catch{setMessage('Не удалось обновить данные. Проверьте соединение и повторите.');}finally{setBusy(false);}};
  return <section className="fest-screen"><div className="fest-inner" style={{maxWidth:820}}><header className="fest-heading"><h1>Настройки</h1><button type="button" className="fest-icon" aria-label="Назад" onClick={()=>navigation.goBack()}><FestivalIcon name="back"/></button></header>
    <button type="button" className="fest-chat-banner" aria-haspopup="dialog" onClick={()=>setPanel('notifications')}><FestivalIcon name="bell"/><div><h2>Не пропустить</h2><p>Напоминания о событиях и уведомления</p></div></button>
    <button type="button" className="fest-chat-banner" aria-haspopup="dialog" onClick={()=>setPanel('time')}><FestivalIcon name="calendar"/><div><h2>Режим времени</h2><p>{mode==='demo'?`Демо · ${demoDescription}`:'Текущие дата и время'}</p></div></button>
    <button type="button" className="fest-chat-banner" aria-haspopup="dialog" disabled={busy} onClick={()=>setReset(true)}><FestivalIcon name="settings"/><div><h2>Обновить данные</h2><p>Сбросить офлайн-кэш и загрузить содержимое заново</p></div></button>
    {message?<p className="fest-notice" role="status">{message}</p>:null}
    <button type="button" className="fest-chat-banner" onClick={()=>navigation.navigate('FestivalRules')}><FestivalIcon name="check"/><div><h2>Правила фестиваля</h2><p>Безопасность и бытовая информация</p></div></button>
    <a className="fest-chat-banner" href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer"><FestivalIcon name="heart"/><div><h2>Конфиденциальность</h2><p>Обработка данных и контакты для обращений</p></div></a>
  </div><LiquidDialog open={panel!==null} onClose={()=>setPanel(null)} title={panel==='time'?'Режим времени':'Оповещения'} variant="sheet">{panel==='notifications'?<FavoriteNotificationsCard/>:<div className="fest-filter-section"><p className="fest-muted">Реальное время устройства или демонстрация фестивального дня.</p><div className="fest-scroll-pills" style={{marginTop:20}}><button type="button" className="fest-pill" disabled={!ready} aria-pressed={mode==='real'} onClick={()=>void setMode('real')}>Реальный</button><button type="button" className="fest-pill" disabled={!ready} aria-pressed={mode==='demo'} onClick={()=>void setMode('demo')}>Демо</button></div><p className="fest-muted">{demoDescription}</p></div>}</LiquidDialog>
    <LiquidDialog open={reset} onClose={()=>{if(!busy)setReset(false);}} title="Обновить данные?" description="Избранное и настройки уведомлений сохранятся." actions={[{label:'Отмена',disabled:busy,onPress:()=>setReset(false)},{label:busy?'Обновляем…':'Обновить',tone:'primary',disabled:busy,onPress:()=>void clear()}]}/></section>;
}
