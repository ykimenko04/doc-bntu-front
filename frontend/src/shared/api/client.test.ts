import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiRequest, getErrorMessage, subscribeApiErrors } from './client'

afterEach(() => vi.unstubAllGlobals())

function respond(response: Response) {
  const fetch = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetch)
  return fetch
}

describe('apiRequest', () => {
  it('includes cookies even when the caller supplies another credentials mode', async () => {
    const fetch = respond(Response.json({ ok: true }))
    await expect(
      apiRequest('/api/example', { credentials: 'omit', method: 'POST', body: '{}' }),
    ).resolves.toEqual({ ok: true })
    const init = fetch.mock.calls[0][1]
    expect(init.credentials).toBe('include')
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(init.headers.has('Authorization')).toBe(false)
  })

  it('preserves custom headers and lets the browser set multipart boundaries', async () => {
    const fetch = respond(new Response(null, { status: 204 }))
    await apiRequest('/api/import', {
      method: 'POST',
      body: new FormData(),
      headers: { 'X-Test': 'yes' },
    })
    expect(fetch.mock.calls[0][1].headers.get('X-Test')).toBe('yes')
    expect(fetch.mock.calls[0][1].headers.has('Content-Type')).toBe(false)
  })

  it('accepts 204 without reading a response body', async () => {
    respond(new Response(null, { status: 204 }))
    await expect(apiRequest('/api/auth/logout')).resolves.toBeUndefined()
  })

  it.each([false, true])('rejects HTML, including followed redirects (%s)', async (redirected) => {
    const response = new Response('<html>Login</html>', {
      headers: { 'Content-Type': 'text/html' },
    })
    Object.defineProperty(response, 'redirected', { value: redirected })
    respond(response)
    await expect(apiRequest('/api/auth/me')).rejects.toThrow('Ожидался JSON')
  })

  it('rejects malformed JSON', async () => {
    respond(new Response('{', { headers: { 'Content-Type': 'application/json' } }))
    await expect(apiRequest('/api/example')).rejects.toThrow('некорректный JSON')
  })

  it('notifies about 401 and still rejects the operation', async () => {
    respond(Response.json({ detail: 'unauthorized' }, { status: 401 }))
    const listener = vi.fn()
    const unsubscribe = subscribeApiErrors(listener)
    try {
      await expect(apiRequest('/api/example')).rejects.toMatchObject({ status: 401 })
      expect(listener).toHaveBeenCalledWith(expect.any(ApiError))
    } finally {
      unsubscribe()
    }
  })

  it.each(['/api/auth/login', '/api/auth/me'])(
    'allows local handling of 401 for %s',
    async (path) => {
      respond(Response.json({ detail: 'unauthorized' }, { status: 401 }))
      const listener = vi.fn()
      const unsubscribe = subscribeApiErrors(listener)
      try {
        await expect(
          apiRequest(path, undefined, { localUnauthorized: true }),
        ).rejects.toMatchObject({ status: 401 })
        expect(listener).not.toHaveBeenCalled()
      } finally {
        unsubscribe()
      }
    },
  )

  it('reports 403 to the UI and rejects instead of returning success', async () => {
    respond(Response.json({ detail: 'forbidden' }, { status: 403 }))
    const listener = vi.fn()
    const unsubscribe = subscribeApiErrors(listener)
    try {
      await expect(apiRequest('/api/example')).rejects.toThrow(
        'Недостаточно прав для выполнения действия',
      )
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 403,
          message: 'Недостаточно прав для выполнения действия',
        }),
      )
    } finally {
      unsubscribe()
    }
  })

  it('uses the documented detail error', async () => {
    respond(Response.json({ detail: 'Текущий пароль указан неверно' }, { status: 400 }))
    await expect(apiRequest('/api/auth/change-password')).rejects.toThrow(
      'Текущий пароль указан неверно',
    )
  })

  it('distinguishes network failure from server validation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(apiRequest('/api/auth/login')).rejects.toThrow(TypeError)
    expect(getErrorMessage(new TypeError('Failed to fetch'))).toContain('Проверьте подключение')
  })

  it('keeps legacy binary downloads working', async () => {
    respond(new Response('xlsx', { headers: { 'Content-Type': 'application/octet-stream' } }))
    const blob = await apiRequest<Blob>('/export')
    expect(await blob.text()).toBe('xlsx')
  })
})
