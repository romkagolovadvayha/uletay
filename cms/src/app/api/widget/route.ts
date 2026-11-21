import {getAppData} from '@/lib/app-data';
import {getFestivalWeather} from '@/lib/festival-weather';
import {jsonResponse,optionsResponse} from '@/lib/api-response';
import {buildFestivalWidgetData} from '../../../../../shared/festival-widget';

export const dynamic='force-dynamic';
export async function OPTIONS(){return optionsResponse();}
export async function GET(){
  try{
    const data=await getAppData(),center=data.festivalMap?.center;
    const weather=center?await getFestivalWeather(center.lat,center.lng).catch(()=>null):null;
    const response=jsonResponse(buildFestivalWidgetData(data,weather));
    response.headers.set('Cache-Control','public, max-age=60, stale-while-revalidate=120');
    return response;
  }catch{return jsonResponse({error:'Данные виджета временно недоступны'},503);}
}
