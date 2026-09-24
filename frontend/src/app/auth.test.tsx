import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode, useState } from 'react'
import { Link, MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apiRequest } from '../shared/api/client'
import { Providers } from './providers'
import { AppRouter } from './router'

function OrdinaryAction() {
  const [result, setResult] = useState('')
  return (
    <button
      onClick={async () => {
        try {
          await apiRequest('/api/example')
          setResult('Операция успешна')
        } catch {
          setResult('Операция отклонена')
        }
      }}
    >
      {result || 'Обычное действие'}
    </button>
  )
}

vi.mock('../pages/OrganizationsPage', () => ({
  OrganizationsPage: () => (
    <>
      <h1>Реестр организаций</h1>
      <Link to="/applications">Открыть заявки</Link>
      <OrdinaryAction />
    </>
  ),
}))
vi.mock('../pages/ApplicationsPage', () => ({
  ApplicationsPage: () => <h1>Реестр заявок</h1>,
}))

const serverUser = {
  id: 42,
  username: 'employee',
  full_name: 'Сотрудник с сервера',
  role: 'HEAD',
  need_password_change: false,
}
const unauthorized = () => Response.json({ detail: 'No session' }, { status: 401 })
let fetchMock: ReturnType<typeof vi.fn>
let me: () => Response | Promise<Response>

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  me = unauthorized
  fetchMock = vi.fn((path: string) => {
    if (path === '/api/auth/me') return Promise.resolve(me())
    if (path === '/health') return Promise.resolve(new Response(null, { status: 204 }))
    throw new Error('Unexpected request: ' + path)
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
  sessionStorage.clear()
})

function Location() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <output data-testid="location">{pathname}</output>
      <button onClick={() => navigate('/applications')}>Внутренний переход</button>
    </>
  )
}
function mount(path = '/app/login', strict = false) {
  const app = (
    <MemoryRouter basename="/app" initialEntries={[path]}>
      <Providers>
        <AppRouter />
        <Location />
      </Providers>
    </MemoryRouter>
  )
  return render(strict ? <StrictMode>{app}</StrictMode> : app)
}
function login() {
  fireEvent.change(screen.getByLabelText('Логин'), { target: { value: 'employee' } })
  fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'secret-password' } })
  fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
}
function passwordForm(next = 'new-password', repeat = next) {
  fireEvent.change(screen.getByLabelText('Текущий пароль'), { target: { value: 'old-password' } })
  fireEvent.change(screen.getByLabelText('Новый пароль', { exact: true }), {
    target: { value: next },
  })
  fireEvent.change(screen.getByLabelText('Повтор нового пароля'), { target: { value: repeat } })
  fireEvent.click(screen.getByRole('button', { name: 'Изменить пароль' }))
}
function handle(
  handler: (path: string, init?: RequestInit) => Response | Promise<Response> | undefined,
) {
  fetchMock.mockImplementation((path: string, init?: RequestInit) => {
    const response = handler(path, init)
    if (response) return Promise.resolve(response)
    if (path === '/api/auth/me') return Promise.resolve(me())
    if (path === '/health') return Promise.resolve(new Response(null, { status: 204 }))
    throw new Error('Unexpected request: ' + path)
  })
}

