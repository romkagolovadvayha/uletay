import type { AppData, SchedulePerformance } from '../types';
import { getHeadlinerYears } from '../utils/headlinerYears';
import { sortHeadlinersByPopularity } from '../../shared/headliner-popularity';

export type FestivalHomeModel = {
  festival: AppData['festival'];
  center?: { latitude: number; longitude: number };
  hasCurrent: boolean;
  lineupYear: number;
  heroImageUrl?: string;
  artists: { id: string; name: string; imageUrl?: string; genres?: string[] }[];
  schedule: SchedulePerformance[];
};
export type FestivalHomeAction = {type:'lineup';year:number;search?:boolean} | {type:'artist';id:string} | {type:'schedule'};

/** Both native and web use the same six featured artists and festival dates. */
export function buildFestivalHomeModel(data: AppData, resolveMedia: (path?:string)=>string|undefined = path=>path): FestivalHomeModel {
  const hasCurrent = data.headliners.some(artist => artist.years.includes(data.festival.year));
  const lineupYear = hasCurrent ? data.festival.year : getHeadlinerYears(data.headliners).find(year=>year<data.festival.year) ?? data.festival.year;
  const artists = sortHeadlinersByPopularity(data.headliners.filter(artist=>artist.years.includes(lineupYear))).slice(0,6)
    .map(({id,name,imageUrl,genres})=>({id,name,imageUrl:resolveMedia(imageUrl),genres}));
  const center = data.festivalMap?.center;
  return {festival:data.festival,hasCurrent,lineupYear,artists,heroImageUrl:resolveMedia(data.festival.heroImageUrl),
    center:center?{latitude:center.lat,longitude:center.lng}:undefined,
    schedule:data.schedule.filter(item=>item.date>=data.festival.startDate&&item.date<=data.festival.endDate)};
}
