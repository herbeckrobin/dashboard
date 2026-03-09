// Autoresponder-Konfiguration Modal (Profi: HTML-Signatur, Bild-Upload, Zeitraum)

import { useState, useRef } from 'react'

export default function AutoResponder({ account, onSave, onCancel }) {
  const existing = account.autoReply || {}
  const [form, setForm] = useState({
    enabled: existing.enabled || false,
    subject: existing.subject || 'Abwesenheitsnotiz',
    body: existing.body || '',
    htmlSignature: existing.htmlSignature || '',
    signatureImage: existing.signatureImage || null,
    startDate: existing.startDate || '',
    endDate: existing.endDate || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('message') // message | signature | schedule | preview
  const fileInputRef = useRef(null)
  const sigFileRef = useRef(null)

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      setError('Bild zu gross (max 500 KB)')
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Nur Bilddateien erlaubt')
      return
    }
    setError('')
    const reader = new FileReader()
    reader.onload = () => setForm(f => ({ ...f, signatureImage: reader.result }))
    reader.readAsDataURL(file)
  }

  const handleSignatureFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 100 * 1024) {
      setError('HTML-Datei zu gross (max 100 KB)')
      return
    }
    setError('')
    const reader = new FileReader()
    reader.onload = () => setForm(f => ({ ...f, htmlSignature: reader.result }))
    reader.readAsText(file)
  }

  const handleSave = async () => {
    setError('')
    if (form.enabled && !form.subject) {
      setError('Betreff ist erforderlich')
      return
    }
    if (form.enabled && !form.body) {
      setError('Abwesenheitstext ist erforderlich')
      return
    }
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      setError('Startdatum muss vor dem Enddatum liegen')
      return
    }

    setSaving(true)
    try {
      // HTML-Body zusammenbauen: Text + Signatur
      const htmlParts = []
      htmlParts.push(form.body.replace(/\n/g, '<br>'))
      if (form.htmlSignature) {
        htmlParts.push('<br><br>')
        htmlParts.push(form.htmlSignature)
      }

      await onSave({
        enabled: form.enabled,
        subject: form.subject,
        body: form.body,
        htmlBody: htmlParts.join(''),
        htmlSignature: form.htmlSignature,
        signatureImage: form.signatureImage || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      })
    } catch (err) {
      setError(err.message || 'Fehler beim Speichern')
      setSaving(false)
    }
  }

  // Autoresponder-Status Text
  const getStatusText = () => {
    if (!form.enabled) return null
    const now = new Date().toISOString().split('T')[0]
    if (form.startDate && now < form.startDate) return { text: 'Geplant', color: 'text-blue-400 bg-blue-600/20' }
    if (form.endDate && now > form.endDate) return { text: 'Abgelaufen', color: 'text-orange-400 bg-orange-600/20' }
    return { text: 'Aktiv', color: 'text-green-400 bg-green-600/20' }
  }

  const status = getStatusText()

  // Vorschau HTML generieren
  const getPreviewHtml = () => {
    let html = `<div style="font-family:sans-serif;font-size:14px;color:#333;max-width:600px;">`
    html += form.body.replace(/\n/g, '<br>')
    if (form.htmlSignature) {
      html += '<br><br>' + form.htmlSignature
    }
    if (form.signatureImage && !form.htmlSignature?.includes('<img')) {
      html += `<br><br><img src="${form.signatureImage}" alt="Signatur" style="max-width:100%;height:auto;" />`
    }
    html += '</div>'
    return html
  }

  const tabs = [
    { id: 'message', label: 'Nachricht' },
    { id: 'signature', label: 'Signatur' },
    { id: 'schedule', label: 'Zeitraum' },
    { id: 'preview', label: 'Vorschau' },
  ]

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Autoresponder</h3>
            <span className="text-sm text-gray-400">{account.email}</span>
            {status && (
              <span className={`text-xs px-2 py-0.5 rounded ${status.color}`}>{status.text}</span>
            )}
          </div>

          {/* Ein/Aus Toggle */}
          <button onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
            className={`relative w-11 h-6 rounded-full transition-colors ${form.enabled ? 'bg-green-600' : 'bg-gray-600'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${form.enabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-sm rounded-t-lg transition-colors ${
                tab === t.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {/* Tab: Nachricht */}
          {tab === 'message' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Betreff</label>
                <input type="text" value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Abwesenheitsnotiz"
                  maxLength={200}
                  className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Abwesenheitstext</label>
                <textarea value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Vielen Dank fuer Ihre Nachricht. Ich bin derzeit nicht erreichbar..."
                  rows={6}
                  className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y font-mono" />
                <p className="text-xs text-gray-500 mt-1">Wird als Plain Text und HTML versendet. Zeilenumbrueche werden uebernommen.</p>
              </div>
            </div>
          )}

          {/* Tab: Signatur */}
          {tab === 'signature' && (
            <div className="space-y-4">
              {/* HTML-Signatur */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-gray-400">HTML-Signatur</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => sigFileRef.current?.click()}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                      HTML-Datei laden
                    </button>
                    {form.htmlSignature && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, htmlSignature: '' }))}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors">
                        Entfernen
                      </button>
                    )}
                  </div>
                </div>
                <textarea value={form.htmlSignature}
                  onChange={e => setForm(f => ({ ...f, htmlSignature: e.target.value }))}
                  placeholder="<table>&#10;  <tr>&#10;    <td><strong>Max Mustermann</strong></td>&#10;  </tr>&#10;</table>"
                  rows={8}
                  className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y font-mono text-green-300" />
                <input ref={sigFileRef} type="file" accept=".html,.htm" className="hidden"
                  onChange={handleSignatureFileUpload} />
                <p className="text-xs text-gray-500 mt-1">HTML-Code fuer deine E-Mail-Signatur. Wird unter dem Abwesenheitstext angezeigt.</p>
              </div>

              {/* Signatur-Bild */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-gray-400">Signatur-Bild (optional)</label>
                  {form.signatureImage && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, signatureImage: null }))}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors">
                      Entfernen
                    </button>
                  )}
                </div>

                {form.signatureImage ? (
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <img src={form.signatureImage} alt="Signatur" className="max-h-32 object-contain" />
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors">
                    <svg className="w-8 h-8 mx-auto mb-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-gray-400">Bild hochladen (PNG, JPG — max 500 KB)</p>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden"
                  onChange={handleImageUpload} />
                <p className="text-xs text-gray-500 mt-1">Wird als eingebettetes Bild in der Antwort-Mail mitgesendet (CID).</p>
              </div>
            </div>
          )}

          {/* Tab: Zeitraum */}
          {tab === 'schedule' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Ohne Zeitraum ist der Autoresponder dauerhaft aktiv (solange er eingeschaltet ist).
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Von (optional)</label>
                  <input type="date" value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Bis (optional)</label>
                  <input type="date" value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>

              {form.startDate && form.endDate && (
                <p className="text-sm text-gray-300">
                  Autoresponder aktiv vom <span className="text-white font-medium">{form.startDate}</span> bis <span className="text-white font-medium">{form.endDate}</span>.
                  Jeder Absender erhaelt nur einmal innerhalb von 24 Stunden eine Antwort.
                </p>
              )}

              {form.startDate || form.endDate ? (
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, startDate: '', endDate: '' }))}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors">
                  Zeitraum entfernen (dauerhaft aktiv)
                </button>
              ) : null}
            </div>
          )}

          {/* Tab: Vorschau */}
          {tab === 'preview' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 text-black">
                <div className="border-b border-gray-200 pb-3 mb-3 text-sm text-gray-600">
                  <p><strong>Von:</strong> {account.email}</p>
                  <p><strong>Betreff:</strong> {form.subject || 'Automatische Antwort'}</p>
                </div>
                <div dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
              </div>
              <p className="text-xs text-gray-500">
                So sieht die automatische Antwort ungefaehr aus. Die tatsaechliche Darstellung haengt vom E-Mail-Client des Empfaengers ab.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          <div className="flex justify-between items-center">
            {/* Schnell deaktivieren */}
            {existing.enabled && form.enabled && (
              <button type="button"
                onClick={() => { setForm(f => ({ ...f, enabled: false })); }}
                className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors">
                Deaktivieren
              </button>
            )}
            {(!existing.enabled || !form.enabled) && <div />}

            <div className="flex gap-3">
              <button type="button" onClick={onCancel}
                className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors">
                Abbrechen
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
                {saving ? 'Speichere...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
