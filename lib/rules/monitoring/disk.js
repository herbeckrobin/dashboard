// Festplatten-Ueberwachung (audit-only)

export default [
  {
    id: 'disk-usage',
    name: 'Festplatte nicht voll (<90%)',
    category: 'monitoring',
    scope: 'server',
    severity: 'critical',

    async audit({ runQuick }) {
      const output = await runQuick('df -h / | tail -1')
      const match = output.match(/(\d+)%/)
      const usage = match ? parseInt(match[1]) : 0
      return {
        passed: usage < 90,
        actual: `${usage}% belegt`,
        expected: '<90% belegt',
      }
    },
    enforce: null,
  },
]
