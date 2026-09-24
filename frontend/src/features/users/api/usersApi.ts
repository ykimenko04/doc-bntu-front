import { apiRequest } from '../../../shared/api/client'
import type { Role } from '../../../shared/types'

export type UserDto = {
  id: number
  fullName: string
  username: string
  email?: string
  role: Role
  active?: boolean
}

type UserListResponse = { items: UserDto[]; total?: number }

function normalizeListResponse(data: unknown): UserDto[] {
  if (Array.isArray(data)) return data as UserDto[]
  if (data && typeof data === 'object' && Array.isArray((data as any).items)) return (data as any).items
  return []
}

export const usersApi = {
  list: async () => {
    const data = await apiRequest<unknown>('/api/users')
    return normalizeListResponse(data)
  },
  create: (values: { fullName: string; username: string; email?: string; role: Role; password?: string }) =>
    apiRequest<UserDto>('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    }),
  update: (id: number, values: { fullName: string; role: Role }) =>
    apiRequest<UserDto>(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    }),
}