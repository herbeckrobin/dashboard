// Cron-Job Verwaltung fuer Projekte
import { useState, useEffect, useCallback } from 'react'

const EMPTY_JOB = { name: '', type: 'command', schedule: '', command: '', url: '', httpMethod: 'GET' }

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ status }) {
  if (!status) return null
  const cls = status === 'success' ? 'bg-green-600' : 'bg-red-600'
  return <span className={`${cls} text-xs px-2 py-0.5 rounded`}>{status === 'success' ? 'OK' : 'Fehler'}</span>
}

function CronJobCard({ job, onSave, onDelete, onRun, runs }) {
  const [form, setForm] = useState({ ...job })
  const [editing, setEditing] = useState(!job.id)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState(null)
  const [showLogs, setShowLogs] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })
    const result = await onSave(form)
    if (result.success) {
      setEditing(false)
      setMessage({ type: 'success', text: 'Gespeichert' })
      setTimeout(() => setMessage({ type: '', text: '' }), 2000)
    } else {
      setMessage({ type: 'error', text: result.error || 'Fehler' })
    }
    setSaving(false)
  }

  const handleRun = async () => {
    setRunning(true)
    setRunResult(null)
    const result = await onRun(job.id)
    setRunResult(result)
    setRunning(false)
  }

  const handleToggle = async () => {
    const result = await onSave({ ...form, enabled: !form.enabled })
    if (result.success) {
      setForm(f => ({ ...f, enabled: !f.enabled }))
    }
  }

  const jobRuns = runs.filter(r => r.cronJobId === job.id).slice(0, 10)

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      {/* Header */}
      <div className="flex justify-between items-start gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {editing ? (
            <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
              placeholder="Name (z.B. WP Cron)" className="bg-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
          ) : (
            <span className="font-medium truncate">{form.name}</span>
          )}
          {job.id && <StatusBadge status={job.lastRunStatus} />}
          {job.id && (
            <span className={`text-xs px-2 py-0.5 rounded ${form.enabled ? 'bg-blue-600/30 text-blue-300' : 'bg-gray-600/50 text-gray-400'}`}>
              {form.enabled ? 'Aktiv' : 'Pausiert'}
            </span>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {job.id && !editing && (
            <>
              <button type="button" onClick={handleToggle} title={form.enabled ? 'Pausieren' : 'Aktivieren'}
                className="text-gray-400 hover:text-white px-2 py-1 text-sm">
                {form.enabled ? '⏸' : '▶'}
              </button>
              <button type="button" onClick={() => setEditing(true)}
                className="text-gray-400 hover:text-white px-2 py-1 text-sm">Bearbeiten</button>
            </>
          )}
          {job.id && (
            <button type="button" onClick={() => onDelete(job.id)}
              className="text-red-400 hover:text-red-300 px-2 py-1 text-sm">Loeschen</button>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {editing && (
        <div className="space-y-3 mb-3">
          {/* Typ */}
          <div className="flex gap-2">
            <button type="button" onClick={() => update('type', 'command')}
              className={`px-3 py-1.5 rounded text-sm ${form.type === 'command' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
              Befehl
            </button>
            <button type="button" onClick={() => update('type', 'url')}
              className={`px-3 py-1.5 rounded text-sm ${form.type === 'url' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
              URL Fetch
            </button>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Schedule (Crontab-Format)</label>
            <input type="text" value={form.schedule} onChange={e => update('schedule', e.target.value)}
              placeholder="*/5 * * * *" className="bg-gray-700 rounded px-3 py-2 text-sm w-full font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-500 mt-1">Minute Stunde Tag Monat Wochentag</p>
          </div>

          {/* Command oder URL */}
          {form.type === 'command' ? (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Befehl</label>
              <input type="text" value={form.command || ''} onChange={e => update('command', e.target.value)}
                placeholder="wp cron event run --due-now" className="bg-gray-700 rounded px-3 py-2 text-sm w-full font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">URL</label>
                <input type="text" value={form.url || ''} onChange={e => update('url', e.target.value)}
                  placeholder="https://example.com/api/cleanup" className="bg-gray-700 rounded px-3 py-2 text-sm w-full font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">HTTP-Methode</label>
                <select value={form.httpMethod || 'GET'} onChange={e => update('httpMethod', e.target.value)}
                  className="bg-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </div>
            </div>
          )}

          {message.text && (
            <p className={`text-sm ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{message.text}</p>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={handleSave} disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-1.5 rounded text-sm font-medium">
              {saving ? 'Speichert...' : 'Speichern'}
            </button>
            {job.id && (
              <button type="button" onClick={() => { setForm({ ...job }); setEditing(false) }}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-1.5 rounded text-sm">
                Abbrechen
              </button>
            )}
          </div>
        </div>
      )}

      {/* Info-Zeile (nicht-editing) */}
      {!editing && job.id && (
        <div className="text-sm text-gray-400 space-y-1">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="font-mono">{job.schedule}</span>
            <span>{job.type === 'command' ? job.command : `${job.httpMethod} ${job.url}`}</span>
          </div>
          {job.lastRunAt && (
            <div className="text-xs">Letzter Lauf: {formatDate(job.lastRunAt)}</div>
          )}
        </div>
      )}

      {/* Aktionen */}
      {!editing && job.id && (
        <div className="mt-3 flex flex-wrap gap-2 items-start">
          <button type="button" onClick={handleRun} disabled={running}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-3 py-1.5 rounded text-sm font-medium">
            {running ? 'Laeuft...' : 'Jetzt ausfuehren'}
          </button>
          {jobRuns.length > 0 && (
            <button type="button" onClick={() => setShowLogs(!showLogs)}
              className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-sm">
              Log ({jobRuns.length}) {showLogs ? '▲' : '▼'}
            </button>
          )}
        </div>
      )}

      {/* Run Result (inline) */}
      {runResult && (
        <div className={`mt-3 p-3 rounded text-sm font-mono whitespace-pre-wrap max-h-48 overflow-auto ${runResult.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-sans">
              {runResult.success ? 'Erfolgreich' : 'Fehlgeschlagen'} ({formatDuration(runResult.durationMs)})
            </span>
            <button type="button" onClick={() => setRunResult(null)} className="text-gray-400 hover:text-white text-xs">✕</button>
          </div>
          {runResult.output || '(keine Ausgabe)'}
        </div>
      )}

      {/* Logs */}
      {showLogs && jobRuns.length > 0 && (
        <div className="mt-3 space-y-1">
          {jobRuns.map((run, i) => (
            <LogEntry key={i} run={run} />
          ))}
        </div>
      )}
    </div>
  )
}

function LogEntry({ run }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="text-xs border border-gray-700 rounded">
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700/50 text-left">
        <StatusBadge status={run.status} />
        <span className="text-gray-400">{formatDate(run.startedAt)}</span>
        <span className="text-gray-500">{formatDuration(run.durationMs)}</span>
        <span className={`ml-auto text-gray-500 ${run.trigger === 'cron' ? '' : 'text-blue-400'}`}>
          {run.trigger === 'cron' ? 'Cron' : 'Manuell'}
        </span>
        <span className="text-gray-600">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <pre className="px-3 py-2 bg-gray-900/50 border-t border-gray-700 whitespace-pre-wrap max-h-32 overflow-auto text-gray-300">
          {run.output || '(keine Ausgabe)'}
        </pre>
      )}
    </div>
  )
}

export default function CronJobs({ projectId }) {
  const [cronJobs, setCronJobs] = useState([])
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/crons`)
      const data = await res.json()
      setCronJobs(data.cronJobs || [])
      setRuns(data.runs || [])
    } catch {}
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleSave = async (form) => {
    try {
      const isNew = !form.id
      const res = await fetch(`/api/projects/${projectId}/crons`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isNew ? form : { cronJobId: form.id, ...form }),
      })
      const data = await res.json()
      if (data.success) {
        if (isNew) setAdding(false)
        await load()
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch (e) {
      return { success: false, error: 'Verbindungsfehler' }
    }
  }

  const handleDelete = async (cronJobId) => {
    try {
      await fetch(`/api/projects/${projectId}/crons`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cronJobId }),
      })
      await load()
    } catch {}
  }

  const handleRun = async (cronJobId) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/crons/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cronJobId, trigger: 'manual' }),
      })
      const data = await res.json()
      await load() // Logs und lastRun aktualisieren
      return data
    } catch (e) {
      return { success: false, output: 'Verbindungsfehler' }
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Cron-Jobs</h2>
        <p className="text-gray-400 text-sm">Laden...</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4 gap-2">
        <h2 className="text-lg sm:text-xl font-semibold">Cron-Jobs</h2>
        <span className="text-gray-400 text-sm">{cronJobs.length} Job{cronJobs.length !== 1 ? 's' : ''}</span>
      </div>

      {cronJobs.length === 0 && !adding && (
        <p className="text-gray-400 text-sm mb-4">Noch keine Cron-Jobs konfiguriert.</p>
      )}

      <div className="space-y-3">
        {cronJobs.map(job => (
          <CronJobCard key={job.id} job={job} onSave={handleSave} onDelete={handleDelete} onRun={handleRun} runs={runs} />
        ))}

        {adding && (
          <CronJobCard
            job={{ ...EMPTY_JOB }}
            onSave={handleSave}
            onDelete={() => setAdding(false)}
            onRun={() => {}}
            runs={[]}
          />
        )}
      </div>

      {!adding && (
        <button type="button" onClick={() => setAdding(true)}
          className="mt-4 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium w-full">
          + Cron-Job hinzufuegen
        </button>
      )}
    </div>
  )
}
