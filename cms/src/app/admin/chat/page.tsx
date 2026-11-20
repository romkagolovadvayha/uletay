import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { RowDataPacket } from 'mysql2';
import { requireAdminSession } from '@/lib/session';
import { getPool } from '@/lib/db';
import { chatId } from '@/lib/chat-input';
import { publishChatEvent } from '@/lib/chat-events';
export const dynamic='force-dynamic';
async function moderate(form:FormData) {
  'use server';
  await requireAdminSession();const id=chatId(form.get('id'));if(!id)return;
  if(form.get('action')==='block'){
    await getPool().execute('UPDATE chat_users SET is_active=FALSE WHERE id=(SELECT user_id FROM chat_messages WHERE id=?)',[id]);
    await getPool().execute('DELETE FROM chat_sessions WHERE user_id=(SELECT user_id FROM chat_messages WHERE id=?)',[id]);
  }else{await getPool().execute("UPDATE chat_messages SET body='',deleted_at=NOW() WHERE id=?",[id]);publishChatEvent({type:'removed',id});}
  revalidatePath('/admin/chat');
}
export default async function ChatModeration() {
  try{await requireAdminSession();}catch{redirect('/admin/login');}
  const [rows]=await getPool().query<RowDataPacket[]>('SELECT m.id,m.body,m.created_at,m.deleted_at,u.display_name,u.is_active,(SELECT COUNT(*) FROM chat_reports r WHERE r.message_id=m.id) AS reports FROM chat_messages m JOIN chat_users u ON u.id=m.user_id ORDER BY reports DESC,m.id DESC LIMIT 100');
  return <main style={{maxWidth:960,margin:'40px auto',padding:24}}><a href="/admin">Вернуться в админку</a><h1>Чат фестиваля</h1><p>Последние 100 сообщений. Сообщения с жалобами показаны первыми.</p>{rows.length===0?<p>Сообщений пока нет.</p>:rows.map(row=><article key={row.id} style={{padding:'20px 0',borderBottom:'1px solid #777'}}><strong>{row.display_name}</strong> · {new Date(row.created_at).toLocaleString('ru-RU')}{row.reports>0?<p>Жалоб: {row.reports}</p>:null}<p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.deleted_at?'Сообщение удалено':row.body}</p><form action={moderate}><input type="hidden" name="id" value={row.id}/>{!row.deleted_at?<button name="action" value="delete">Удалить сообщение</button>:null}{row.is_active?<button name="action" value="block" style={{marginLeft:16}}>Ограничить доступ автора</button>:<span>Автор заблокирован</span>}</form></article>)}</main>;
}
