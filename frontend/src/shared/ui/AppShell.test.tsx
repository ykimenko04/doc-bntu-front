import '../../styles.css'

import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Providers } from '../../app/providers'
import { AppShell } from './AppShell'

describe('AppShell content layout', () => {
  it('starts with the sidebar collapsed', () => {
    const { container } = render(
      <MemoryRouter>
        <Providers>
          <AppShell><div /></AppShell>
        </Providers>
      </MemoryRouter>,
    )

    expect(container.querySelector('.app-shell')).toHaveClass('sidebar-collapsed')
    expect(container.querySelector('.workspace-label')).toHaveClass('workspace-label-hidden')
  })

  beforeEach(() => {
    localStorage.setItem('bntu-auth', '1')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('uses a wider bounded content area with reduced desktop side padding', () => {
    render(
      <MemoryRouter>
        <Providers>
          <AppShell>
            <p>Содержимое страницы</p>
          </AppShell>
        </Providers>
      </MemoryRouter>,
    )

    const content = screen.getByText('Содержимое страницы').closest('section')
    expect(content).toHaveClass('content')

    const tokens = getComputedStyle(document.documentElement)
    expect(tokens.getPropertyValue('--content-max-width').trim()).toBe('1600px')
    expect(tokens.getPropertyValue('--content-padding-block').trim()).toBe('40px')
    expect(tokens.getPropertyValue('--content-padding-inline').trim()).toBe('32px')
  })

  it('shows the current section in breadcrumbs and links the university home', () => {
    render(
      <MemoryRouter initialEntries={['/users']}>
        <Providers>
          <AppShell>
            <p>Содержимое страницы</p>
          </AppShell>
        </Providers>
      </MemoryRouter>,
    )

    const breadcrumb = within(screen.getByRole('navigation', { name: 'Хлебные крошки' }))
    expect(breadcrumb.getByRole('link', { name: 'БНТУ' })).toHaveAttribute('href', '/')
    expect(breadcrumb.getByText('Пользователи')).toHaveAttribute('aria-current', 'page')
  })

  it('navigates to a parent section when its breadcrumb is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/applications/42']}>
        <Providers>
          <AppShell>
            <p>Содержимое страницы</p>
          </AppShell>
        </Providers>
      </MemoryRouter>,
    )

    const breadcrumb = within(screen.getByRole('navigation', { name: 'Хлебные крошки' }))
    fireEvent.click(breadcrumb.getByRole('link', { name: 'Заявки' }))

    expect(breadcrumb.getByText('Заявки')).toHaveAttribute('aria-current', 'page')
  })
})
