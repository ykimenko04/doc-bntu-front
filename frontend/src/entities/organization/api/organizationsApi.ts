import { apiRequest } from '../../../shared/api/client'
import type { Organization, Status } from '../../../shared/types'

export type OrganizationRegistryRow = Organization & {
  faculty: string
  contractNumber: string
  endDate: string
  specialties: string
}

export type OrganizationListResponse = {
  items: OrganizationRegistryRow[]
  total: number
}

function toQuery(params: Record<string, string | number | undefined | null>) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.set(key, String(value))
  })
  const suffix = query.toString()
  return suffix ? `?${suffix}` : ''
}

function normalizeListResponse(data: unknown): OrganizationListResponse {
  if (Array.isArray(data)) return { items: data as OrganizationRegistryRow[], total: data.length }
  if (data && typeof data === 'object') {
    const items = Array.isArray((data as any).items) ? (data as any).items : []
    const total = typeof (data as any).total === 'number' ? (data as any).total : items.length
    return { items, total }
  }
  return { items: [], total: 0 }
}

export async function listOrganizations(params?: {
  query?: string
  faculty?: string
  year?: string
  page?: number
  pageSize?: number
}): Promise<OrganizationListResponse> {
  const suffix = toQuery({
    query: params?.query ?? '',
    faculty: params?.faculty ?? '',
    year: params?.year ?? '',
    page: params?.page,
    page_size: params?.pageSize,
  })

  const data = await apiRequest<unknown>('/api/organizations' + suffix)
  return normalizeListResponse(data)
}

export type OrganizationDetails = {
  id: number
  name: string
  unp?: string
  contact?: string
  contracts?: number
  status?: Status
  requisites?: {
    shortName?: string
    fullName?: string
    address?: string
    department?: string
    phone?: string
  }
}

export async function getOrganization(id: number): Promise<OrganizationDetails> {
  const data = await apiRequest<unknown>(`/api/organizations/${id}`)
  return data as OrganizationDetails
}