import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ApplicationRegistryItem } from '../entities/application'

import { ApplicationsPage } from './ApplicationsPage'

const demoApplications: ApplicationRegistryItem[] = [
  {
    id: 1,
    number: 'З-2026/086',
    organization: { id: 1, name: 'ОАО «Беларуськалий»' },
    receivedAt: '2026-09-16',
    signedAt: '2026-09-20',
    faculties: ['Машиностроительный', 'ФИТР'],
    status: 'Заявка',
    scan: {
      name: 'З-2026-086.txt',
      url: 'data:text/plain;charset=utf-8,%D0%A1%D0%BA%D0%B0%D0%BD%20%D0%B7%D0%B0%D1%8F%D0%B2%D0%BA%D0%B8%20%D0%97-2026%2F086',
    },
  },
  {
    id: 2,
    number: 'З-2026/084',
    organization: { id: 2, name: 'ОАО «МТЗ»' },
    receivedAt: '2026-09-12',
    signedAt: '2026-09-18',
    faculties: ['ФИТР'],
    status: 'Закрыт',
  },
  {
    id: 3,
    number: 'З-2026/079',
    organization: { id: 3, name: 'ОАО «Гродно Азот»' },
    receivedAt: '2026-09-05',
    faculties: ['Энергетический'],
    status: 'Заявка',
    scan: {
      name: 'З-2026-079.txt',
      url: 'data:text/plain;charset=utf-8,%D0%A1%D0%BA%D0%B0%D0%BD%20%D0%B7%D0%B0%D1%8F%D0%B2%D0%BA%D0%B8%20%D0%97-2026%2F079',
    },
  },
  {
    id: 4,
    number: 'З-2026/071',
    organization: { id: 4, name: 'ОАО «БЕЛАЗ»' },
    receivedAt: '2026-08-28',
    signedAt: '2026-09-03',
    faculties: ['Машиностроительный', 'Энергетический'],
    status: 'Закрыт',
    scan: {
      name: 'З-2026-071.txt',
      url: 'data:text/plain;charset=utf-8,%D0%A1%D0%BA%D0%B0%D0%BD%20%D0%B7%D0%B0%D1%8F%D0%B2%D0%BA%D0%B8%20%D0%97-2026%2F071',
    },
  },
]

beforeEach(() => {
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()

    if (url.endsWith('/api/applications') || url === '/api/applications')
      return Response.json({ items: demoApplications, total: demoApplications.length })

    return Response.json({ detail: 'Not Found' }, { status: 404 })
  })

  vi.stubGlobal('fetch', fetch)
})

afterEach(() => vi.unstubAllGlobals())

function renderPage(path = '/applications') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ApplicationsPage />
    </MemoryRouter>,
  )
}

async function waitForRegistry() {
  return screen.findByRole('link', { name: 'З-2026/086' })
}

describe('ApplicationsPage', () => {
  it('renders registry records and scan states', async () => {
    renderPage()

    await waitForRegistry()

    expect(screen.getByText('Найдено заявок:')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Скачать скан заявки З-2026/086' })).toHaveAttribute(
      'href',
      expect.stringContaining('data:text/plain'),
    )
    expect(screen.getAllByText('Нет скана')).toHaveLength(1)
  })

  it('filters by application number after form submit', async () => {
    renderPage()
    await waitForRegistry()

    fireEvent.change(screen.getByPlaceholderText('Номер заявки или организация'), {
      target: { value: '  з-2026/084  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Фильтровать' }))

    expect(screen.getByRole('link', { name: 'З-2026/084' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'З-2026/086' })).not.toBeInTheDocument()
  })

  it('filters by organization and supports Enter form submission', async () => {
    renderPage()
    await waitForRegistry()

    fireEvent.change(screen.getByPlaceholderText('Номер заявки или организация'), {
      target: { value: 'Гродно Азот' },
    })
    fireEvent.submit(screen.getByRole('form', { name: 'Фильтры заявок' }))

    expect(screen.getByRole('link', { name: 'З-2026/079' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'З-2026/086' })).not.toBeInTheDocument()
  })

  it('filters by faculty and status together', async () => {
    renderPage()
    await waitForRegistry()

    fireEvent.click(screen.getByRole('button', { name: 'Факультет' }))
    fireEvent.click(screen.getByRole('option', { name: 'Машиностроительный' }))
    fireEvent.click(screen.getByRole('button', { name: 'Статус' }))
    fireEvent.click(screen.getByRole('option', { name: 'Закрыт' }))
    fireEvent.click(screen.getByRole('button', { name: 'Фильтровать' }))

    expect(screen.getByRole('link', { name: 'З-2026/071' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'З-2026/084' })).not.toBeInTheDocument()
  })

  it('shows an empty state and resets filters', async () => {
    renderPage()
    await waitForRegistry()

    fireEvent.change(screen.getByPlaceholderText('Номер заявки или организация'), {
      target: { value: 'несуществующая заявка' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Фильтровать' }))

    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить' }))

    expect(screen.getByRole('link', { name: 'З-2026/086' })).toBeInTheDocument()
  })

  it('restores applied filters from the URL', async () => {
    renderPage('/applications?status=Закрыт')
    await screen.findByRole('link', { name: 'З-2026/084' })

    expect(screen.getByRole('link', { name: 'З-2026/071' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'З-2026/086' })).not.toBeInTheDocument()
  })
})