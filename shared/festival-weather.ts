export type WeatherKind='clear'|'partly'|'cloudy'|'fog'|'drizzle'|'rain'|'sleet'|'snow'|'thunder';
export type FestivalWeather={temperature:number;feelsLike:number;wind:number;code:number;isDay:boolean;observedAt:string;fetchedAt:string;latitude:number;longitude:number;stale:boolean};
export function weatherDescription(code:number,isDay=true):{kind:WeatherKind;label:string}{
  if(code===0)return {kind:'clear',label:isDay?'Ясно':'Ясная ночь'};
  if(code===1||code===2)return {kind:'partly',label:code===1?'Преимущественно ясно':'Переменная облачность'};
  if(code===3)return {kind:'cloudy',label:'Пасмурно'};
  if(code===45||code===48)return {kind:'fog',label:'Туман'};
  if([51,53,55].includes(code))return {kind:'drizzle',label:'Морось'};
  if([56,57,66,67].includes(code))return {kind:'sleet',label:'Ледяной дождь'};
  if([61,63,65,80,81,82].includes(code))return {kind:'rain',label:[65,82].includes(code)?'Сильный дождь':'Дождь'};
  if([71,73,75,77,85,86].includes(code))return {kind:'snow',label:[75,86].includes(code)?'Сильный снег':'Снег'};
  if([95,96,97,99].includes(code))return {kind:'thunder',label:'Гроза'};
  return {kind:'cloudy',label:'Облачно'};
}
export function formatTemperature(value:number){const rounded=Math.round(value);return `${rounded>0?'+':''}${Object.is(rounded,-0)?0:rounded}°`;}
export function parseCurrentWeather(value:unknown,latitude:number,longitude:number,now=Date.now()):FestivalWeather{
  const current=(value as {current?:Record<string,unknown>})?.current;
  const finite=(key:string,min:number,max:number)=>typeof current?.[key]==='number'&&Number.isFinite(current[key])&&current[key]>=min&&current[key]<=max;
  if(!finite('temperature_2m',-100,70)||!finite('apparent_temperature',-120,90)||!finite('wind_speed_10m',0,150)||!finite('weather_code',0,99)||!Number.isInteger(current?.weather_code)||!finite('time',1,1e12)||typeof current?.is_day!=='number'||![0,1].includes(current.is_day))throw Error('Invalid weather response');
  const timestamp=Number(current!.time)*1000;
  if(Math.abs(now-timestamp)>3*60*60*1000)throw Error('Weather is out of date');
  return {temperature:Number(current!.temperature_2m),feelsLike:Number(current!.apparent_temperature),wind:Number(current!.wind_speed_10m),code:Number(current!.weather_code),isDay:current!.is_day===1,observedAt:new Date(timestamp).toISOString(),fetchedAt:new Date(now).toISOString(),latitude,longitude,stale:false};
}
export function isFestivalWeather(value:unknown):value is FestivalWeather{
  if(!value||typeof value!=='object')return false;const row=value as FestivalWeather;
  return ['temperature','feelsLike','wind','code','latitude','longitude'].every(key=>typeof row[key as keyof FestivalWeather]==='number'&&Number.isFinite(row[key as keyof FestivalWeather]))&&Math.abs(row.temperature)<=100&&Math.abs(row.latitude)<=90&&Math.abs(row.longitude)<=180&&typeof row.isDay==='boolean'&&typeof row.stale==='boolean'&&Number.isFinite(Date.parse(row.observedAt))&&Number.isFinite(Date.parse(row.fetchedAt));
}
