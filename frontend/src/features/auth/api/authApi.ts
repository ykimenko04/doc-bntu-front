import { ApiError, apiRequest } from '../../../shared/api/client'
import type { Role } from '../../../shared/types'

// Backend docs/frontend-integration-spec.md, section 2.2.
export interface SessionUser {
  id: number
  username: string
  fullName: string
  role: Role
  need_password_change: boolean
}

const LEGACY_USER_STORAGE_KEY = 'bntu-auth-legacy'
const LEGACY_DEFAULT_ROLE: Role = 'HEAD'

function readUser(value: unknown): SessionUser | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  if (
    typeof data.id !== 'number' ||
    typeof data.username !== 'string' ||
    typeof data.full_name !== 'string' ||
    (data.role !== 'ADMIN' && data.role !== 'HEAD') ||
    typeof data.need_password_change !== 'boolean'
  )
    return null
  return {
    id: data.id,
    username: data.username,
    fullName: data.full_name,
    role: data.role,
    need_password_change: data.need_password_change,
  }
}

function isUnexpectedApiHtml(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status >= 200 &&
    error.status < 300 &&
    /json/i.test(error.message)
  )
}

function readLegacyUser(): SessionUser | null {
  try {
    const value = sessionStorage.getItem(LEGACY_USER_STORAGE_KEY)
    if (!value) return null
    const data: unknown = JSON.parse(value)
    if (!data || typeof data !== 'object') return null
    const record = data as Record<string, unknown>
    if (
      typeof record.username !== 'string' ||
      typeof record.fullName !== 'string' ||
      (record.role !== 'ADMIN' && record.role !== 'HEAD')
    )
      return null
    return {
      id: typeof record.id === 'number' ? record.id : 0,
      username: record.username,
      fullName: record.fullName,
      role: record.role,
      need_password_change: Boolean(record.need_password_change),
    }
  } catch {
    return null
  }
}

function writeLegacyUser(user: SessionUser | null) {
  try {
    if (!user) sessionStorage.removeItem(LEGACY_USER_STORAGE_KEY)
    else sessionStorage.setItem(LEGACY_USER_STORAGE_KEY, JSON.stringify(user))
  } catch {
    // ignore
  }
}

async function legacyLogin(username: string, password: string) {
  const body = new URLSearchParams({ username, password })
  const response = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    credentials: 'include',
  })

  if (response.status === 401) throw new ApiError(401, 'Неверный логин или пароль')
  if (!response.ok)
    throw new ApiError(response.status, `Ошибка сервера (${response.status}). Повторите попытку.`)
}

async function legacyLogout() {
  const response = await fetch('/logout', { credentials: 'include' })
  if (!response.ok)
    throw new ApiError(response.status, `Ошибка сервера (${response.status}). Повторите попытку.`)
}

async function legacyRequestPasswordReset(email: string) {
  const candidates = [
    '/forgot-password',
    '/reset-password',
    '/password-reset',
    '/request-password-reset',
  ]
  const body = new URLSearchParams({ email })

  for (const path of candidates) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      credentials: 'include',
    })
    if (response.ok) return
  }

  throw new ApiError(404, 'Сервис восстановления пароля недоступен')
}

async function apiRequestPasswordReset(email: string) {
  const candidates = [
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/password-reset',
    '/api/auth/request-password-reset',
  ]

  for (const path of candidates) {
    try {
      await apiRequest<void>(
        path,
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        },
        { localUnauthorized: true },
      )
      return
    } catch (error) {
      if (isUnexpectedApiHtml(error)) continue
      if (error instanceof ApiError && error.status === 404) continue
      throw error
    }
  }

  throw new ApiError(404, 'Сервис восстановления пароля недоступен')
}

export const authApi = {
  me: async (signal?: AbortSignal) => {
    try {
      const user = readUser(
        await apiRequest<unknown>('/api/auth/me', { signal }, { localUnauthorized: true }),
      )
      if (!user) throw new ApiError(200, 'Сервер вернул некорректные данные пользователя')
      writeLegacyUser(user)
      return user
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        const legacyUser = readLegacyUser()
        if (legacyUser) return legacyUser
        throw new ApiError(401, 'Сессия истекла. Войдите снова.')
      }
      if (isUnexpectedApiHtml(error)) {
        const legacyUser = readLegacyUser()
        if (legacyUser) return legacyUser
        throw new ApiError(401, 'Сессия истекла. Войдите снова.')
      }
      throw error
    }
  },

  login: async (username: string, password: string) => {
    try {
      const data = await apiRequest<unknown>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        },
        { localUnauthorized: true },
      )
      const user = readUser(data) ?? (await authApi.me())
      writeLegacyUser(user)
      return user
    } catch (error) {
      if (!(isUnexpectedApiHtml(error) || (error instanceof ApiError && error.status === 404))) throw error

      await legacyLogin(username, password)

      try {
        const user = await authApi.me()
        writeLegacyUser(user)
        return user
      } catch (meError) {
        if (isUnexpectedApiHtml(meError) || (meError instanceof ApiError && meError.status === 401)) {
          const fallbackUser: SessionUser = {
            id: 0,
            username,
            fullName: username,
            role: LEGACY_DEFAULT_ROLE,
            need_password_change: false,
          }
          writeLegacyUser(fallbackUser)
          return fallbackUser
        }
        throw meError
      }
    }
  },

  logout: async () => {
    writeLegacyUser(null)
    try {
      await apiRequest<void>('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      if (!(isUnexpectedApiHtml(error) || (error instanceof ApiError && error.status === 404))) throw error
      await legacyLogout()
    }
  },

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<void>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),

  requestPasswordReset: async (email: string) => {
    try {
      await apiRequestPasswordReset(email)
    } catch (error) {
      if (!(isUnexpectedApiHtml(error) || (error instanceof ApiError && error.status === 404))) throw error
      await legacyRequestPasswordReset(email)
    }
  },
}

