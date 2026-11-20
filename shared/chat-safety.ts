export const CHAT_BLOCKED_KEY='uletay.chat.hidden-users.v1';
export function readBlockedUsers(value:string|null):number[]{
  try{const rows=JSON.parse(value||'[]');return Array.isArray(rows)?[...new Set(rows.filter((id:unknown):id is number=>typeof id==='number'&&Number.isSafeInteger(id)&&id>0))].slice(0,2000):[];}catch{return [];}
}
export function visibleChatMessages<T extends {userId:number;reply?:{userId?:number}|null}>(messages:T[],blocked:number[]):T[]{
  if(!blocked.length)return messages;const ids=new Set(blocked);
  return messages.filter(message=>!ids.has(message.userId)).map(message=>message.reply?.userId&&ids.has(message.reply.userId)?{...message,reply:null}:message);
}
