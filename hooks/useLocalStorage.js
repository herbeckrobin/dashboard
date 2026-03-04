// localStorage Hook mit SSR-Safety

import { useState, useEffect } from 'react'

export default function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) setValue(JSON.parse(stored))
    } catch {}
  }, [key])

  const setStored = (newValue) => {
    setValue(newValue)
    try { localStorage.setItem(key, JSON.stringify(newValue)) } catch {}
  }

  return [value, setStored]
}
