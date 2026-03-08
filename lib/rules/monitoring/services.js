// Kritische Dienste Ueberwachung (audit-only)

const CRITICAL_SERVICES = [
  { name: 'nginx', label: 'nginx' },
  { name: 'mariadb', label: 'MariaDB' },
  { name: 'fail2ban', label: 'Fail2ban' },
  { name: 'docker', label: 'Docker' },
]

export default CRITICAL_SERVICES.map(svc => ({
  id: `service-${svc.name}`,
  name: `${svc.label} Service laeuft`,
  category: 'monitoring',
  scope: 'server',
  severity: 'critical',

  async audit({ runQuick }) {
    const status = await runQuick(`systemctl is-active ${svc.name}`)
    return {
      passed: status === 'active',
      actual: status || 'nicht gefunden',
      expected: 'active',
    }
  },
  enforce: null,
}))
