'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AdminIcon } from './AdminIcon';
import { useEditorChange } from './EditorForm';

type Props = {
  accept?: string;
  aspect?: 'hero' | 'logo' | 'square';
  currentSrc?: string;
  currentValue?: string | null;
  fileName?: string;
  hint: string;
  label: string;
  removeName?: string;
  valueName?: string;
};

export function AdminImageUpload({
  accept = 'image/jpeg,image/png,image/webp',
  aspect = 'square',
  currentSrc,
  currentValue,
  fileName = 'file',
  hint,
  label,
  removeName = 'removeImage',
  valueName = 'imageUrl',
}: Props) {
  const inputId = useId();
  const markDirty = useEditorChange();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(currentSrc);
  const [selectedName, setSelectedName] = useState<string>();
  const [removed, setRemoved] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function selectFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    markDirty();
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setSelectedName(file.name);
    setRemoved(false);

    const transfer = new DataTransfer();
    transfer.items.add(file);
    if (inputRef.current) inputRef.current.files = transfer.files;
  }

  function removeImage() {
    markDirty();
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(undefined);
    setSelectedName(undefined);
    setRemoved(true);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="image-field">
      <div className="image-field-heading">
        <div>
          <strong>{label}</strong>
          <span>{hint}</span>
        </div>
        {preview ? <span className="image-status">Загружено</span> : null}
      </div>

      <input name={valueName} type="hidden" value={removed ? '' : currentValue ?? ''} />
      <input name={removeName} type="hidden" value={removed ? '1' : '0'} />
      <input
        accept={accept}
        className="visually-hidden"
        id={inputId}
        name={fileName}
        onChange={(event) => selectFile(event.target.files?.[0])}
        ref={inputRef}
        type="file"
      />

      <div
        className={[
          'image-dropzone',
          `image-dropzone--${aspect}`,
          preview ? 'has-image' : '',
          dragging ? 'is-dragging' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget === event.target) setDragging(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          selectFile(event.dataTransfer.files?.[0]);
        }}
      >
        {preview ? (
          <img alt={`Предпросмотр: ${label}`} src={preview} />
        ) : (
          <label className="image-empty" htmlFor={inputId}>
            <span className="image-upload-icon">
              <AdminIcon name="upload" size={24} />
            </span>
            <strong>Перетащите изображение сюда</strong>
            <span>или нажмите, чтобы выбрать файл</span>
          </label>
        )}
      </div>

      {selectedName ? <p className="image-selected-name">Выбран файл: {selectedName}</p> : null}

      <div className="image-actions">
        <label className={preview ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'} htmlFor={inputId}>
          {preview ? 'Заменить' : 'Выбрать файл'}
        </label>
        {preview ? (
          <button className="btn-ghost-danger btn-sm" onClick={removeImage} type="button">
            Удалить
          </button>
        ) : null}
      </div>
    </div>
  );
}
