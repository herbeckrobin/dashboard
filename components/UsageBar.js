// Nutzungsbalken fuer Limit-Anzeige (Projekte, Speicher, Domains)

export default function UsageBar({ label, used, limit, unit, unlimited }) {
  if (unlimited) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">{label}</span>
          <span className="text-gray-300">{used} {unit} / Unbegrenzt</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full">
          <div className="h-full bg-green-500 rounded-full" style={{ width: '5%' }} />
        </div>
      </div>
    )
  }

  const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const color = percent >= 100 ? 'bg-red-500'
    : percent >= 80 ? 'bg-yellow-500'
    : 'bg-green-500'
  const textColor = percent >= 100 ? 'text-red-400'
    : percent >= 80 ? 'text-yellow-400'
    : 'text-gray-300'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className={textColor}>{used} / {limit} {unit}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full">
        <div className={`h-full ${color} rounded-full transition-all`}
             style={{ width: `${Math.max(percent, 2)}%` }} />
      </div>
    </div>
  )
}
