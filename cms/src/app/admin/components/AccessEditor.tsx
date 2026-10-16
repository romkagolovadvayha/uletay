import { grantVkAccessAction, revokeVkAccessAction } from '../auth-actions';
import { listAdmins } from '@/lib/admin-access';
import { vkAuthConfigured } from '@/lib/vk-auth';
import { SubmitButton } from './EditorForm';

export async function AccessEditor() {
  const users = await listAdmins();
  return (
    <div className="access-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Предоставить доступ</h2>
            <p>Добавьте VK ID участника команды. После этого он сможет войти через VK.</p>
          </div>
        </div>
        {!vkAuthConfigured() && (
          <p className="warning">
            Вход через VK пока не настроен. Укажите VK_APP_ID и VK_REDIRECT_URI в настройках
            сервера.
          </p>
        )}
        <form action={grantVkAccessAction} className="access-form">
          <label>
            VK ID
            <input
              name="vkId"
              inputMode="numeric"
              pattern="[1-9][0-9]{0,19}"
              maxLength={20}
              placeholder="123456789"
              required
            />
            <span className="hint">
              Число из адреса vk.com/id123456789. Короткое имя страницы не подходит.
            </span>
          </label>
          <label>
            Имя в команде
            <input
              name="displayName"
              maxLength={120}
              placeholder="Имя и фамилия"
              autoComplete="off"
            />
          </label>
          <SubmitButton pendingLabel="Добавляем…">Предоставить доступ</SubmitButton>
          <p className="hint">
            Участник сможет редактировать контент и отправлять уведомления. Управлять доступами
            может только владелец.
          </p>
        </form>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Команда</h2>
            <p>Отзыв доступа сразу закрывает все активные сессии участника.</p>
          </div>
          <span className="count-badge">{users.filter((user) => user.active).length}</span>
        </div>
        <ul className="access-list">
          {users.map((user) => (
            <li key={user.id}>
              <div>
                <strong>{user.displayName}</strong>
                <small>
                  {user.vkId ? `VK ID ${user.vkId}` : `Логин: ${user.username}`} ·{' '}
                  {user.role === 'owner' ? 'Владелец' : 'Администратор'}
                </small>
                <span className={user.active ? 'access-status' : 'hint'}>
                  {user.active ? 'Доступ открыт' : 'Доступ отозван'}
                </span>
              </div>
              {user.role === 'admin' && user.vkId && user.active && (
                <form action={revokeVkAccessAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <SubmitButton className="btn-danger btn-sm" pendingLabel="Закрываем…">
                    Отозвать доступ
                  </SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
