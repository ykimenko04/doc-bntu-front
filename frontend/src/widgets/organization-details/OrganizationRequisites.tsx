import { Building2 } from 'lucide-react'

import styles from './OrganizationRequisites.module.css'

export type OrganizationRequisitesData = {
  shortName: string
  fullName: string
  address: string
  department: string
  phone: string
}

export function OrganizationRequisites({
  requisites,
  onEdit,
  editable = true,
}: {
  requisites: OrganizationRequisitesData
  onEdit: () => void
  editable?: boolean
}) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>
        <Building2 size={15} /> Реквизиты
      </h3>
      <dl className={styles.details}>
        <div className={styles.detail}>
          <dt className={styles.label}>Адрес</dt>
          <dd className={styles.value}>{requisites.address}</dd>
        </div>
        <div className={styles.detail}>
          <dt className={styles.label}>Ведомство</dt>
          <dd className={styles.value}>{requisites.department}</dd>
        </div>
        <div className={styles.detail}>
          <dt className={styles.label}>Телефон</dt>
          <dd className={styles.value}>{requisites.phone || '—'}</dd>
        </div>
      </dl>
      {editable && (
        <button className={styles.editButton} type="button" onClick={onEdit}>
          Редактировать реквизиты
        </button>
      )}
    </section>
  )
}