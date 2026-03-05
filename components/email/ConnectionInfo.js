// IMAP/SMTP Verbindungsinfo anzeigen

import { useState } from 'react'

export default function ConnectionInfo({ email, mailDomain = '' }) {
  const [copied, setCopied] = useState(false)

  const settings = [
    {
      title: 'Eingehend (IMAP)',
      rows: [
        { label: 'Server', value: mailDomain || 'mail.example.de' },
        { label: 'Port', value: '993' },
        { label: 'Verschluesselung', value: 'SSL/TLS' },
      ]
    },
    {
      title: 'Ausgehend (SMTP)',
      rows: [
        { label: 'Server', value: mailDomain || 'mail.example.de' },
        { label: 'Port', value: '587' },
        { label: 'Verschluesselung', value: 'STARTTLS' },
      ]
    }
  ]

  const allText = settings.map(s =>
    `${s.title}:\n` + s.rows.map(r => `  ${r.label}: ${r.value}`).join('\n')
  ).join('\n\n') + `\n\nBenutzername: ${email || 'benutzer@domain.de'}`

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(allText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settings.map(section => (
          <div key={section.title} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <h4 className="text-sm font-medium text-white mb-3">{section.title}</h4>
            <dl className="space-y-2">
              {section.rows.map(row => (
                <div key={row.label} className="flex justify-between">
                  <dt className="text-sm text-gray-400">{row.label}</dt>
                  <dd className="text-sm text-white font-mono">{row.value}</dd>
                </div>
              ))}
              <div className="flex justify-between">
                <dt className="text-sm text-gray-400">Benutzername</dt>
                <dd className="text-sm text-white font-mono">{email || 'benutzer@domain.de'}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <button onClick={handleCopyAll}
        className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
        {copied ? 'Kopiert!' : 'Alle Einstellungen kopieren'}
      </button>
    </div>
  )
}
