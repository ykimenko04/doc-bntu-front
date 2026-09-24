import { apiRequest } from '../../../shared/api/client'
import type { Status } from '../../../shared/types'
import type { ApplicationRegistryItem } from '../model/types'

type ApplicationRegistryResponse = {
  items: ApplicationRegistryItem[]
  total: number
}

function normalizeListResponse(data: unknown): ApplicationRegistryResponse {
  if (Array.isArray(data)) return { items: data as ApplicationRegistryItem[], total: data.length }
  if (data && typeof data === 'object') {
    const items = Array.isArray((data as any).items) ? (data as any).items : []
    const total = typeof (data as any).total === 'number' ? (data as any).total : items.length
    return { items, total }
  }
  return { items: [], total: 0 }
}

export async function listApplicationRegistry(): Promise<ApplicationRegistryItem[]> {
  const data = await apiRequest<unknown>('/api/applications')
  return normalizeListResponse(data).items
}

export type ApplicationDetails = {
  id: number
  number: string
  organization: { id: number; name: string }
  receivedAt?: string
  signedAt?: string
  faculties?: string[]
  status?: Status
  scan?: { name: string; url: string }
  [key: string]: unknown
}

export async function getApplication(id: number): Promise<ApplicationDetails> {
  const data = await apiRequest<ApplicationDetails>(`/api/applications/${id}`)
  return data
}