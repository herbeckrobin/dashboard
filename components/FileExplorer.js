// Datei-Explorer: Verzeichnisse und Dateien des Projekts durchsuchen

import { useState, useEffect } from 'react'

function formatSize(bytes) {
  if (bytes === null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileExplorer({ projectId }) {
  const [currentPath, setCurrentPath] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!projectId) return
    loadPath(currentPath)
  }, [projectId, currentPath])

  const loadPath = (p) => {
    setLoading(true)
    setError('')
    fetch(`/api/projects/${projectId}/files?path=${encodeURIComponent(p)}`)
      .then(res => res.json())
      .then(result => {
        if (result.error) setError(result.error)
        else setData(result)
        setLoading(false)
      })
      .catch(() => {
        setError('Dateien konnten nicht geladen werden')
        setLoading(false)
      })
  }

  const navigateTo = (name) => {
    setData(null)
    setCurrentPath(currentPath ? `${currentPath}/${name}` : name)
  }

  const navigateUp = () => {
    setData(null)
    const parts = currentPath.split('/')
    parts.pop()
    setCurrentPath(parts.join('/'))
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="flex justify-between items-center mb-0">
        <h2 className="text-lg sm:text-xl font-semibold p-4 sm:p-6 pb-0">Dateien</h2>
      </div>

      {/* Breadcrumb */}
      <div className="px-4 sm:px-6 pt-3 pb-2 flex items-center gap-1 text-sm font-mono overflow-x-auto">
        <button onClick={() => { setData(null); setCurrentPath('') }}
          className="text-blue-400 hover:text-blue-300">/</button>
        {currentPath.split('/').filter(Boolean).map((part, i, arr) => (
          <span key={i} className="flex items-center gap-1">
            <span className="text-gray-500">/</span>
            {i < arr.length - 1 ? (
              <button onClick={() => { setData(null); setCurrentPath(arr.slice(0, i + 1).join('/')) }}
                className="text-blue-400 hover:text-blue-300">{part}</button>
            ) : (
              <span className="text-gray-300">{part}</span>
            )}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="p-4 sm:p-6 pt-2 text-gray-400 text-sm">Lädt...</div>
      ) : error ? (
        <div className="p-4 sm:p-6 pt-2 text-red-400 text-sm">{error}</div>
      ) : data?.type === 'directory' ? (
        <div className="px-4 sm:px-6 pb-4">
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            {currentPath && (
              <button onClick={navigateUp}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-700 text-left border-b border-gray-700">
                <span className="text-gray-400">↑</span>
                <span className="text-gray-400">..</span>
              </button>
            )}
            {data.items.length === 0 && !currentPath ? (
              <div className="px-4 py-6 text-gray-500 text-sm text-center">Verzeichnis ist leer</div>
            ) : data.items.map((item, i) => (
              <div key={item.name}
                className={`flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-700 ${i < data.items.length - 1 ? 'border-b border-gray-700' : ''}`}>
                {item.isDir ? (
                  <button onClick={() => navigateTo(item.name)} className="flex items-center gap-3 text-left flex-1">
                    <span className="text-yellow-400 w-4 text-center">📁</span>
                    <span className="text-blue-400 hover:text-blue-300">{item.name}</span>
                  </button>
                ) : (
                  <button onClick={() => navigateTo(item.name)} className="flex items-center gap-3 text-left flex-1">
                    <span className="text-gray-400 w-4 text-center">📄</span>
                    <span className="text-gray-300 hover:text-white">{item.name}</span>
                  </button>
                )}
                {!item.isDir && (
                  <span className="text-gray-500 text-xs ml-4">{formatSize(item.size)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : data?.type === 'file' ? (
        <div className="px-4 sm:px-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <button onClick={navigateUp} className="text-blue-400 hover:text-blue-300 text-sm">← Zurück</button>
            <span className="text-gray-500 text-xs">{formatSize(data.size)}</span>
          </div>
          {data.tooLarge ? (
            <div className="bg-gray-900 rounded-lg p-4 text-gray-400 text-sm">
              Datei zu gross zum Anzeigen ({formatSize(data.size)})
            </div>
          ) : (
            <pre className="bg-gray-900 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto max-h-96 overflow-y-auto font-mono whitespace-pre-wrap break-all">
              {data.content}
            </pre>
          )}
        </div>
      ) : null}
    </div>
  )
}
