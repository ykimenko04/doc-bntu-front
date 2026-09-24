import { ArrowLeft, Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getApplication, type ApplicationDetails } from '../entities/application'
import { getErrorMessage } from '../shared/api/client'
import { PageHeader } from '../shared/ui/PageHeader'
import { StatusBadge } from '../shared/ui/StatusBadge'

export function ApplicationPage() {
  const { id } = useParams()
  const applicationId = Number(id)

  const [application, setApplication] = useState<ApplicationDetails | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true
    if (!Number.isFinite(applicationId)) {
      setError('Некорректный идентификатор заявки')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    void getApplication(applicationId)
      .then((item) => {
        if (isCurrent) setApplication(item)
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
  }, [applicationId])

  if (isLoading) return <div className="page-loading">Загрузка заявки…</div>

  if (error)
    return (
      <div className="page-loading" role="alert">
        {error}
      </div>
    )

  if (!application) return <div className="page-loading">Заявка не найдена</div>

  return (
    <>
      <Link className="back-link" to="/applications">
        <ArrowLeft size={16} /> Все заявки
      </Link>
      <PageHeader
        eyebrow={`ЗАЯВКА · #${application.id}`}
        title={application.number}
        description={application.organization?.name ?? '—'}
        action={
          application.scan?.url ? (
            <a className="secondary" href={application.scan.url} download>
              <Download size={17} /> Скачать скан
            </a>
          ) : undefined
        }
      />
      <div className="application-layout">
        <div className="panel">
          <div className="panel-title">
            <h2>Детали заявки</h2>
            {application.status && <StatusBadge status={application.status} />}
          </div>
          <dl className="data-list">
            <div>
              <dt>Организация</dt>
              <dd>{application.organization?.name ?? '—'}</dd>
            </div>
            <div>
              <dt>Факультеты</dt>
              <dd>{application.faculties?.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>Дата получения</dt>
              <dd>{application.receivedAt ?? '—'}</dd>
            </div>
            <div>
              <dt>Дата подписания</dt>
              <dd>{application.signedAt ?? '—'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </>
  )
}