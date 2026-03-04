// System-Info Karte: RAM, Festplatte, Uptime, Services, Docker

import { formatBytes } from '../lib/format'

function ProgressBar({ percent, color }) {
  const barColor = color || (percent < 60 ? 'bg-green-500' : percent < 80 ? 'bg-yellow-500' : 'bg-red-500')
  return (
    <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  )
}

export default function SystemCard({ data }) {
  if (!data) return (
    <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">System</h3>
      <p className="text-gray-500 text-sm">Lädt...</p>
    </div>
  )

  const ramPercent = data.ram.total ? Math.round((data.ram.used / data.ram.total) * 100) : 0
  const diskPercent = data.disk.percent || 0

  return (
    <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">System</h3>

      <div className="space-y-4">
        {/* RAM */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">RAM</span>
            <span className="text-white">{formatBytes(data.ram.used)} / {formatBytes(data.ram.total)} ({ramPercent}%)</span>
          </div>
          <ProgressBar percent={ramPercent} />
        </div>

        {/* Disk */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Festplatte</span>
            <span className="text-white">{formatBytes(data.disk.used)} / {formatBytes(data.disk.total)} ({diskPercent}%)</span>
          </div>
          <ProgressBar percent={diskPercent} />
        </div>

        {/* Uptime & Load */}
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Uptime</span>
          <span className="text-white">{data.uptime.days} Tage</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Load ({data.cpu.cores} Cores)</span>
          <span className="text-white">{data.uptime.loadAvg.map(l => l.toFixed(2)).join(' / ')}</span>
        </div>

        {/* Services */}
        <div>
          <div className="text-xs text-gray-400 mb-2">Services</div>
          <div className="flex flex-wrap gap-2">
            {data.services.map(s => (
              <span key={s.name} className="inline-flex items-center gap-1.5 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full ${s.active ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className={s.active ? 'text-gray-300' : 'text-red-400'}>{s.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Docker */}
        {data.docker.length > 0 && (
          <div>
            <div className="text-xs text-gray-400 mb-2">Docker</div>
            <div className="flex flex-wrap gap-2">
              {data.docker.map(c => (
                <span key={c.name} className="inline-flex items-center gap-1.5 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${c.status.startsWith('Up') ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-gray-300">{c.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
