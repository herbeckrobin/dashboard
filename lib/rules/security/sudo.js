// sudo-Konfiguration — Least Privilege fuer deploy-User

export default [
  {
    id: 'sudo-no-nopasswd-all',
    name: 'deploy-User hat kein NOPASSWD:ALL',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      // Alle sudoers-Dateien nach deploy ALL=(ALL) NOPASSWD: ALL durchsuchen
      const output = await runCmd('grep -r "deploy.*NOPASSWD.*ALL" /etc/sudoers /etc/sudoers.d/ 2>/dev/null')
      const hasFullAccess = output.includes('NOPASSWD: ALL') || output.includes('NOPASSWD:ALL')
      return {
        passed: !hasFullAccess,
        actual: hasFullAccess ? 'deploy hat NOPASSWD: ALL' : 'Kein NOPASSWD: ALL',
        expected: 'Eingeschraenkte sudo-Rechte (Least Privilege)',
      }
    },
    // Kein enforce — zu riskant automatisch zu aendern, kann Lockout verursachen
    enforce: null,
  },
]
