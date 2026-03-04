// Wiederverwendbarer Hook fuer API-Speicher-Pattern

import { useState } from 'react'

export default function useApiSave() {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const save = async (url, body, successMsg) => {
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      setMessage({
        type: data.success ? 'success' : 'error',
        text: data.success ? successMsg : (data.error || 'Fehler')
      })
    } catch {
      setMessage({ type: 'error', text: 'Verbindungsfehler' })
    }
    setSaving(false)
  }

  return { saving, message, save }
}
