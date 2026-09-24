const API_HEALTH_PATH = import.meta.env.VITE_API_HEALTH_PATH ?? '/health'

const API_URL = import.meta.env.VITE_API_URL ?? ''

function joinUrl(baseUrl: string, path: string): string {
  if (!baseUrl) return path
  const normalizedBase = baseUrl.replace(/\/+$/, '')
  return `${normalizedBase}${path}`
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
const listeners = new Set<(error: ApiError) => void>()
export function subscribeApiErrors(listener: (error: ApiError) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function getErrorMessage(error: unknown): string {
  if (error instanceof TypeError)
    return 'Не удалось связаться с сервером. Проверьте подключение и повторите попытку.'
  return error instanceof Error ? error.message : 'Не удалось выполнить запрос'
}
export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  options?: { localUnauthorized?: boolean },
): Promise<T> {
  const headers = new Headers(init?.headers)
  if (typeof init?.body === 'string' && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')
  const response = await fetch(joinUrl(API_URL, path), {
    ...init,
    headers,
    credentials: 'include',
  })
  const contentType = response.headers.get('content-type')?.split(';')[0].trim() ?? ''
  const isJson = contentType === 'application/json' || contentType.endsWith('+json')
  if (!response.ok) {
    let message = `Ошибка сервера (${response.status}). Повторите попытку.`
    if (isJson) {
      const body: unknown = await response.json().catch(() => null)
      if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string')
        message = body.detail
    }
    if (response.status === 401)
      message =
        path === '/api/auth/login' ? 'Неверный логин или пароль' : 'Сессия истекла. Войдите снова.'
    if (response.status === 403) message = 'Недостаточно прав для выполнения действия'
    const error = new ApiError(response.status, message)
    if ((response.status === 401 && !options?.localUnauthorized) || response.status === 403)
      listeners.forEach((listener) => listener(error))
    throw error
  }
  if (response.status === 204) return undefined as T
  if (path.startsWith('/api/') && (!isJson || response.redirected))
    throw new ApiError(response.status, 'Сервер вернул неожиданный ответ API. Ожидался JSON.')
  if (!isJson) return response.blob() as Promise<T>
  try {
    return (await response.json()) as T
  } catch {
    throw new ApiError(response.status, 'Сервер вернул некорректный JSON')
  }
}
export async function checkApiHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(joinUrl(API_URL, API_HEALTH_PATH), {
      credentials: 'include',
      signal,
    })
    return response.ok
  } catch {
    return false
  }
}


