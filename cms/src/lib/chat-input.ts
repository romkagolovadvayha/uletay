export const CHAT_MAX_LENGTH = 2000;
export function normalizeChatText(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Напишите сообщение');
  const text = value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (!text || [...text].length > CHAT_MAX_LENGTH) throw new Error(`Сообщение должно содержать от 1 до ${CHAT_MAX_LENGTH} символов`);
  return text;
}
export function chatId(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if ((typeof value!=='number'&&typeof value!=='string') || (typeof value==='string'&&!/^[1-9][0-9]*$/.test(value)))throw new Error('Неверный номер сообщения');
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Неверный номер сообщения');
  return id;
}
export function chatRequestId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{16,64}$/.test(value)) throw new Error('Неверный идентификатор отправки');
  return value;
}
