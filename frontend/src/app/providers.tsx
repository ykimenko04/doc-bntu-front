import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { authApi, type SessionUser } from '../features/auth/api/authApi'
import { ApiError, getErrorMessage, subscribeApiErrors } from '../shared/api/client'

type AuthContextValue = {
  user: SessionUser | null
  loading: boolean
  sessionError: string
  retrySession: () => void
  signIn: (username: string, password: string) => Promise<void>
  changePassword: (current: string, next: string) => Promise<void>
  signOut: () => Promise<void>
}
const AuthContext = createContext<AuthContextValue | null>(null)

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState('')
  const [apiError, setApiError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const revision = useRef(0)
  const navigate = useNavigate()

  useEffect(
    () =>
      subscribeApiErrors((error) => {
        if (error.status === 401) {
          revision.current += 1
          setUser(null)
          setLoading(false)
          setSessionError('')
          setApiError('')
          navigate('/login', { replace: true })
        } else setApiError(error.message)
      }),
    [navigate],
  )

  useEffect(() => {
    const controller = new AbortController()
    const version = ++revision.current
    const isCurrent = () => !controller.signal.aborted && version === revision.current
    localStorage.removeItem('bntu-auth')
    void authApi
      .me(controller.signal)
      .then((current) => {
        if (isCurrent()) setUser(current)
      })
      .catch((error: unknown) => {
        if (!isCurrent()) return
        setUser(null)
        if (!(error instanceof ApiError && error.status === 401))
          setSessionError(getErrorMessage(error))
      })
      .finally(() => {
        if (isCurrent()) setLoading(false)
      })
    return () => controller.abort()
  }, [attempt])

  const signIn = async (username: string, password: string) => {
    const version = ++revision.current
    const current = await authApi.login(username, password)
    if (version !== revision.current) return
    setUser(current)
    setSessionError('')
    setApiError('')
    navigate(current.need_password_change ? '/change-password' : '/', { replace: true })
  }
  const changePassword = async (current: string, next: string) => {
    const version = revision.current
    await authApi.changePassword(current, next)
    let refreshed: SessionUser
    try {
      refreshed = await authApi.me()
    } catch (error) {
      if (version !== revision.current) throw error
      setUser(null)
      if (error instanceof ApiError && error.status === 401) navigate('/login', { replace: true })
      else setSessionError(getErrorMessage(error))
      throw error
    }
    if (version !== revision.current) return
    setUser(refreshed)
    if (refreshed.need_password_change) throw new Error('Сервер по-прежнему требует сменить пароль')
    navigate('/', { replace: true })
  }
  const signOut = async () => {
    await authApi.logout()
    revision.current += 1
    setUser(null)
    setApiError('')
    localStorage.removeItem('bntu-auth')
    navigate('/login', { replace: true })
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionError,
        signIn,
        changePassword,
        signOut,
        retrySession: () => {
          setLoading(true)
          setSessionError('')
          setAttempt((value) => value + 1)
        },
      }}
    >
      {apiError && (
        <div className="error" role="alert">
          {apiError}
          <button onClick={() => setApiError('')}>Закрыть</button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  )
}
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('Auth provider is missing')
  return context
}
