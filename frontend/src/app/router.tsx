import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'

import { AppShell } from '../shared/ui/AppShell'
import { useAuth } from './providers'

const ApplicationPage = lazy(() =>
  import('../pages/ApplicationPage').then((module) => ({ default: module.ApplicationPage })),
)
const ApplicationsPage = lazy(() =>
  import('../pages/ApplicationsPage').then((module) => ({ default: module.ApplicationsPage })),
)
const AuditPage = lazy(() =>
  import('../pages/AuditPage').then((module) => ({ default: module.AuditPage })),
)
const DataTransferPage = lazy(() =>
  import('../pages/DataTransferPage').then((module) => ({ default: module.DataTransferPage })),
)
const LoginPage = lazy(() =>
  import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const ChangePasswordPage = lazy(() =>
  import('../pages/ChangePasswordPage').then((module) => ({ default: module.ChangePasswordPage })),
)
const OrganizationPage = lazy(() =>
  import('../pages/OrganizationPage').then((module) => ({ default: module.OrganizationPage })),
)
const OrganizationsPage = lazy(() =>
  import('../pages/OrganizationsPage').then((module) => ({ default: module.OrganizationsPage })),
)
const SettingsPage = lazy(() =>
  import('../pages/SettingsPage').then((module) => ({ default: module.SettingsPage })),
)
const UsersPage = lazy(() =>
  import('../pages/UsersPage').then((module) => ({ default: module.UsersPage })),
)

function PageFallback() {
  return (
    <div className="page-loading" role="status">
      Загрузка страницы…
    </div>
  )
}

function Protected({ passwordChange = false }: { passwordChange?: boolean }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.need_password_change && !passwordChange)
    return <Navigate to="/change-password" replace />
  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </AppShell>
  )
}
export function AppRouter() {
  const { loading, sessionError, retrySession } = useAuth()
  const { pathname } = useLocation()
  if (loading)
    return (
      <div className="page-loading" role="status">
        Проверка сессии…
      </div>
    )
  if (sessionError && pathname.replace(/\/+$/, '') !== '/login')
    return (
      <div className="page-loading">
        <p role="alert">{sessionError}</p>
        <button className="primary" onClick={retrySession}>
          Повторить проверку сессии
        </button>
      </div>
    )
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Suspense fallback={<PageFallback />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route element={<Protected passwordChange />}>
        <Route path="change-password" element={<ChangePasswordPage />} />
      </Route>
      <Route element={<Protected />}>
        <Route index element={<OrganizationsPage />} />
        <Route path="organizations/:id" element={<OrganizationPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/:id" element={<ApplicationPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="data" element={<DataTransferPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
