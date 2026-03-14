import { runQuick } from './run-command'

export async function getSystemInfo() {
  // PHP-FPM-Version dynamisch erkennen (Metapaket "php-fpm" rausfiltern, nur versionierte wie php8.2-fpm)
  const phpVersionOut = await runQuick("dpkg -l 'php*-fpm' 2>/dev/null | grep ^ii | awk '{print $2}' | grep -E '^php[0-9]' | head -1 | sed 's/-fpm//'")
  const phpFpmService = phpVersionOut ? `${phpVersionOut.trim()}-fpm` : 'php8.2-fpm'

  const [ramOut, diskOut, uptimeOut, loadOut, cpuOut, servicesOut, dockerOut] = await Promise.all([
    runQuick('free -b'),
    runQuick('df -B1 /'),
    runQuick('uptime -s'),
    runQuick('cat /proc/loadavg'),
    runQuick('nproc'),
    runQuick(`systemctl is-active nginx docker mariadb ${phpFpmService} fail2ban admin-dashboard postfix dovecot rspamd redis-server 2>/dev/null`),
    runQuick("sudo docker ps --format '{{.Names}}:{{.Status}}'"),
  ])

  // Parse RAM
  const ram = { total: 0, used: 0, available: 0 }
  const ramLine = ramOut.split('\n').find(l => l.startsWith('Mem:'))
  if (ramLine) {
    const parts = ramLine.split(/\s+/)
    ram.total = parseInt(parts[1]) || 0
    ram.used = parseInt(parts[2]) || 0
    ram.available = parseInt(parts[6]) || 0
  }

  // Parse Disk
  const disk = { total: 0, used: 0, available: 0, percent: 0 }
  const diskLines = diskOut.split('\n')
  if (diskLines.length > 1) {
    const parts = diskLines[1].split(/\s+/)
    disk.total = parseInt(parts[1]) || 0
    disk.used = parseInt(parts[2]) || 0
    disk.available = parseInt(parts[3]) || 0
    disk.percent = parseInt(parts[4]) || 0
  }

  // Parse Uptime
  const uptime = { since: uptimeOut, days: 0, loadAvg: [0, 0, 0] }
  if (uptimeOut) {
    const sinceDate = new Date(uptimeOut)
    uptime.days = Math.floor((Date.now() - sinceDate.getTime()) / 86400000)
  }
  if (loadOut) {
    const parts = loadOut.split(/\s+/)
    uptime.loadAvg = [parseFloat(parts[0]) || 0, parseFloat(parts[1]) || 0, parseFloat(parts[2]) || 0]
  }

  // CPU
  const cpu = { cores: parseInt(cpuOut) || 0 }

  // Parse Services
  const serviceNames = ['nginx', 'docker', 'mariadb', phpFpmService, 'fail2ban', 'admin-dashboard', 'postfix', 'dovecot', 'rspamd', 'redis-server']
  const serviceStatuses = servicesOut.split('\n')
  const services = serviceNames.map((name, i) => ({
    name: name === phpFpmService ? 'php-fpm' : name,
    active: (serviceStatuses[i] || '').trim() === 'active',
  }))

  // Parse Docker
  const docker = dockerOut
    ? dockerOut.split('\n').filter(Boolean).map(line => {
        const [name, ...statusParts] = line.split(':')
        return { name, status: statusParts.join(':') }
      })
    : []

  return { ram, disk, uptime, cpu, services, docker }
}

export async function getBackupInfo() {
  const [lastBackupDir, backupCount, recentLogOut] = await Promise.all([
    runQuick('ls -1td /home/deploy/backups/2* 2>/dev/null | head -1'),
    runQuick('ls -1d /home/deploy/backups/2* 2>/dev/null | wc -l'),
    runQuick('tail -10 /home/deploy/backups/backup.log 2>/dev/null'),
  ])

  let lastBackup = null
  if (lastBackupDir) {
    const dirName = lastBackupDir.split('/').pop()
    const sizeOut = await runQuick(`du -sh "${lastBackupDir}" 2>/dev/null`)
    const size = sizeOut ? sizeOut.split(/\s+/)[0] : '?'
    lastBackup = { date: dirName, size }
  }

  // Next backup: cronjob runs at 03:00 daily
  const now = new Date()
  const next = new Date(now)
  next.setHours(3, 0, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)
  const nextRun = next.toISOString().replace('T', ' ').slice(0, 16)

  const recentLog = recentLogOut ? recentLogOut.split('\n').filter(Boolean) : []

  return {
    lastBackup,
    backupCount: parseInt(backupCount) || 0,
    retention: '7 Tage',
    nextRun,
    recentLog,
  }
}
