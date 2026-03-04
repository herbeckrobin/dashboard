// Globale Suche: Projekte + Gruppen + E-Mail-Konten durchsuchen

import { getProjects, getGroups } from '../../lib/db'
import { getAccounts } from '../../lib/email/accounts'
import { getEmailDomains } from '../../lib/email/domains'

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const q = (req.query.q || '').trim().toLowerCase()
  if (!q) return res.json({ projects: [], groups: [] })

  const projects = getProjects()
  const groups = getGroups()

  // Projekte durchsuchen: Name, Domain, Framework, Status, Repo, Port
  const matchedProjects = projects.filter(p => {
    const fields = [p.name, p.domain, p.framework, p.status, p.repo, p.port?.toString()]
    return fields.some(f => f && f.toLowerCase().includes(q))
  }).map(p => ({
    id: p.id,
    name: p.name,
    domain: p.domain,
    framework: p.framework,
    status: p.status,
    type: p.type,
    groupId: p.groupId
  }))

  // Gruppen durchsuchen: Name, Paket, Notizen
  const matchedGroups = groups.filter(g => {
    const fields = [g.name, g.package, g.notes]
    return fields.some(f => f && f.toLowerCase().includes(q))
  }).map(g => ({
    id: g.id,
    name: g.name,
    package: g.package,
    projectCount: projects.filter(p => p.groupId === g.id).length
  }))

  // E-Mail-Konten durchsuchen
  const emailAccounts = getAccounts().filter(a => {
    const fields = [a.email, a.domain, a.displayName]
    return fields.some(f => f && f.toLowerCase().includes(q))
  }).map(a => ({
    id: a.id,
    email: a.email,
    domain: a.domain,
    displayName: a.displayName,
  }))

  // E-Mail-Domains durchsuchen
  const emailDomains = getEmailDomains().filter(d => {
    return d.domain.toLowerCase().includes(q)
  }).map(d => ({
    domain: d.domain,
    accountCount: getAccounts().filter(a => a.domain === d.domain).length,
  }))

  res.json({ projects: matchedProjects, groups: matchedGroups, emailAccounts, emailDomains })
}
