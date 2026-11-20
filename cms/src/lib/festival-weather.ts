import {parseCurrentWeather,type FestivalWeather} from '../../../shared/festival-weather';
type Entry={data?:FestivalWeather;pending?:Promise<FestivalWeather>;retryAfter?:number};
const globalCache=globalThis as typeof globalThis&{uletayWeather?:Map<string,Entry>};
const cache=globalCache.uletayWeather??=new Map<string,Entry>();
export async function getFestivalWeather(latitude:number,longitude:number):Promise<FestivalWeather>{
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw Error('Festival coordinates unavailable');
  const key=`${latitude.toFixed(4)}:${longitude.toFixed(4)}`;let entry=cache.get(key);
  if(!entry){entry={};cache.set(key,entry);if(cache.size>8)cache.delete(cache.keys().next().value!);}
  const now=Date.now();const saved=entry.data;
  if(saved&&now-Date.parse(saved.fetchedAt)<15*60*1000)return saved;
  const stale=()=>{if(saved&&now-Date.parse(saved.observedAt)<3*60*60*1000)return {...saved,stale:true};throw Error('Weather unavailable');};
  if(entry.pending)return entry.pending;
  if((entry.retryAfter??0)>now)return stale();
  const currentEntry=entry;
  currentEntry.pending=(async()=>{
    try{
      const url=new URL('https://api.open-meteo.com/v1/forecast');url.search=new URLSearchParams({latitude:String(latitude),longitude:String(longitude),current:'temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m',wind_speed_unit:'ms',timeformat:'unixtime',timezone:'Europe/Samara'}).toString();
      const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(7000)});if(!response.ok)throw Error('Weather provider unavailable');
      const data=parseCurrentWeather(await response.json(),latitude,longitude);currentEntry.data=data;currentEntry.retryAfter=0;return data;
    }catch{currentEntry.retryAfter=Date.now()+30000;return stale();}
    finally{currentEntry.pending=undefined;}
  })();
  return currentEntry.pending;
}
