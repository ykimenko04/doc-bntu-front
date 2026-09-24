import {
  ArrowDownUp,
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  Users,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { useAuth } from '../../app/providers'
import { checkApiHealth, getErrorMessage } from '../api/client'

const links = [
  { to: '/', label: 'Организации', icon: Building2 },
  { to: '/applications', label: 'Заявки', icon: ClipboardList },
  { to: '/data', label: 'Импорт и экспорт', icon: ArrowDownUp },
  { to: '/audit', label: 'Журнал событий', icon: ScrollText },
  { to: '/users', label: 'Пользователи', icon: Users },
  { to: '/settings', label: 'Настройки', icon: Settings },
]

type BreadcrumbItem = {
  label: string
  to?: string
}

function getBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  const path = pathname.replace(/\/+$/, '') || '/'
  let sectionItems: BreadcrumbItem[] = []

  if (path === '/change-password') return [{ label: 'Смена пароля' }]
  if (path === '/users') sectionItems = [{ label: 'Пользователи' }]
  else if (path === '/applications') sectionItems = [{ label: 'Заявки' }]
  else if (/^\/applications\/[^/]+$/.test(path)) {
    sectionItems = [{ label: 'Заявки', to: '/applications' }, { label: 'Карточка заявки' }]
  } else if (path === '/data') sectionItems = [{ label: 'Импорт и экспорт' }]
  else if (path === '/audit') sectionItems = [{ label: 'Журнал событий' }]
  else if (path === '/settings') sectionItems = [{ label: 'Настройки' }]
  else if (/^\/organizations\/[^/]+$/.test(path)) {
    sectionItems = [{ label: 'Управление', to: '/' }, { label: 'Карточка организации' }]
  }

  return [{ label: 'БНТУ', ...(path === '/' ? {} : { to: '/' }) }, ...sectionItems]
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(true)
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const logout = async () => {
    if (loggingOut) return
    setLogoutError('')
    setLoggingOut(true)
    try {
      await signOut()
    } catch (error) {
      setLogoutError(getErrorMessage(error))
    } finally {
      setLoggingOut(false)
    }
  }
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'unavailable'>('checking')
  const currentDate = useMemo(
    () =>
      new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date()),
    [],
  )

  useEffect(() => {
    let activeController: AbortController | null = null

    const updateApiStatus = async () => {
      activeController?.abort()
      const controller = new AbortController()
      activeController = controller
      const timeout = window.setTimeout(() => controller.abort(), 5000)
      const isAvailable = await checkApiHealth(controller.signal)
      window.clearTimeout(timeout)
      if (activeController === controller) {
        setApiStatus(isAvailable ? 'connected' : 'unavailable')
      }
    }

    void updateApiStatus()
    const interval = window.setInterval(updateApiStatus, 30_000)
    window.addEventListener('online', updateApiStatus)
    window.addEventListener('offline', updateApiStatus)

    return () => {
      activeController?.abort()
      activeController = null
      window.clearInterval(interval)
      window.removeEventListener('online', updateApiStatus)
      window.removeEventListener('offline', updateApiStatus)
    }
  }, [])

  const apiStatusLabel = {
    checking: 'Проверка API…',
    connected: 'API подключен',
    unavailable: 'API недоступен',
  }[apiStatus]
  const breadcrumbItems = getBreadcrumbItems(pathname)

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <button
          className="logo"
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          aria-label={collapsed ? 'Показать меню' : 'Скрыть меню'}
        >
          <span className="logo-mark">
            <FileText size={18} />
          </span>
          <span>
            КАДРОВЫЙ
            <br />
            <b>ЗАКАЗ</b>
          </span>
        </button>
        <div className={`workspace-label ${collapsed ? 'workspace-label-hidden' : ''}`}>
          РАБОЧЕЕ ПРОСТРАНСТВО
        </div>
        <nav>
          {(user?.need_password_change ? [] : links).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setCollapsed(true)}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className={`connection connection-${apiStatus}`} role="status" aria-live="polite">
            <span /> {apiStatusLabel}
          </div>
          <button
            className="user-menu"
            onClick={logout}
            disabled={loggingOut}
            title="Выйти из аккаунта"
            aria-label="Выйти из аккаунта"
          >
            <span className="avatar">{user?.fullName.slice(0, 1)}</span>
            <span>
              <b>{user?.fullName}</b>
              <small>{user?.role === 'ADMIN' ? 'Администратор' : 'Руководитель'}</small>
            </span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <main
        className="main-content"
        onMouseDown={() => {
          if (!collapsed) setCollapsed(true)
        }}
      >
        <header className="topbar">
          <nav className="breadcrumb" aria-label="Хлебные крошки">
            {breadcrumbItems.map((item, index) => {
              const isCurrent = index === breadcrumbItems.length - 1
              const content = (
                <>
                  {index === 0 && <LayoutDashboard size={16} />}
                  {item.label}
                </>
              )

              return (
                <span className="breadcrumb-item" key={`${item.label}-${index}`}>
                  {index > 0 && (
                    <span className="breadcrumb-separator" aria-hidden="true">
                      /
                    </span>
                  )}
                  {item.to && !isCurrent ? (
                    <Link to={item.to}>{content}</Link>
                  ) : (
                    <span className="breadcrumb-current" aria-current="page">
                      {content}
                    </span>
                  )}
                </span>
              )
            })}
          </nav>
          <div className="topbar-date">{currentDate}</div>
        </header>
        <section className="content">
          {logoutError && (
            <p className="error" role="alert">
              Выход не подтверждён сервером: {logoutError}
            </p>
          )}
          {children}
        </section>
      </main>
    </div>
  )
}
