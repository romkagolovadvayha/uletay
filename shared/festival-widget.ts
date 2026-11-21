import type {AppData} from '../src/types';
import type {FestivalWeather} from './festival-weather';
import {addDaysToDateString, parseFestivalLocalDateTime} from '../src/utils/festivalTime';

export type WidgetPerformance={id:string;artist:string;stage:string;startAt:string;endAt:string;url:string};
export type FestivalWidgetData={
  schemaVersion:1;updatedAt:string;year:number;startAt:string;endAt:string;location:string;
  performances:WidgetPerformance[];weather:FestivalWeather|null;
};

/** Public, compact data for WidgetKit. No accounts, chat, map or music payload. */
export function buildFestivalWidgetData(data:AppData,weather:FestivalWeather|null,now=new Date()):FestivalWidgetData{
  const {festival}=data;
  const festivalStart=parseFestivalLocalDateTime(festival.startDate,'12:00');
  const festivalEnd=parseFestivalLocalDateTime(addDaysToDateString(festival.endDate,1),'04:00');
  const performances=data.schedule.flatMap(item=>{
    const start=parseFestivalLocalDateTime(item.date,item.startTime);
    let end=parseFestivalLocalDateTime(item.date,item.endTime);
    if(end<=start)end=parseFestivalLocalDateTime(addDaysToDateString(item.date,1),item.endTime);
    if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||start<festivalStart||start>=festivalEnd||end<=now)return [];
    const artist=data.headliners.find(row=>row.id===item.headlinerId);
    return [{id:item.id,artist:artist?.name||item.artist,
      stage:data.stages.find(row=>row.id===item.stageId)?.shortName||item.stageId,
      startAt:start.toISOString(),endAt:end.toISOString(),url:`uletay://headliners/${encodeURIComponent(item.headlinerId)}`}];
  }).sort((a,b)=>a.startAt.localeCompare(b.startAt)||a.id.localeCompare(b.id));
  return {schemaVersion:1,updatedAt:now.toISOString(),year:festival.year,startAt:festivalStart.toISOString(),endAt:festivalEnd.toISOString(),location:festival.locationShort,performances,weather};
}
