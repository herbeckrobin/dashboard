// Git Clone URLs mit Kopier-Buttons (SSH + HTTPS)

import { useState } from 'react'

export default function GitCloneBox({ repo }) {
  const [copied, setCopied] = useState('')

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  if (!repo) return null

  const sshUrl = `ssh://git@rhdemo.de:222/${repo}.git`
  const httpsUrl = `https://git.rhdemo.de/${repo}.git`

  return (
    <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-3">Git Clone</h2>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide">SSH</label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 bg-gray-900 text-sm text-gray-300 px-3 py-2 rounded font-mono overflow-x-auto whitespace-nowrap">{sshUrl}</code>
            <button onClick={() => copyToClipboard(`git clone ${sshUrl}`, 'ssh')}
              className={`px-3 py-2 rounded text-sm flex-shrink-0 ${copied === 'ssh' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}>{copied === 'ssh' ? 'Kopiert!' : 'Kopieren'}</button>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide">HTTPS</label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 bg-gray-900 text-sm text-gray-300 px-3 py-2 rounded font-mono overflow-x-auto whitespace-nowrap">{httpsUrl}</code>
            <button onClick={() => copyToClipboard(`git clone ${httpsUrl}`, 'https')}
              className={`px-3 py-2 rounded text-sm flex-shrink-0 ${copied === 'https' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}>{copied === 'https' ? 'Kopiert!' : 'Kopieren'}</button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Für private Repos: Gitea-Passwort oder Token nötig</p>
        </div>
      </div>
    </div>
  )
}
