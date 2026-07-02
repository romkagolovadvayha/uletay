'use client';

type DeleteButtonProps = {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  label?: string;
};

export function DeleteButton({ action, id, label = 'Удалить' }: DeleteButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm('Удалить эту запись?')) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn-danger btn-sm">
        {label}
      </button>
    </form>
  );
}
