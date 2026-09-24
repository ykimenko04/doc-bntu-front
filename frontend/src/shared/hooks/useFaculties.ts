import { useEffect, useState } from 'react'

import { listFaculties } from '../api/dictionaries'

let cachedFaculties: string[] | null = null
let cachedPromise: Promise<string[]> | null = null

export function useFaculties() {
  const [faculties, setFaculties] = useState<string[]>(cachedFaculties ?? [])
  const [isLoading, setLoading] = useState(!cachedFaculties)
  const [error, setError] = useState('')

  useEffect(() => {
    if (cachedFaculties) return

    let isCurrent = true
    setLoading(true)
    setError('')

    const promise = cachedPromise ?? (cachedPromise = listFaculties())

    void promise
      .then((items) => {
        cachedFaculties = items
        if (isCurrent) setFaculties(items)
      })
      .catch(() => {
        if (isCurrent) setError('Не удалось загрузить список факультетов.')
      })
      .finally(() => {
        if (isCurrent) setLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  return { faculties, isLoading, error }
}