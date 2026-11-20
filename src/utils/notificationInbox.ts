import AsyncStorage from '@react-native-async-storage/async-storage';
import {readNotificationEntries,type FestivalNotification} from '../../shared/notification-feed';
const KEY='@uletay_notification_inbox_v1';let memory:FestivalNotification[]|null=null;let hydration:Promise<FestivalNotification[]>|null=null;let writes=Promise.resolve();
const listeners=new Set<(rows:FestivalNotification[])=>void>();
export function readNotificationInbox(){
  if(memory)return Promise.resolve(memory);
  if(!hydration)hydration=AsyncStorage.getItem(KEY).then(raw=>memory=readNotificationEntries(raw?JSON.parse(raw):[])).catch(()=>memory=[]);
  return hydration;
}
export function subscribeNotificationInbox(listener:(rows:FestivalNotification[])=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
export async function appendNotificationInbox(item:{id:string;title:string;body:string;url:string}){
  const rows=await readNotificationInbox();if(rows.some(row=>row.id===item.id))return;
  memory=readNotificationEntries([{...item,createdAt:new Date().toISOString()},...rows]).slice(0,100);for(const listener of listeners)listener(memory);
  const json=JSON.stringify(memory);writes=writes.catch(()=>{}).then(()=>AsyncStorage.setItem(KEY,json));await writes;
}
