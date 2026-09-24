import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getOrganization, type OrganizationDetails } from '../entities/organization'
import { getErrorMessage } from '../shared/api/client'
import { PageHeader } from '../shared/ui/PageHeader'
import { StatusBadge } from '../shared/ui/StatusBadge'
import { OrganizationRequisites } from '../widgets/organization-details/OrganizationRequisites'

const emptyRequisites = {
  shortName: '—',
  fullName: '—',
  address: '—',
  department: '—',
  phone: '',
}

export function OrganizationPage() {
  const { id } = useParams()
  const organizationId = Number(id)

  const [organization, setOrganization] = useState<OrganizationDetails | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true

    if (!Number.isFinite(organizationId)) {
      setError('Некорректный идентификатор организации')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    void getOrganization(organizationId)
      .then((item) => {
        if (isCurrent) setOrganization(item)
      })
      .catch((error) => {
        if (isCurrent) setError(getErrorMessage(error))
      })
      .finally(() => {
        if (isCurrent) setLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [organizationId])

  const requisites = useMemo(() => {
    const r = organization?.requisites ?? {}
    return {
      shortName: r.shortName ?? organization?.name ?? '—',
      fullName: r.fullName ?? '—',
      address: r.address ?? '—',
      department: r.department ?? '—',
      phone: r.phone ?? '',
    }
  }, [organization])

  if (isLoading) return <div className="page-loading">Загрузка организации…</div>

  if (error)
    return (
      <div className="page-loading" role="alert">
        {error}
      </div>
    )

  if (!organization) return <div className="page-loading">Организация не найдена</div>

  return (
    <>
      <Link className="back-link" to="/">
        <ArrowLeft size={16} /> К реестру
      </Link>

      <PageHeader
        eyebrow={`ОРГАНИЗАЦИЯ · #${organizationId}`}
        title={organization.name}
        description={organization.unp ? `УНП: ${organization.unp}` : ''}
      />

      <div className="organization-top-grid">
        <OrganizationRequisites requisites={requisites ?? emptyRequisites} onEdit={() => {}} editable={false} />

        <section className="panel">
          <div className="panel-title">
            <h2>Сводка</h2>
            {organization.status && <StatusBadge status={organization.status} />}
          </div>
          <dl className="data-list">
            <div>
              <dt>Контакт</dt>
              <dd>{organization.contact ?? '—'}</dd>
            </div>
            <div>
              <dt>Договоров</dt>
              <dd>{organization.contracts ?? '—'}</dd>
            </div>
          </dl>
          <p style={{ margin: 0, color: '#7c8799', fontSize: 12 }}>
            Действия (создание договоров, регистрация заявок и т.д.) будут подключены после готовности API.
          </p>
        </section>
      </div>
    </>
  )
}