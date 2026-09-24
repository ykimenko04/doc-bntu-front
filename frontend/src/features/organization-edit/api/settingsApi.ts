import { apiRequest } from '../../../shared/api/client'

export type SettingsDto = {
  full_name: string
  signer_position: string
  signer_name: string
  power_of_attorney_number: string
  power_of_attorney_date: string
  legal_address: string
  unp: string
  okpo: string
  bank_account: string
  bank_name: string
  bic: string
}

export const settingsApi = {
  getBntuRequisites: () => apiRequest<SettingsDto>('/api/settings'),
  saveBntuRequisites: (values: SettingsDto) =>
    apiRequest<void>('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    }),
}