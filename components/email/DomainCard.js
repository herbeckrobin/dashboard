// Bento-Card fuer E-Mail-Domain in der Uebersicht

import Link from 'next/link'

function DnsStatusDot({ ok, label }) {
  return (
    <span className="flex items-center gap-1 text-xs">
      <span className={`w-2 h-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
      {label}
    </span>
  )
}

export default function DomainCard({ domain, dnsStatus }) {
  return (
    <Link href={`/email/${domain.domain}`}
      className="bento-card p-5 block hover:border-blue-500/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">{domain.domain}</h3>
        {!domain.enabled && (
          <span className="text-xs bg-red-600/20 text-red-400 px-2 py-0.5 rounded">Deaktiviert</span>
        )}
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-400 mb-3">
        <span>{domain.accountCount || 0} {domain.accountCount === 1 ? 'Postfach' : 'Postfaecher'}</span>
        {domain.aliasCount > 0 && (
          <>
            <span className="text-gray-600">|</span>
            <span>{domain.aliasCount} {domain.aliasCount === 1 ? 'Alias' : 'Aliases'}</span>
          </>
        )}
        {domain.catchAll && (
          <>
            <span className="text-gray-600">|</span>
            <span>Catch-All</span>
          </>
        )}
      </div>

      {dnsStatus && (
        <div className="flex items-center gap-3">
          <DnsStatusDot ok={dnsStatus.mx} label="MX" />
          <DnsStatusDot ok={dnsStatus.spf} label="SPF" />
          <DnsStatusDot ok={dnsStatus.dkim} label="DKIM" />
          <DnsStatusDot ok={dnsStatus.dmarc} label="DMARC" />
        </div>
      )}
    </Link>
  )
}
