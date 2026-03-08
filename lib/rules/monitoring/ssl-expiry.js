// SSL-Zertifikat Ablauf-Ueberwachung (audit-only)

export default [
  {
    id: 'ssl-cert-expiry',
    name: 'SSL-Zertifikat gueltig (>30 Tage)',
    category: 'monitoring',
    scope: 'project',
    severity: 'critical',

    async audit({ project, runCmd }) {
      const output = await runCmd(
        `echo | openssl s_client -connect ${project.domain}:443 -servername ${project.domain} 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null`
      )
      if (!output.includes('notAfter=')) {
        return { passed: false, actual: 'Kein Zertifikat gefunden', expected: '>30 Tage gueltig' }
      }
      const dateStr = output.replace('notAfter=', '').trim()
      const daysLeft = Math.floor((new Date(dateStr) - new Date()) / 86400000)
      return {
        passed: daysLeft > 30,
        actual: `${daysLeft} Tage verbleibend`,
        expected: '>30 Tage gueltig',
      }
    },
    enforce: null,
  },
]
