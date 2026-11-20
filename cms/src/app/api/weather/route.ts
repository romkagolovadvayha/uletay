import {getAppData} from '@/lib/app-data';
import {getFestivalWeather} from '@/lib/festival-weather';
import {jsonResponse,optionsResponse} from '@/lib/api-response';
export const dynamic='force-dynamic';
export async function OPTIONS(){return optionsResponse();}
export async function GET(){
  try{const center=(await getAppData()).festivalMap?.center;if(!center)throw Error('No festival coordinates');const data=await getFestivalWeather(center.lat,center.lng);const response=jsonResponse(data);response.headers.set('Cache-Control','public, max-age=60');return response;}
  catch{return jsonResponse({error:'Погода временно недоступна'},503);}
}
