import { type FormEvent, useState } from 'react'

import { useAuth } from '../app/providers'
import { getErrorMessage } from '../shared/api/client'
import { PageHeader } from '../shared/ui/PageHeader'
import styles from './SettingsPage.module.css'

export function ChangePasswordPage() {
  const { user, changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [validationError, setValidationError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    setValidationError('')
    setError('')
    if (!current || next.length < 8) {
      setValidationError('Введите текущий пароль и новый пароль не менее 8 символов')
      return
    }
    if (next !== repeat) {
      setValidationError('Новые пароли не совпадают')
      return
    }
    setSaving(true)
    try {
      await changePassword(current, next)
    } catch (error) {
      setError(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="БЕЗОПАСНОСТЬ"
        title="Смена пароля"
        description={
          user?.need_password_change
            ? 'Для продолжения работы необходимо сменить пароль.'
            : 'Обновите пароль своей учётной записи.'
        }
      />
      <form className={styles.panel} onSubmit={submit} noValidate>
        <div className={`${styles.fields} ${styles.single}`}>
          <label>
            Текущий пароль
            <input
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              disabled={saving}
            />
          </label>
          <label>
            Новый пароль
            <input
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              minLength={8}
              disabled={saving}
            />
          </label>
          <label>
            Повтор нового пароля
            <input
              type="password"
              autoComplete="new-password"
              value={repeat}
              onChange={(event) => setRepeat(event.target.value)}
              disabled={saving}
            />
          </label>
        </div>
        {validationError && (
          <p className="error" role="alert">
            {validationError}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button className="primary" type="submit" disabled={saving}>
            {saving ? 'Сохранение…' : 'Изменить пароль'}
          </button>
        </div>
      </form>
    </>
  )
}
