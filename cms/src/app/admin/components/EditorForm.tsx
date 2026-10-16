'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { AdminIcon } from './AdminIcon';

const DirtyContext = createContext(false);
export const useEditorDirty = () => useContext(DirtyContext);
const EditorChangeContext = createContext<() => void>(() => {});
export const useEditorChange = () => useContext(EditorChangeContext);

export function EditorForm({ children, ...props }: ComponentProps<'form'>) {
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const markDirty = () => {
    dirtyRef.current = true;
    setDirty(true);
  };
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    }
    function navigate(event: MouseEvent) {
      const link = (event.target as Element).closest?.('a[href]');
      if (
        !dirtyRef.current ||
        !(link instanceof HTMLAnchorElement) ||
        link.target === '_blank' ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      const url = new URL(link.href);
      if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
      if (!confirm('Есть несохранённые изменения. Выйти без сохранения?')) {
        event.preventDefault();
        event.stopPropagation();
      } else {
        dirtyRef.current = false;
      }
    }
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', navigate, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', navigate, true);
    };
  }, []);
  return (
    <DirtyContext.Provider value={dirty}>
      <EditorChangeContext.Provider value={markDirty}>
        <form
          {...props}
          onChangeCapture={(event) => {
            if (!(event.target as HTMLElement).closest('[data-no-dirty]')) markDirty();
          }}
          onSubmitCapture={() => {
            dirtyRef.current = false;
          }}
          onReset={() => {
            dirtyRef.current = false;
            setDirty(false);
          }}
        >
          {children}
        </form>
      </EditorChangeContext.Provider>
    </DirtyContext.Provider>
  );
}

export function SubmitButton({
  children = 'Сохранить изменения',
  className = 'btn-primary',
  pendingLabel = 'Сохраняем…',
}: {
  children?: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function SaveBar({
  cancelHref,
  label = 'Сохранить изменения',
}: {
  cancelHref?: string;
  label?: string;
}) {
  const dirty = useContext(DirtyContext);
  const { pending } = useFormStatus();
  return (
    <div className="editor-savebar">
      <span className={dirty ? 'save-status is-dirty' : 'save-status'} role="status">
        <AdminIcon name={dirty ? 'festival' : 'check'} size={17} />
        {pending
          ? 'Сохраняем изменения…'
          : dirty
            ? 'Есть несохранённые изменения'
            : 'Изменения появятся после сохранения'}
      </span>
      <div>
        {cancelHref && (
          <Link href={cancelHref} className="btn-secondary">
            Отмена
          </Link>
        )}
        <SubmitButton>{label}</SubmitButton>
      </div>
    </div>
  );
}
