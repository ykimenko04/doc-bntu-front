import { apiRequest } from './client'

export type Specialty = {
  id: number
  code: string
  name: string
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value))
    return value
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'name' in item && typeof item.name === 'string')
          return item.name
        return ''
      })
      .filter(Boolean)

  if (value && typeof value === 'object' && 'items' in value && Array.isArray((value as any).items))
    return normalizeStringArray((value as any).items)

  return []
}

export async function listFaculties(): Promise<string[]> {
  const data = await apiRequest<unknown>('/api/faculties')
  return normalizeStringArray(data)
}

export async function listSpecialties(): Promise<Specialty[]> {
  const data = await apiRequest<unknown>('/api/specialties')
  const raw =
    Array.isArray(data) ? data : data && typeof data === 'object' && Array.isArray((data as any).items) ? (data as any).items : []

  return raw
    .map((item: any) => {
      if (!item || typeof item !== 'object') return null
      const id = typeof item.id === 'number' ? item.id : Number(item.id)
      const code = typeof item.code === 'string' ? item.code : typeof item.value === 'string' ? item.value : ''
      const name = typeof item.name === 'string' ? item.name : typeof item.label === 'string' ? item.label : ''
      if (!Number.isFinite(id) || !code || !name) return null
      return { id, code, name }
    })
    .filter(Boolean) as Specialty[]
}