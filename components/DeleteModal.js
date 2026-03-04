// Loesch-Bestaetigungsdialog mit optionalem Gitea-Repo-Loeschen

import { useState } from 'react'

export default function DeleteModal({ project, onConfirm, onClose }) {
  const [deleteRepoChecked, setDeleteRepoChecked] = useState(false)
  const [deleteRepoConfirm, setDeleteRepoConfirm] = useState('')

  const handleDelete = () => {
    // Optimistic: sofort UI updaten, API im Hintergrund
    onConfirm(project.id)
    fetch(`/api/projects/${project.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteRepo: deleteRepoChecked })
    })
      .then(r => r.json())
      .then(data => {
        if (!data.success) alert('Fehler beim Löschen: ' + (data.error || 'Unbekannter Fehler'))
      })
      .catch(() => alert('Fehler beim Löschen: Netzwerkfehler'))
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-2">Projekt löschen</h2>
        <p className="text-gray-400 text-sm mb-4">
          <span className="text-white font-semibold">{project.name}</span> wird unwiderruflich gelöscht.
          Das App-Verzeichnis, die nginx-Konfiguration und der PM2-Prozess werden entfernt.
        </p>

        {project.repo && (
          <div className="bg-gray-900 rounded-lg p-4 mb-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={deleteRepoChecked} onChange={e => { setDeleteRepoChecked(e.target.checked); setDeleteRepoConfirm('') }}
                className="w-4 h-4 mt-0.5 rounded bg-gray-700 border-gray-600 text-red-500" />
              <div>
                <span className="text-sm text-gray-300">Auch Gitea Repository löschen</span>
                <p className="text-xs text-gray-500 mt-1">{project.repo}</p>
              </div>
            </label>

            {deleteRepoChecked && (
              <div className="mt-3">
                <p className="text-xs text-red-400 mb-2">
                  Zur Bestätigung den Repository-Namen eingeben: <span className="font-mono font-bold">{project.repo.split('/').pop()}</span>
                </p>
                <input type="text" value={deleteRepoConfirm} onChange={e => setDeleteRepoConfirm(e.target.value)}
                  placeholder={project.repo.split('/').pop()}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-red-500" />
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose}
            className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded text-sm">
            Abbrechen
          </button>
          <button onClick={handleDelete} disabled={deleteRepoChecked && deleteRepoConfirm !== project.repo?.split('/').pop()}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:text-red-400 px-4 py-2 rounded text-sm font-medium">
            Endgültig löschen
          </button>
        </div>
      </div>
    </div>
  )
}
