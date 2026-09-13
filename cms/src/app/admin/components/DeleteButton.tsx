'use client';

import { ContentRevision } from './ContentRevision';
import { AdminIcon } from './AdminIcon';
import { SubmitButton } from './EditorForm';

type DeleteButtonProps = {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  label?: string;
  recordName?: string;
};

export function DeleteButton({ action, id, label = 'Удалить', recordName }: DeleteButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !confirm(
            recordName
              ? `Удалить «${recordName}»? Это действие нельзя отменить.`
              : 'Удалить эту запись? Это действие нельзя отменить.',
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton className="btn-danger btn-sm" pendingLabel="Удаляем…">
        <AdminIcon name="close" size={16} />
        {label}
      </SubmitButton>
      <ContentRevision />
    </form>
  );
}
