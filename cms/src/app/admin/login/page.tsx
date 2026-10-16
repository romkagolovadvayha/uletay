import Link from 'next/link';
import { SubmitButton } from '../components/EditorForm';
import { loginAction } from '../auth-actions';
import { vkAuthConfigured } from '@/lib/vk-auth';
import { ThemeToggle } from '../components/ThemeToggle';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const messages: Record<string, string> = {
    '1': 'Неверный логин или пароль',
    rate: 'Слишком много попыток входа. Повторите через 15 минут.',
    vk: 'Не удалось войти через VK. Попробуйте ещё раз.',
    'vk-config': 'Вход через VK недоступен. Проверьте настройки VK ID на сервере.',
    'vk-denied': 'Для этого VK ID доступ не открыт. Попросите владельца добавить вас в команду.',
  };

  return (
    <div className="auth-page">
      <div className="auth-theme">
        <ThemeToggle />
      </div>
      <form action={loginAction} className="auth-card">
        <div className="auth-heading">
          <span className="admin-brand-mark">У</span>
          <div>
            <h1>Добро пожаловать</h1>
            <p>Управление приложением фестиваля УЛЕТАЙ</p>
          </div>
        </div>
        {params.error && messages[params.error] ? (
          <p role="alert" className="admin-notice admin-notice--error">
            {messages[params.error]}
          </p>
        ) : null}
        <label>
          Логин
          <input name="username" required autoComplete="username" />
        </label>
        <label>
          Пароль
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <SubmitButton pendingLabel="Входим…">Войти в админку</SubmitButton>
        {vkAuthConfigured() && (
          <>
            <div className="auth-divider">или</div>
            <a className="btn-vk" href="/admin/auth/vk">
              Войти через VK ID
            </a>
          </>
        )}
        <p className="auth-footer">
          <Link href="/">← Вернуться к приложению</Link>
        </p>
      </form>
    </div>
  );
}
