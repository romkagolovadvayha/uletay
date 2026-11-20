'use client';

import { useFormStatus } from 'react-dom';
import { AdminIcon } from './AdminIcon';

export function ArtistFestivalButton({ year, participating }: { year: number; participating: boolean }) {
  const { pending, data } = useFormStatus();
  const announcing = pending && data?.get('_intent') === 'announce-artist';
  return <button type="submit" name="_intent" value="announce-artist"
    className={participating ? 'btn-secondary artist-festival-button is-announced' : 'btn-primary artist-festival-button'}
    disabled={pending || participating} aria-busy={announcing}
    title={participating ? 'Артист уже добавлен. Повторная рассылка не нужна.' : 'Сохранить карточку, добавить год участия и отправить push всем подписчикам'}>
    <AdminIcon name={participating ? 'check' : 'bell'} size={18}/>
    {announcing ? 'Сохраняем и объявляем…' : participating ? `В лайн-апе ${year}` : `Будет на фестивале ${year}`}
  </button>;
}
