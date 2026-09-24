import { Building2, Check, LockKeyhole, Save, UserRound } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../app/providers'
import { settingsApi } from '../features/organization-edit/api/settingsApi'
import { PageHeader } from '../shared/ui/PageHeader'
import styles from './SettingsPage.module.css'

type SettingsSection = 'profile' | 'security' | 'requisites'

const initialRequisites = {
  fullName: 'Белорусский национальный технический университет',
  signerPosition: 'Проректор по учебной работе',
  signerName: 'Николайчик Юрий Александрович',
  powerOfAttorneyNumber: '01-19/1090',
  powerOfAttorneyDate: '2026-02-10',
  legalAddress: '220013, г. Минск, пр-т Независимости, 65',
  unp: '100 354 447',
  okpo: '02 071 903',
  bankAccount: 'BY69 AKBB 3632 9016 3601 3550 0000',
  bankName: 'ОАО «АСБ Беларусбанк»',
  bic: 'AKBBBY2X',
}

export function SettingsPage() {
  const { user } = useAuth()
  const [section, setSection] = useState<SettingsSection>('profile')
  const [requisites, setRequisites] = useState(initialRequisites)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSavingRequisites, setIsSavingRequisites] = useState(false)

  const showMessage = (text: string) => {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 2500)
  }

  const saveRequisites = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setIsSavingRequisites(true)
    try {
      await settingsApi.saveBntuRequisites({
        full_name: requisites.fullName,
        signer_position: requisites.signerPosition,
        signer_name: requisites.signerName,
        power_of_attorney_number: requisites.powerOfAttorneyNumber,
        power_of_attorney_date: requisites.powerOfAttorneyDate,
        legal_address: requisites.legalAddress,
        unp: requisites.unp,
        okpo: requisites.okpo,
        bank_account: requisites.bankAccount,
        bank_name: requisites.bankName,
        bic: requisites.bic,
      })
      showMessage('Реквизиты сохранены')
    } catch {
      setError('Не удалось сохранить реквизиты. Проверьте доступ к серверу.')
    } finally {
      setIsSavingRequisites(false)
    }
  }

  const updateRequisite = (field: keyof typeof initialRequisites, value: string) => {
    setRequisites((current) => ({ ...current, [field]: value }))
  }

  return (
    <>
      <PageHeader
        eyebrow="ЛИЧНЫЙ КАБИНЕТ"
        title="Настройки"
        description={
          section === 'requisites'
            ? 'Реквизиты БНТУ для формирования документов'
            : 'Управление личными данными и безопасностью учётной записи'
        }
      />
      <div className={styles.layout}>
        <div className={styles.nav}>
          <button
            className={`${styles.navItem} ${section === 'profile' ? styles.navItemActive : ''}`}
            type="button"
            onClick={() => setSection('profile')}
          >
            <UserRound size={17} />
            <span>
              <b>Профиль</b>
              <small>Личные данные</small>
            </span>
          </button>
          <button
            className={`${styles.navItem} ${section === 'security' ? styles.navItemActive : ''}`}
            type="button"
            onClick={() => setSection('security')}
          >
            <LockKeyhole size={17} />
            <span>
              <b>Безопасность</b>
              <small>Пароль и доступ</small>
            </span>
          </button>
          <button
            className={`${styles.navItem} ${section === 'requisites' ? styles.navItemActive : ''}`}
            type="button"
            onClick={() => setSection('requisites')}
          >
            <Building2 size={17} />
            <span>
              <b>Реквизиты БНТУ</b>
              <small>Для документов</small>
            </span>
          </button>
        </div>
        <div className={styles.content}>
          {section === 'profile' && (
            <div className={styles.panel}>
              <div className={styles.heading}>
                <div className={styles.icon}>
                  <UserRound size={18} />
                </div>
                <div>
                  <h2>Личные данные</h2>
                  <p>Эти данные используются для идентификации в системе.</p>
                </div>
              </div>
              <div className={styles.fields}>
                <label>
                  ФИО сотрудника
                  <input value={user?.fullName ?? ''} readOnly />
                </label>
                <label>
                  Логин
                  <input value={user?.username ?? ''} readOnly />
                </label>
                <label>
                  Роль
                  <input
                    value={user?.role === 'ADMIN' ? 'Администратор' : 'Руководитель'}
                    disabled
                  />
                </label>
              </div>
              <p>Данные профиля предоставлены сервером.</p>
            </div>
          )}
          {section === 'security' && (
            <div className={styles.panel}>
              <h2>Безопасность</h2>
              <Link className="primary" to="/change-password">
                Изменить пароль
              </Link>
            </div>
          )}
          {section === 'requisites' && (
            <form className={`${styles.panel} ${styles.requisitesPanel}`} onSubmit={saveRequisites}>
              <div className={styles.heading}>
                <div className={styles.icon}>
                  <Building2 size={18} />
                </div>
                <div>
                  <h2>Реквизиты БНТУ</h2>
                  <p>Данные используются при формировании документов.</p>
                </div>
              </div>
              <fieldset>
                <legend>Университет и подписант</legend>
                <div className={styles.fields}>
                  <label>
                    Полное наименование
                    <input
                      value={requisites.fullName}
                      onChange={(event) => updateRequisite('fullName', event.target.value)}
                    />
                  </label>
                  <label>
                    Должность подписанта
                    <input
                      value={requisites.signerPosition}
                      onChange={(event) => updateRequisite('signerPosition', event.target.value)}
                    />
                  </label>
                  <label>
                    ФИО подписанта
                    <input
                      value={requisites.signerName}
                      onChange={(event) => updateRequisite('signerName', event.target.value)}
                    />
                  </label>
                  <label>
                    Номер доверенности
                    <input
                      value={requisites.powerOfAttorneyNumber}
                      onChange={(event) =>
                        updateRequisite('powerOfAttorneyNumber', event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Дата доверенности
                    <input
                      type="date"
                      value={requisites.powerOfAttorneyDate}
                      onChange={(event) =>
                        updateRequisite('powerOfAttorneyDate', event.target.value)
                      }
                    />
                  </label>
                </div>
              </fieldset>
              <fieldset>
                <legend>Адрес и банковские реквизиты</legend>
                <div className={styles.fields}>
                  <label>
                    Юридический адрес
                    <input
                      value={requisites.legalAddress}
                      onChange={(event) => updateRequisite('legalAddress', event.target.value)}
                    />
                  </label>
                  <label>
                    УНП
                    <input
                      value={requisites.unp}
                      onChange={(event) => updateRequisite('unp', event.target.value)}
                    />
                  </label>
                  <label>
                    ОКПО
                    <input
                      value={requisites.okpo}
                      onChange={(event) => updateRequisite('okpo', event.target.value)}
                    />
                  </label>
                  <label>
                    Расчётный счёт
                    <input
                      value={requisites.bankAccount}
                      onChange={(event) => updateRequisite('bankAccount', event.target.value)}
                    />
                  </label>
                  <label>
                    Банк
                    <input
                      value={requisites.bankName}
                      onChange={(event) => updateRequisite('bankName', event.target.value)}
                    />
                  </label>
                  <label>
                    БИК
                    <input
                      value={requisites.bic}
                      onChange={(event) => updateRequisite('bic', event.target.value)}
                    />
                  </label>
                </div>
              </fieldset>
              <p className={styles.formHint}>
                Если поле оставить пустым, в сформированном документе будет прочерк «___».
              </p>
              <div className={styles.actions}>
                <button className="primary" type="submit" disabled={isSavingRequisites}>
                  <Save size={16} /> {isSavingRequisites ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
              {error && <div className={`${styles.error} error-box`}>{error}</div>}
            </form>
          )}
          {message && (
            <div className={styles.message}>
              <Check size={16} /> {message}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
