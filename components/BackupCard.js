// Backup-Info Karte: Letztes Backup, Anzahl, Retention, Log

export default function BackupCard({ data }) {
  if (!data) return (
    <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Backups</h3>
      <p className="text-gray-500 text-sm">Lädt...</p>
    </div>
  )

  return (
    <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">Backups</h3>

      <div className="space-y-3">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Letztes Backup</span>
          <span className="text-white">{data.lastBackup ? data.lastBackup.date.replace(/_/g, ' ') : 'Keins'}</span>
        </div>

        {data.lastBackup && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Größe</span>
            <span className="text-white">{data.lastBackup.size}</span>
          </div>
        )}

        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Anzahl</span>
          <span className="text-white">{data.backupCount} Backups</span>
        </div>

        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Retention</span>
          <span className="text-white">{data.retention}</span>
        </div>

        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Nächstes Backup</span>
          <span className="text-white">{data.nextRun}</span>
        </div>

        {data.recentLog.length > 0 && (
          <div>
            <div className="text-xs text-gray-400 mb-1.5">Letztes Log</div>
            <div className="bg-gray-900 rounded p-2 max-h-24 overflow-y-auto">
              {data.recentLog.map((line, i) => (
                <div key={i} className="text-xs text-gray-500 font-mono leading-relaxed">{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
