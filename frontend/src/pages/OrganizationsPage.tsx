import { ArrowUpRight, ChevronDown, ChevronRight, Folder, Plus, Search } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { listOrganizations, type OrganizationRegistryRow } from '../entities/organization'
import { getErrorMessage } from '../shared/api/client'
import { useModalAccessibility } from '../shared/hooks/useModalAccessibility'
import { useFaculties } from '../shared/hooks/useFaculties'
import { PageHeader } from '../shared/ui/PageHeader'
import { Select } from '../shared/ui/Select'
import { StatusBadge } from '../shared/ui/StatusBadge'
import styles from './OrganizationsPage.module.css'

type NewOrganizationForm = {
  shortName: string
  fullName: string
  legalAddress: string
  department: string
}

const initialNewOrganization: NewOrganizationForm = {
  shortName: '',
  fullName: '',
  legalAddress: '',
  department: '',
}

export function OrganizationsPage() {
  const { faculties: facultyNames } = useFaculties()

  const [query, setQuery] = useState('')
  const [facultyQuery, setFacultyQuery] = useState('')
  const [selectedFaculty, setSelectedFaculty] = useState('Все факультеты')
  const [year, setYear] = useState('Любой год окончания')

  const [rows, setRows] = useState<OrganizationRegistryRow[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [page, setPage] = useState(1)
  const pageSize = 50

  const [isCreateModalOpen, setCreateModalOpen] = useState(false)
  const [newOrganization, setNewOrganization] =
    useState<NewOrganizationForm>(initialNewOrganization)
  const createDialogRef = useModalAccessibility<HTMLFormElement>(
    () => setCreateModalOpen(false),
    isCreateModalOpen,
  )

  useEffect(() => {
    let isCurrent = true

    setLoading(true)
    setError('')

    void listOrganizations({
      query: query.trim(),
      faculty: selectedFaculty === 'Все факультеты' ? '' : selectedFaculty,
      year: year === 'Любой год окончания' ? '' : year,
      page,
      pageSize,
    })
      .then((response) => {
        if (!isCurrent) return
        setRows(response.items)
      })
      .catch((error) => {
        if (!isCurrent) return
        setError(getErrorMessage(error))
        setRows([])
      })
      .finally(() => {
        if (!isCurrent) return
        setLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [query, selectedFaculty, year, page])

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!query ||
            `${row.name} ${row.contractNumber} ${row.specialties}`
              .toLowerCase()
              .includes(query.toLowerCase())) &&
          (selectedFaculty === 'Все факультеты' || row.faculty === selectedFaculty) &&
          (!facultyQuery || row.faculty.toLowerCase().includes(facultyQuery.toLowerCase())),
      ),
    [query, facultyQuery, selectedFaculty, rows],
  )

  const resetFilters = () => {
    setQuery('')
    setFacultyQuery('')
    setSelectedFaculty('Все факультеты')
    setYear('Любой год окончания')
    setPage(1)
  }

  const goToStatistics = () =>
    document
      .getElementById('organization-stats')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const updateNewOrganization = (field: keyof NewOrganizationForm, value: string) =>
    setNewOrganization((current) => ({ ...current, [field]: value }))

  const saveNewOrganization = (event: FormEvent) => {
    event.preventDefault()
    // API создания организации будет добавлен позже.
    setCreateModalOpen(false)
    setNewOrganization(initialNewOrganization)
  }

  return (
    <>
      <PageHeader
        eyebrow="РЕЕСТР"
        title="Организации"
        description="Компании-заказчики кадров и связанные с ними договоры"
        action={
          <div className={styles.actions}>
            <button className="secondary" type="button" onClick={goToStatistics}>
              К статистике
            </button>
            <button className="primary" type="button" onClick={() => setCreateModalOpen(true)}>
              <Plus size={17} /> Добавить организацию
            </button>
          </div>
        }
      />

      {error && (
        <div className="page-notification is-error" role="alert">
          {error}
        </div>
      )}

      {isCreateModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCreateModalOpen(false)
          }}
        >
          <form
            ref={createDialogRef}
            className="new-organization-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-organization-title"
            tabIndex={-1}
            onSubmit={saveNewOrganization}
          >
            <h2 id="new-organization-title">Новая организация</h2>
            <p style={{ marginTop: 0, color: '#7c8799', fontSize: 12 }}>
              Создание организаций будет доступно после подключения API.
            </p>
            <label className="new-organization-field">
              Краткое наименование
              <input
                value={newOrganization.shortName}
                onChange={(event) => updateNewOrganization('shortName', event.target.value)}
                required
              />
            </label>
            <label className="new-organization-field">
              Полное наименование
              <input
                value={newOrganization.fullName}
                onChange={(event) => updateNewOrganization('fullName', event.target.value)}
                required
              />
            </label>
            <label className="new-organization-field">
              Юридический адрес
              <input
                value={newOrganization.legalAddress}
                onChange={(event) => updateNewOrganization('legalAddress', event.target.value)}
                required
              />
            </label>
            <label className="new-organization-field">
              Ведомство
              <input
                value={newOrganization.department}
                onChange={(event) => updateNewOrganization('department', event.target.value)}
              />
            </label>
            <button className="primary new-organization-submit" type="submit" disabled>
              Создать карточку
            </button>
          </form>
        </div>
      )}

      <section className={styles.registry}>
        <aside className={styles.facultyTree}>
          <div className={styles.facultyTitle}>ДЕРЕВО ФАКУЛЬТЕТОВ</div>
          <div className={styles.facultySearch}>
            <Search size={14} />
            <input
              value={facultyQuery}
              onChange={(event) => setFacultyQuery(event.target.value)}
              placeholder="Поиск в дереве"
            />
          </div>
          <button
            type="button"
            className={`${styles.facultyRoot} ${selectedFaculty === 'Все факультеты' ? styles.selected : ''}`}
            onClick={() => {
              setSelectedFaculty('Все факультеты')
              setPage(1)
            }}
          >
            <ChevronDown size={13} /> <span>Все факультеты</span>
            <b>{rows.length}</b>
          </button>
          {facultyNames
            .filter((name) => !facultyQuery || name.toLowerCase().includes(facultyQuery.toLowerCase()))
            .map((name) => (
              <button
                type="button"
                className={`${styles.facultyItem} ${selectedFaculty === name ? styles.selected : ''}`}
                key={name}
                onClick={() => {
                  setSelectedFaculty(name)
                  setPage(1)
                }}
              >
                <ChevronRight size={13} />
                <Folder size={13} />
                <span>{name}</span>
                <b>{rows.filter((row) => row.faculty === name).length}</b>
              </button>
            ))}
        </aside>

        <div className={styles.registryMain}>
          <div className={styles.toolbar}>
            <div className={styles.registrySearch}>
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                }}
                placeholder="Организация, номер или код специальности"
              />
            </div>
            <Select
              className="registry-filter-select"
              value={selectedFaculty}
              onChange={(value) => {
                setSelectedFaculty(value)
                setPage(1)
              }}
              searchable
              searchPlaceholder="Поиск факультета"
              options={['Все факультеты', ...facultyNames].map((name) => ({
                value: name,
                label: name,
              }))}
            />
            <Select
              className="registry-filter-select registry-year-select"
              value={year}
              onChange={(value) => {
                setYear(value)
                setPage(1)
              }}
              options={['Любой год окончания', '2030', '2029', '2028'].map((value) => ({
                value,
                label: value,
              }))}
            />
            <button className={styles.filterButton} type="button" onClick={resetFilters}>
              Сбросить фильтры
            </button>
          </div>

          <div className={styles.tableWrap}>
            {isLoading ? (
              <div className="empty" role="status">
                Загрузка…
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Организация</th>
                    <th>Факультет</th>
                    <th>Номер договора / действующая редакция</th>
                    <th>Статус</th>
                    <th>Дата окончания</th>
                    <th>Специальности факультета</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={`${row.id}-${row.faculty}-${row.contractNumber}`}>
                      <td>
                        <Link to={`/organizations/${row.id}`} className={styles.organization}>
                          {row.name}
                          <ArrowUpRight size={12} />
                        </Link>
                      </td>
                      <td>{row.faculty}</td>
                      <td>{row.contractNumber}</td>
                      <td>{row.status ? <StatusBadge status={row.status} /> : '—'}</td>
                      <td>
                        <span className={styles.date}>{row.endDate}</span>
                      </td>
                      <td>{row.specialties}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, padding: 10, alignItems: 'center' }}>
            <button
              className="secondary"
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Назад
            </button>
            <span style={{ fontSize: 12, color: '#7c8799' }}>Страница {page}</span>
            <button
              className="secondary"
              type="button"
              disabled={rows.length < pageSize}
              onClick={() => setPage((value) => value + 1)}
            >
              Вперед
            </button>
          </div>
        </div>
      </section>

      <div id="organization-stats" className="stats" style={{ marginTop: 28 }}>
        <div>
          <span>Всего организаций</span>
          <strong>24</strong>
          <small className="positive">+3 за месяц</small>
        </div>
        <div>
          <span>Активные договоры</span>
          <strong>38</strong>
          <small>из 51 договора</small>
        </div>
        <div>
          <span>Требуют внимания</span>
          <strong className="accent-text">6</strong>
          <small>документов требуют внимания</small>
        </div>
      </div>
    </>
  )
}