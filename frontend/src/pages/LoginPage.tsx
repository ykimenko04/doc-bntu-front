import { ArrowRight, Eye, EyeOff, FileText } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../app/providers'
import { authApi } from '../features/auth/api/authApi'
import { getErrorMessage } from '../shared/api/client'
import styles from './LoginPage.module.css'

type LoginMode = 'login' | 'forgot'

export function LoginPage() {
  const { user, signIn, sessionError, retrySession } = useAuth()
  const [mode, setMode] = useState<LoginMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  const [error, setError] = useState('')
  const [validationError, setValidationError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to={user.need_password_change ? '/change-password' : '/'} replace />

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault()
    if (loading) return
    setError('')
    setValidationError('')
    if (!username.trim() || !password) {
      setValidationError('Введите логин и пароль')
      return
    }
    setLoading(true)
    try {
      await signIn(username.trim(), password)
    } catch (error) {
      setError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const submitForgot = async (event: FormEvent) => {
    event.preventDefault()
    if (forgotLoading || forgotSuccess) return

    setForgotError('')
    if (!forgotEmail.trim()) {
      setForgotError('Введите email')
      return
    }

    setForgotLoading(true)
    try {
      await authApi.requestPasswordReset(forgotEmail.trim())
      setForgotSuccess(true)
    } catch (error) {
      setForgotError(getErrorMessage(error))
    } finally {
      setForgotLoading(false)
    }
  }

  const switchToLogin = () => {
    setMode('login')
    setForgotEmail('')
    setForgotError('')
    setForgotSuccess(false)
    setForgotLoading(false)
  }

  const switchToForgot = () => {
    setMode('forgot')
    setError('')
    setValidationError('')
    setForgotEmail('')
    setForgotError('')
    setForgotSuccess(false)
    setForgotLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-art">
        <div className="logo light">
          <span className="logo-mark">
            <FileText size={18} />
          </span>
          <span>
            КАДРОВЫЙ
            <br />
            <b>ЗАКАЗ</b>
          </span>
        </div>
        <div className="art-copy">
          <div className="eyebrow">ЦИФРОВАЯ СИСТЕМА БНТУ</div>
          <h1>
            Кадровый заказ
            <br />
            <em>под контролем.</em>
          </h1>
          <p>Единое пространство для договоров, заявок и документов организаций-заказчиков.</p>
        </div>
        <div className="art-footer">Белорусский национальный технический университет</div>
      </div>

      <form
        className={`login-form ${styles.loginForm}`}
        onSubmit={mode === 'login' ? submitLogin : submitForgot}
      >
        <div className={styles.formHeading}>
          <div className="eyebrow">ДОБРО ПОЖАЛОВАТЬ</div>
          <h2>{mode === 'login' ? 'Войти в систему' : 'Забыли пароль?'}</h2>
          <p>
            {mode === 'login'
              ? 'Используйте учётную запись сотрудника БНТУ'
              : 'Введите рабочую почту — пришлём инструкции по восстановлению.'}
          </p>
        </div>

        {mode === 'login' ? (
          <>
            <label>
              Логин
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                disabled={loading}
              />
            </label>
            <label>
              Пароль
              <div className={`password-input ${styles.passwordInput}`}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  aria-label="Показать или скрыть пароль"
                  disabled={loading}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <button
              className={styles.forgotPassword}
              type="button"
              disabled={loading}
              onClick={switchToForgot}
            >
              Забыли пароль?
            </button>

            {validationError && (
              <div className="error" role="alert">
                {validationError}
              </div>
            )}
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}

            <button className="primary full" type="submit" disabled={loading}>
              {loading ? 'Вход…' : 'Продолжить'} <ArrowRight size={17} />
            </button>

            {sessionError && !error && (
              <div className="error" role="alert">
                Не удалось проверить сессию. {sessionError}
              </div>
            )}
            {sessionError && (
              <button
                className="secondary full"
                type="button"
                disabled={loading}
                onClick={retrySession}
              >
                Повторить проверку сессии
              </button>
            )}
            <small className="login-help">Доступ предоставляется администратором системы</small>
          </>
        ) : (
          <>
            <label>
              Электронная почта
              <input
                type="email"
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
                placeholder="name@bntu.by"
                autoComplete="email"
                disabled={forgotLoading || forgotSuccess}
                required
              />
            </label>

            {forgotError && (
              <div className="error" role="alert">
                {forgotError}
              </div>
            )}

            {forgotSuccess && (
              <div className={styles.info} role="status">
                Если этот email зарегистрирован, мы отправим письмо с дальнейшими инструкциями.
              </div>
            )}

            <button className="primary full" type="submit" disabled={forgotLoading || forgotSuccess}>
              {forgotLoading ? 'Отправка…' : forgotSuccess ? 'Отправлено' : 'Отправить'}
            </button>

            <button className={styles.backButton} type="button" disabled={forgotLoading} onClick={switchToLogin}>
              Назад ко входу
            </button>
          </>
        )}
      </form>
    </div>
  )
}
