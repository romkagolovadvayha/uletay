import React,{useEffect,useState} from 'react';
import {apiFetch} from '../api/apiFetch';
import {LiquidDialog} from './LiquidDialog';
import {WeatherIllustration} from './WeatherIllustration.web';
import {formatTemperature,isFestivalWeather,weatherDescription,type FestivalWeather as Weather} from '../../shared/festival-weather';

const MAX_AGE=3*60*60*1000;
function cachedWeather(key:string){try{const value=JSON.parse(localStorage.getItem(key)||'null');return isFestivalWeather(value)&&Date.now()-Date.parse(value.observedAt)<MAX_AGE?value:null;}catch{return null;}}
export function FestivalWeather({place,latitude,longitude,focused=true,onExternalLink,loadWeather}:{place:string;latitude?:number;longitude?:number;focused?:boolean;onExternalLink?:(url:string)=>Promise<void>;loadWeather?:()=>Promise<Weather>}){
  const key=`uletay-weather:${latitude?.toFixed(4)}:${longitude?.toFixed(4)}`;
  const [weather,setWeather]=useState<Weather|null>(()=>cachedWeather(key));const [loading,setLoading]=useState(true);const [error,setError]=useState(false);const [open,setOpen]=useState(false);const [reload,setReload]=useState(0);
  const [clock,setClock]=useState(Date.now);
  useEffect(()=>{const update=()=>setClock(Date.now());const timer=setInterval(update,60000);document.addEventListener('visibilitychange',update);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update);};},[]);
  useEffect(()=>{
    if(!focused)return;const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;let running=false;
    const refresh=async()=>{if(running||document.hidden||controller.signal.aborted)return;running=true;
      try{const value=await (loadWeather?loadWeather():(async()=>{const response=await apiFetch('/weather',{headers:{Accept:'application/json'},signal:controller.signal},10000);if(!response.ok)throw Error('Weather unavailable');return response.json();})());if(!isFestivalWeather(value)||Math.abs((latitude??value.latitude)-value.latitude)>.02||Math.abs((longitude??value.longitude)-value.longitude)>.02)throw Error('Invalid weather');if(controller.signal.aborted)return;setWeather(value);setError(false);try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
      catch{if(!controller.signal.aborted)setError(true);}
      finally{running=false;if(!controller.signal.aborted){setClock(Date.now());setLoading(false);timer=setTimeout(()=>void refresh(),15*60*1000);}}
    };
    void refresh();const wake=()=>{if(!document.hidden&&!running){if(timer)clearTimeout(timer);void refresh();}};
    window.addEventListener('online',wake);document.addEventListener('visibilitychange',wake);return()=>{controller.abort();if(timer)clearTimeout(timer);window.removeEventListener('online',wake);document.removeEventListener('visibilitychange',wake);};
  },[focused,key,latitude,longitude,reload,loadWeather]);
  const usable=weather&&clock-Date.parse(weather.observedAt)<MAX_AGE?weather:null;
  const description=usable?weatherDescription(usable.code,usable.isDay):null;
  const stale=!!usable&&(error||usable.stale||clock-Date.parse(usable.fetchedAt)>20*60*1000);
  const retry=()=>{setLoading(true);setReload(value=>value+1);};
  return <>
    <button className="fest-weather" type="button" aria-haspopup="dialog" aria-label={`Погода в ${place}: ${usable?`${stale?'сохранённые данные, ':''}${formatTemperature(usable.temperature)}, ${description?.label}`:loading?'загружается':'данные недоступны'}`} onClick={()=>setOpen(true)}>
      <span className="fest-weather-value"><strong>{usable?formatTemperature(usable.temperature):'—°'}</strong></span>
      {description?<WeatherIllustration kind={description.kind} isDay={usable!.isDay} size={35.2}/>:<span className="fest-weather-placeholder" aria-hidden="true">{loading?'···':'—'}</span>}
    </button>
    <LiquidDialog open={open} onClose={()=>setOpen(false)} title={`Погода · ${place}`} variant="sheet">
      {usable&&description?<><div className="fest-weather-details"><WeatherIllustration kind={description.kind} isDay={usable.isDay} size={108}/><strong>{formatTemperature(usable.temperature)}</strong><h3>{description.label}</h3></div><div className="fest-weather-facts"><p>Ощущается как <strong>{formatTemperature(usable.feelsLike)}</strong></p><p>Ветер <strong>{Math.round(usable.wind)} м/с</strong></p></div><p className="fest-muted">{stale?'Сохранённые данные · ':''}{new Date(usable.observedAt).toLocaleString('ru-RU',{timeZone:'Europe/Samara',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p></>:<div className="fest-empty" role="status"><h3>{loading?'Получаем погоду…':'Погода недоступна'}</h3><p className="fest-muted">{loading?'Сейчас на площадке фестиваля':'Проверьте соединение и попробуйте ещё раз.'}</p></div>}
      {error||stale?<button type="button" className="fest-pill" disabled={loading} onClick={retry}>{loading?'Обновляем…':'Обновить погоду'}</button>:null}
      <p className="fest-weather-source">Погодные данные: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" onClick={onExternalLink?event=>{event.preventDefault();void onExternalLink('https://open-meteo.com/');}:undefined}>Open-Meteo</a></p>
    </LiquidDialog>
  </>;
}
