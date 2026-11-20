import type {RowDataPacket} from 'mysql2';
import {getPool} from '@/lib/db';
import {jsonResponse,optionsResponse} from '@/lib/api-response';
import {safeNotificationPath} from '../../../../../shared/notification-feed';
export const dynamic='force-dynamic';
export async function OPTIONS(){return optionsResponse();}
export async function GET(){
  try{
    // Only public web/all announcements; delivery errors, accounts and tokens never leave the CMS.
    const [rows]=await getPool().query<RowDataPacket[]>("SELECT id,title,body,target_path,created_at FROM push_broadcasts WHERE audience IN ('all','web') ORDER BY id DESC LIMIT 50");
    const items=rows.map(row=>({id:`news-${row.id}`,title:row.title,body:row.body,url:safeNotificationPath(row.target_path),createdAt:new Date(row.created_at).toISOString()}));
    const response=jsonResponse({items});response.headers.set('Cache-Control','public, max-age=30');return response;
  }catch{return jsonResponse({error:'Не удалось загрузить уведомления'},503);}
}