describe('server session and routes under /app', () => {
  it('waits for me and ignores the legacy localStorage key', async () => {
    let resolve!: (response: Response) => void
    me = () =>
      new Promise((done) => {
        resolve = done
      })
    localStorage.setItem('bntu-auth', '1')
    mount('/app/applications')
    expect(screen.getByText('Проверка сессии…')).toBeInTheDocument()
    expect(screen.queryByText('Реестр заявок')).not.toBeInTheDocument()
    await act(async () => resolve(unauthorized()))
    expect(await screen.findByRole('heading', { name: 'Войти в систему' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
    expect(localStorage.getItem('bntu-auth')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('restores a server session on a protected URL', async () => {
    me = () => Response.json(serverUser)
    mount('/app/applications')
    expect(await screen.findByText('Реестр заявок')).toBeInTheDocument()
    expect(screen.getByText(serverUser.full_name)).toBeInTheDocument()
    expect(screen.getByText('Руководитель')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Организации' })).toHaveAttribute('href', '/app')
  })

  it.each([false, true])(
    'redirects authenticated login with password-change flag %s',
    async (forced) => {
      me = () => Response.json({ ...serverUser, need_password_change: forced })
      mount()
      await screen.findByRole('heading', { name: forced ? 'Смена пароля' : 'Реестр организаций' })
      expect(screen.getByTestId('location').textContent).toBe(forced ? '/change-password' : '/')
    },
  )

  it('starts with empty credentials', async () => {
    mount()
    await screen.findByLabelText('Логин')
    expect(screen.getByLabelText('Логин')).toHaveValue('')
    expect(screen.getByLabelText('Пароль')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Забыли пароль?' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Показать или скрыть пароль' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Введите логин и пароль')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each(['/app/login', '/app/login/'])(
    'shows the login form when me returns 404 at %s',
    async (path) => {
      me = () => new Response(null, { status: 404 })
      mount(path)
      expect(await screen.findByLabelText('Логин')).toHaveValue('')
      expect(screen.getByLabelText('Пароль')).toHaveValue('')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Продолжить' })).toBeEnabled()
      expect(screen.queryByText('Реестр организаций')).not.toBeInTheDocument()
    },
  )

  it('clears a failed session check after a successful login', async () => {
    me = () => new Response(null, { status: 404 })
    handle((path) => (path === '/api/auth/login' ? Response.json(serverUser) : undefined))
    mount()
    await screen.findByLabelText('Логин')
    login()
    expect(await screen.findByText('Реестр организаций')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each([false, true])('logs in using server data and routes with flag %s', async (forced) => {
    handle((path) =>
      path === '/api/auth/login'
        ? Response.json({ ...serverUser, need_password_change: forced })
        : undefined,
    )
    mount()
    await screen.findByLabelText('Логин')
    login()
    await screen.findByRole('heading', { name: forced ? 'Смена пароля' : 'Реестр организаций' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ username: 'employee', password: 'secret-password' }),
      }),
    )
    expect(screen.getByText(serverUser.full_name)).toBeInTheDocument()
    expect(localStorage.getItem('bntu-auth')).toBeNull()
  })

  it('obtains me if the login response has incomplete user data', async () => {
    handle((path) => {
      if (path !== '/api/auth/login') return
      me = () => Response.json(serverUser)
      return Response.json({ id: 42 })
    })
    mount()
    await screen.findByLabelText('Логин')
    login()
    await screen.findByText('Реестр организаций')
    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/auth/me')).toHaveLength(2)
  })

  it('keeps invalid credentials in the login form without redirect loops', async () => {
    handle((path) => (path === '/api/auth/login' ? unauthorized() : undefined))
    mount()
    await screen.findByLabelText('Логин')
    login()
    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный логин или пароль')
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(screen.queryByText(serverUser.full_name)).not.toBeInTheDocument()
  })

  it('reports network failure in the login form', async () => {
    handle((path) =>
      path === '/api/auth/login' ? Promise.reject(new TypeError('Failed to fetch')) : undefined,
    )
    mount()
    await screen.findByLabelText('Логин')
    login()
    expect(await screen.findByRole('alert')).toHaveTextContent('Проверьте подключение')
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
  })

  it('allows retry after startup network failure without opening protected pages', async () => {
    me = () => Promise.reject(new TypeError('Failed to fetch'))
    mount('/app/applications')
    expect(await screen.findByRole('alert')).toHaveTextContent('Проверьте подключение')
    expect(screen.queryByText('Реестр заявок')).not.toBeInTheDocument()
    me = () => Response.json(serverUser)
    fireEvent.click(screen.getByRole('button', { name: 'Повторить проверку сессии' }))
    expect(await screen.findByText('Реестр заявок')).toBeInTheDocument()
  })

  it('blocks direct, internal and refreshed protected routes during mandatory change', async () => {
    me = () => Response.json({ ...serverUser, need_password_change: true })
    const view = mount('/app/applications')
    await screen.findByRole('heading', { name: 'Смена пароля' })
    expect(screen.queryByRole('link', { name: 'Организации' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Внутренний переход' }))
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/change-password'),
    )
    expect(screen.queryByText('Реестр заявок')).not.toBeInTheDocument()
    view.unmount()
    mount('/app/applications')
    await screen.findByRole('heading', { name: 'Смена пароля' })
    expect(screen.getByTestId('location')).toHaveTextContent('/change-password')
  })

  it.each([
    ['short', 'short', 'не менее 8'],
    ['new-password', 'different-password', 'не совпадают'],
  ])('validates passwords %s / %s before sending', async (next, repeat, message) => {
    me = () => Response.json({ ...serverUser, need_password_change: true })
    mount('/app/change-password')
    await screen.findByLabelText('Текущий пароль')
    passwordForm(next, repeat)
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(fetchMock.mock.calls.some(([path]) => path === '/api/auth/change-password')).toBe(false)
  })

  it('changes password, refreshes me and unlocks protected routes', async () => {
    me = () => Response.json({ ...serverUser, need_password_change: true })
    handle((path) => {
      if (path !== '/api/auth/change-password') return
      me = () => Response.json(serverUser)
      return new Response(null, { status: 204 })
    })
    mount('/app/change-password')
    await screen.findByLabelText('Текущий пароль')
    passwordForm()
    await screen.findByText('Реестр организаций')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/change-password',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ current_password: 'old-password', new_password: 'new-password' }),
      }),
    )
    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/auth/me')).toHaveLength(2)
    fireEvent.click(screen.getByRole('link', { name: 'Открыть заявки' }))
    expect(await screen.findByText('Реестр заявок')).toBeInTheDocument()
  })

  it('preserves the password gate after a rejected password change', async () => {
    me = () => Response.json({ ...serverUser, need_password_change: true })
    handle((path) =>
      path === '/api/auth/change-password'
        ? Response.json({ detail: 'Текущий пароль неверен' }, { status: 400 })
        : undefined,
    )
    mount('/app/change-password')
    await screen.findByLabelText('Текущий пароль')
    passwordForm()
    expect(await screen.findByRole('alert')).toHaveTextContent('Текущий пароль неверен')
    expect(screen.getByTestId('location')).toHaveTextContent('/change-password')
  })

  it('locks protected content if me cannot be refreshed after password change', async () => {
    me = () => Response.json({ ...serverUser, need_password_change: true })
    handle((path) => {
      if (path !== '/api/auth/change-password') return
      me = () => Promise.reject(new TypeError('Failed to fetch'))
      return new Response(null, { status: 204 })
    })
    mount('/app/change-password')
    await screen.findByLabelText('Текущий пароль')
    passwordForm()
    await screen.findByRole('button', { name: 'Повторить проверку сессии' })
    expect(screen.queryByText('Реестр организаций')).not.toBeInTheDocument()
  })

  it('logs out even when a password change is mandatory', async () => {
    me = () => Response.json({ ...serverUser, need_password_change: true })
    handle((path) =>
      path === '/api/auth/logout' ? new Response(null, { status: 204 }) : undefined,
    )
    mount('/app/change-password')
    await screen.findByLabelText('Текущий пароль')
    localStorage.setItem('bntu-auth', 'legacy')
    fireEvent.click(screen.getByRole('button', { name: 'Выйти из аккаунта' }))
    await screen.findByRole('heading', { name: 'Войти в систему' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
    expect(localStorage.getItem('bntu-auth')).toBeNull()
    expect(screen.queryByText(serverUser.full_name)).not.toBeInTheDocument()
  })

  it('does not claim successful logout when the server fails', async () => {
    me = () => Response.json(serverUser)
    handle((path) =>
      path === '/api/auth/logout'
        ? Response.json({ detail: 'Unavailable' }, { status: 500 })
        : undefined,
    )
    mount('/app/')
    await screen.findByText('Реестр организаций')
    fireEvent.click(screen.getByRole('button', { name: 'Выйти из аккаунта' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Выход не подтверждён сервером')
    expect(screen.getByText(serverUser.full_name)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Войти в систему' })).not.toBeInTheDocument()
  })

  it('clears the session on a 401 during an ordinary action', async () => {
    me = () => Response.json(serverUser)
    handle((path) => (path === '/api/example' ? unauthorized() : undefined))
    mount('/app/')
    await screen.findByText('Реестр организаций')
    fireEvent.click(screen.getByRole('button', { name: 'Обычное действие' }))
    await screen.findByRole('heading', { name: 'Войти в систему' })
    expect(screen.queryByText(serverUser.full_name)).not.toBeInTheDocument()
  })

  it('shows 403 and does not mark an ordinary action as successful', async () => {
    me = () => Response.json(serverUser)
    handle((path) =>
      path === '/api/example' ? Response.json({ detail: 'Forbidden' }, { status: 403 }) : undefined,
    )
    mount('/app/')
    await screen.findByText('Реестр организаций')
    fireEvent.click(screen.getByRole('button', { name: 'Обычное действие' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Недостаточно прав для выполнения действия',
    )
    await screen.findByRole('button', { name: 'Операция отклонена' })
    expect(screen.queryByText('Операция успешна')).not.toBeInTheDocument()
    expect(screen.getByText(serverUser.full_name)).toBeInTheDocument()
  })

  it('treats HTML session responses as an unauthenticated session', async () => {
    me = () => new Response('<html>Login</html>', { headers: { 'Content-Type': 'text/html' } })
    mount('/app/')
    await screen.findByRole('heading', { name: 'Войти в систему' })
    expect(screen.queryByText('Реестр организаций')).not.toBeInTheDocument()
  })

  it('works with StrictMode startup effect cleanup', async () => {
    me = () => Response.json(serverUser)
    mount('/app/', true)
    expect(await screen.findByText('Реестр организаций')).toBeInTheDocument()
  })

  it('rejects a session without an explicit password-change flag', async () => {
    me = () => Response.json({ id: 42, username: 'employee', full_name: 'Employee', role: 'ADMIN' })
    mount('/app/')
    expect(await screen.findByRole('alert')).toHaveTextContent('некорректные данные пользователя')
    expect(screen.queryByText('Реестр организаций')).not.toBeInTheDocument()
  })

  it('does not unlock routes if the refreshed user still needs a password change', async () => {
    me = () => Response.json({ ...serverUser, need_password_change: true })
    handle((path) =>
      path === '/api/auth/change-password' ? new Response(null, { status: 204 }) : undefined,
    )
    mount('/app/change-password')
    await screen.findByLabelText('Текущий пароль')
    passwordForm()
    expect(await screen.findByRole('alert')).toHaveTextContent('по-прежнему требует сменить пароль')
    expect(screen.getByTestId('location')).toHaveTextContent('/change-password')
  })

  it('treats logout 401 as an already absent session', async () => {
    me = () => Response.json(serverUser)
    handle((path) => (path === '/api/auth/logout' ? unauthorized() : undefined))
    mount('/app/')
    await screen.findByText('Реестр организаций')
    fireEvent.click(screen.getByRole('button', { name: 'Выйти из аккаунта' }))
    await screen.findByRole('heading', { name: 'Войти в систему' })
    expect(screen.queryByText(serverUser.full_name)).not.toBeInTheDocument()
  })
})






