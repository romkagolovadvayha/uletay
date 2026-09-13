'use client';

import { useEffect, useRef, useState } from 'react';
import { useLatestRef } from '@/hooks/useLatestRef';

export function MapLeaveGuard({ dirty }: { dirty: boolean }) {
  const current = useLatestRef(dirty);
  const allowExit = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const pendingForm = useRef<{ form: HTMLFormElement; submitter: HTMLElement | null } | null>(null);
  const [destination, setDestination] = useState('');
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (current.current && !allowExit.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.('a[href]');
      if (
        !current.current || allowExit.current ||
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target === '_blank' ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      const next = new URL(anchor.href);
      if (
        next.origin === location.origin &&
        next.pathname === location.pathname &&
        next.search === location.search &&
        next.hash
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      pendingForm.current = null;
      setDestination(anchor.href);
      dialog.current?.showModal();
    };
    const submit = (event: SubmitEvent) => {
      const form = event.target;
      if (!current.current || allowExit.current || !(form instanceof HTMLFormElement) || form.matches('.map-draw-save')) return;
      event.preventDefault(); event.stopPropagation();
      pendingForm.current = { form, submitter: event.submitter };
      setDestination(''); dialog.current?.showModal();
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', navigate, true);
    document.addEventListener('submit', submit, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', navigate, true);
      document.removeEventListener('submit', submit, true);
    };
  }, [current]);
  return (
    <dialog ref={dialog} className="map-leave-dialog" aria-labelledby="map-leave-title">
      <h3 id="map-leave-title">Карта ещё не сохранена</h3>
      <p>Сохраните изменения, чтобы они появились у гостей фестиваля.</p>
      <div>
        <button type="button" className="btn-primary" onClick={() => dialog.current?.close()}>
          Продолжить редактирование
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            allowExit.current = true;
            if (pendingForm.current) {
              const { form, submitter } = pendingForm.current;
              dialog.current?.close();
              form.requestSubmit(submitter);
            } else location.assign(destination);
          }}
        >
          {destination ? 'Выйти без сохранения' : 'Продолжить без сохранения карты'}
        </button>
      </div>
    </dialog>
  );
}
