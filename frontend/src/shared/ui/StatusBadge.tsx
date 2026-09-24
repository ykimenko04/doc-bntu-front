import type { Status } from '../types'

const statusClassName: Record<Status, string> = {
  Активен: 'status-active',
  Заявка: 'status-active',
  Закрыт: 'status-closed',
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={status }>{status}</span>
}