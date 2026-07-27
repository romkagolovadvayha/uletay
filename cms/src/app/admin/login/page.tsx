import { loginAction } from '../actions';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hasError = params.error === '1';

  return (
    <div className="auth-page">
      <form action={loginAction} className="auth-card">
        <div className="auth-heading">
          <span className="admin-brand-mark">У</span>
          <div>
            <h1>Вход в админку</h1>
            <p>Управление контентом фестиваля УЛЕТАЙ</p>
          </div>
        </div>
        {hasError ? (
          <p className="admin-notice admin-notice--error">Неверный логин или пароль</p>
        ) : null}
        <label>
          Логин
          <input name="username" required autoComplete="username" />
        </label>
        <label>
          Пароль
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <button type="submit">Войти</button>
      </form>
    </div>
  );
}
