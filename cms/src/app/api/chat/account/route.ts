import {chatFailure,chatResponse,ChatError,currentChatUser,getChatSession,requireChatUser} from '@/lib/chat';
import {getPool} from '@/lib/db';
export const dynamic='force-dynamic';
async function removeAccount(request:Request){
  const user=await requireChatUser(request),db=await getPool().getConnection();
  try{await db.beginTransaction();
    await db.execute('DELETE r FROM chat_reports r LEFT JOIN chat_messages m ON m.id=r.message_id WHERE r.user_id=? OR m.user_id=?',[user.id,user.id]);
    await db.execute("INSERT INTO chat_users(vk_id,display_name,is_active) VALUES('deleted-profile','Удалённый участник',FALSE) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)");
    const [anonymous]=await db.query<import('mysql2').RowDataPacket[]>("SELECT id FROM chat_users WHERE vk_id='deleted-profile'");
    // Keep only anonymous deletion markers so polling clients also erase text.
    await db.execute('UPDATE chat_messages SET body=?,reply_to=NULL,user_id=?,deleted_at=NOW() WHERE user_id=?',['',anonymous[0].id,user.id]);
    await db.execute('DELETE FROM artist_wish_votes WHERE user_id=?',[user.id]);
    await db.execute('DELETE FROM chat_sessions WHERE user_id=?',[user.id]);
    await db.execute('DELETE FROM chat_users WHERE id=?',[user.id]);
    await db.commit();(await getChatSession()).destroy();return chatResponse({ok:true});
  }catch(error){await db.rollback();throw error;}finally{db.release();}
}
export async function DELETE(request:Request){try{return await removeAccount(request);}catch(error){return chatFailure(error);}}
const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export async function GET(){try{
  const user=await currentChatUser(),session=await getChatSession();
  const html=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Удаление аккаунта — Улетай</title><style>body{margin:0;padding:48px 20px;font:16px/1.6 system-ui;background:#210817;color:#f7eef5}main{max-width:560px;margin:auto}h1{font-size:32px}a{color:#ffda00}button{background:#ffda00;border:0;border-radius:24px;padding:16px 24px;font:inherit;font-weight:700;color:#210817;cursor:pointer}label{display:block;margin:24px 0}</style><main><h1>Удаление аккаунта Улетай</h1><p>Удаляются профиль в приложении, имя и аватар из VK, сообщения, голоса и все сеансы входа. Аккаунт ВКонтакте не удаляется. Повторный вход создаст новый профиль.</p>${user?`<p>Вы вошли как <strong>${escape(user.name)}</strong>.</p><form method="post"><input type="hidden" name="csrf" value="${escape(session.csrf||'')}"><label><input type="checkbox" name="confirm" value="delete" required> Хочу удалить свой профиль и данные Улетая без возможности восстановления</label><button type="submit">Удалить мой профиль и данные</button></form>`:'<p>Подтвердите, что профиль принадлежит вам: <a href="/api/chat/auth/vk">Войти через VK</a>, затем откройте эту страницу снова. Также удаление доступно в приложении: Общий чат → Мой профиль → Удалить профиль и данные.</p>'}<p><a href="/chat">Общий чат</a> · <a href="/privacy">Конфиденциальность</a></p></main></html>`;
  return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
}catch(error){return chatFailure(error);}}
export async function POST(request:Request){try{
  const form=await request.formData();if(form.get('confirm')!=='delete')throw new ChatError('Подтвердите удаление');
  const headers=new Headers(request.headers);headers.set('X-Chat-CSRF',String(form.get('csrf')||''));
  await removeAccount(new Request(request,{headers}));
  return new Response('<!doctype html><html lang="ru"><meta charset="utf-8"><title>Улетай — профиль удалён</title><h1>Профиль и данные Улетая удалены</h1><p>Ваш аккаунт ВКонтакте сохранён.</p><a href="/">На главную</a></html>',{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}catch(error){return chatFailure(error);}}
