import { Plus, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

import { type UserFormValues, UserModal, type UserRow } from '../components/users/UserModals'
import { usersApi } from '../features/users/api/usersApi'
import { getErrorMessage } from '../shared/api/client'
import { USER_ROLE_LABELS, UserRole } from '../shared/types'
import { DataTable } from '../shared/ui/DataTable'
import { PageHeader } from '../shared/ui/PageHeader'
import styles from './UsersPage.module.css'

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [isCreateOpen, setCreateOpen] = useState(false)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadUsers = () => {
    setLoading(true)
    setError('')
    void usersApi
      .list()
      .then((items) => {
        setUsers(
          items.map((user) => ({
            id: user.id,
            fullName: user.fullName,
            username: user.username,
            email: user.email ?? '',
            role: user.role,
          })),
        )
      })
      .catch((error) => setError(getErrorMessage(error)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const closeModal = () => {
    setCreateOpen(false)
    setEditingUser(null)
  }

  const saveUser = async (values: UserFormValues) => {
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, { fullName: values.fullName, role: values.role })
      } else {
        await usersApi.create(values)
      }
      closeModal()
      loadUsers()
    } catch (error) {
      setError(getErrorMessage(error))
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="АДМИНИСТРИРОВАНИЕ"
        title="Пользователи"
        description="Управление доступом сотрудников к системе"
        action={
          <button className="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={17} /> Добавить пользователя
          </button>
        }
      />

      {error && (
        <div className="page-notification is-error" role="alert">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="table-wrap" role="status" aria-live="polite">
          <div className="empty">Загрузка пользователей…</div>
        </div>
      ) : (
        <DataTable
          columns={['Сотрудник', 'Логин', 'Электронная почта', 'Роль', 'Статус', '']}
          rows={users.map((user) => {
            return [
              <strong key="name">{user.fullName}</strong>,
              user.username,
              user.email,
              <span className="role" key="role">
                {user.role === UserRole.ADMIN && <ShieldCheck size={15} />}{' '}
                {USER_ROLE_LABELS[user.role]}
              </span>,
              <span className="active-dot" key="status">
                Активен
              </span>,
              <span className={styles.actions} key="actions">
                <button className="row-action" onClick={() => setEditingUser(user)}>
                  Изменить
                </button>
              </span>,
            ]
          })}
        />
      )}

      {(isCreateOpen || editingUser) && (
        <UserModal
          mode={editingUser ? 'edit' : 'create'}
          user={editingUser}
          onClose={closeModal}
          onSave={saveUser}
        />
      )}
    </>
  )
}