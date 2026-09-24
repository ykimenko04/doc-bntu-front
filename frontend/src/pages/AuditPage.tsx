import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import { type FormEvent, Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { apiRequest } from '../shared/api/client'
import { PageHeader } from '../shared/ui/PageHeader'
import { Select } from '../shared/ui/Select'

type AuditAction = 'status' | 'upload' | 'create' | 'update' | 'delete'

type AuditRecord = {
  id: number
  date: string
  actor: string
  action: string
  kind: AuditAction
  object: string
  objectPath: string
  comment: string
  dateValue: string
  details?: { field: string; from: string; to: string }
}

const actionClass: Record<AuditAction, string> = {
  status: 'audit-action-status',
  upload: 'audit-action-upload',
  create: 'audit-action-create',
  update: 'audit-action-update',
  delete: 'audit-action-delete',
}

export function AuditPage() {
  const [records, setRecords] = useState<AuditRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [filtersVisible, setFiltersVisible] = useState(true)
  const [filters, setFilters] = useState({
    user: 'all',
    entity: 'all',
    action: 'all',
    dateFrom: '',
    dateTo: '',
    query: '',
  })
  const [draftFilters, setDraftFilters] = useState(filters)
  const userOptions = useMemo(() => {
    const actors = Array.from(new Set(records.map((record) => record.actor).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'ru'),
    )
    return [{ value: 'all', label: 'Все сотрудники' }, ...actors.map((actor) => ({ value: actor, label: actor }))]
  }, [records])

  const updateDraft = (field: keyof typeof draftFilters, value: string) =>
    setDraftFilters((current) => ({ ...current, [field]: value }))
  const applyFilters = (event: FormEvent) => {
    event.preventDefault()
    setFilters(draftFilters)
    setExpandedId(null)
  }
  const resetFilters = () => {
    const empty = { user: 'all', entity: 'all', action: 'all', dateFrom: '', dateTo: '', query: '' }
    setDraftFilters(empty)
    setFilters(empty)
    setExpandedId(null)
  }

  useEffect(() => {
    let isCurrent = true
    setIsLoading(true)
    setLoadError('')

    void apiRequest<any>('/api/audit')
      .then((response) => {
        if (!isCurrent) return
        const list = response && typeof response === 'object' && 'items' in response ? response.items : response
        setRecords(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!isCurrent) return
        setLoadError('Не удалось загрузить журнал событий. Проверьте доступ к серверу.')
        setRecords([])
      })
      .finally(() => {
        if (!isCurrent) return
        setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  const visibleRecords = records.filter((record) => {
    const searchable =
      `${record.actor} ${record.action} ${record.object} ${record.comment}`.toLowerCase()
    const matchesQuery = searchable.includes(filters.query.toLowerCase())
    const matchesUser = filters.user === 'all' || record.actor === filters.user
    const matchesAction = filters.action === 'all' || record.kind === filters.action
    const matchesEntity =
      filters.entity === 'all' ||
      (filters.entity === 'application' && record.object.startsWith('Заявка')) ||
      (filters.entity === 'organization' && record.object.startsWith('ОАО')) ||
      (filters.entity === 'contract' && record.object.startsWith('Договор'))
    const matchesFrom = !filters.dateFrom || record.dateValue >= filters.dateFrom
    const matchesTo = !filters.dateTo || record.dateValue <= filters.dateTo
    return matchesQuery && matchesUser && matchesAction && matchesEntity && matchesFrom && matchesTo
  })

  return (
    <>
      <PageHeader
        eyebrow="КОНТРОЛЬ"
        title="Журнал событий"
        description="История действий пользователей и изменений данных"
        action={
          <button
            className="audit-filter-toggle"
            type="button"
            onClick={() => setFiltersVisible((visible) => !visible)}
          >
            <SlidersHorizontal size={16} />
            {filtersVisible ? 'Скрыть фильтры' : 'Показать фильтры'}
          </button>
        }
      />
      {filtersVisible && (
        <form className="audit-filters" onSubmit={applyFilters}>
          <label>
            Сотрудник
            <Select
              value={draftFilters.user}
              onChange={(value) => updateDraft('user', value)}
              options={userOptions}
            />
          </label>
          <label>
            Тип объекта
            <Select
              value={draftFilters.entity}
              onChange={(value) => updateDraft('entity', value)}
              options={[
                { value: 'all', label: 'Все объекты' },
                { value: 'application', label: 'Заявки' },
                { value: 'contract', label: 'Договоры' },
                { value: 'organization', label: 'Организации' },
              ]}
            />
          </label>
          <label>
            Действие
            <Select
              value={draftFilters.action}
              onChange={(value) => updateDraft('action', value)}
              options={[
                { value: 'all', label: 'Все, кроме входов' },
                { value: 'status', label: 'Смена статуса' },
                { value: 'upload', label: 'Загружен файл' },
                { value: 'create', label: 'Создано' },
                { value: 'update', label: 'Изменено' },
                { value: 'delete', label: 'Удалено' },
              ]}
            />
          </label>
          <label>
            Период от
            <input
              type="date"
              value={draftFilters.dateFrom}
              onChange={(event) => updateDraft('dateFrom', event.target.value)}
            />
          </label>
          <label>
            до
            <input
              type="date"
              value={draftFilters.dateTo}
              onChange={(event) => updateDraft('dateTo', event.target.value)}
            />
          </label>
          <label className="audit-search">
            Поиск
            <input
              type="search"
              value={draftFilters.query}
              onChange={(event) => updateDraft('query', event.target.value)}
              placeholder="Объект, комментарий или изменение"
            />
          </label>
          <div className="audit-filter-actions">
            <button className="button-primary" type="submit">
              Применить
            </button>
            <button className="button-secondary" type="button" onClick={resetFilters}>
              Сбросить
            </button>
          </div>
        </form>
      )}
      <section className="audit-panel">
        {loadError && <div className="error-box">{loadError}</div>}
        {isLoading && <div className="note-box">Загрузка...</div>}
        <div className="audit-count">
          Найдено записей: <strong>{visibleRecords.length}</strong>
        </div>
        <div className="table-wrap audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Дата и время</th>
                <th>Пользователь</th>
                <th>Действие</th>
                <th>Объект</th>
                <th>Комментарий</th>
                <th aria-label="Подробности" />
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((record) => (
                <Fragment key={record.id}>
                  <tr
                    className={
                      expandedId === record.id ? 'audit-row audit-row-expanded' : 'audit-row'
                    }
                    key={record.id}
                    onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                  >
                    <td>{record.date}</td>
                    <td>{record.actor}</td>
                    <td>
                      <span className={`audit-action ${actionClass[record.kind]}`}>
                        {record.action}
                      </span>
                    </td>
                    <td>
                      <Link to={record.objectPath} onClick={(event) => event.stopPropagation()}>
                        {record.object}
                      </Link>
                    </td>
                    <td>{record.comment}</td>
                    <td className="audit-toggle">
                      {expandedId === record.id ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </td>
                  </tr>
                  {expandedId === record.id && (
                    <tr className="audit-details">
                      <td colSpan={6}>
                        {record.details ? (
                          <div className="audit-change">
                            <span>{record.details.field}</span>
                            <strong>{record.details.from}</strong>
                            <span className="audit-arrow">→</span>
                            <strong className="audit-new-value">{record.details.to}</strong>
                          </div>
                        ) : (
                          <span>{record.comment}</span>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {!visibleRecords.length && !isLoading && (
                <tr>
                  <td className="empty" colSpan={6}>
                    Записей не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
