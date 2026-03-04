// Limit-Pruefung und Speicher-Tracking fuer Gruppen

import { getGroup, getGroupProjects } from './db.js'
import { isUnlimited } from './packages.js'
import { runQuick } from './run-command.js'
import { getEmailDomains } from './email/domains.js'
import { getAccountsByDomain } from './email/accounts.js'

// Storage-Cache: 5 Minuten TTL
const storageCache = new Map()
const CACHE_TTL = 5 * 60 * 1000

export async function getProjectStorageBytes(projectName) {
  const cached = storageCache.get(projectName)
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return cached.bytes
  }

  const output = await runQuick(
    `du -sb /home/deploy/apps/${projectName} 2>/dev/null | cut -f1`,
    10000
  )
  const bytes = parseInt(output) || 0
  storageCache.set(projectName, { bytes, at: Date.now() })
  return bytes
}

export async function getGroupStorageBytes(groupId) {
  const projects = getGroupProjects(groupId)
  const sizes = await Promise.all(
    projects.map(p => getProjectStorageBytes(p.name))
  )
  return sizes.reduce((sum, s) => sum + s, 0)
}

// Effektives Storage-Limit in Bytes (inkl. Extra-Speicher)
export function getEffectiveStorageBytes(group) {
  if (isUnlimited(group.limits.storage)) return -1
  const totalGb = group.limits.storage + (group.extraStorage || 0)
  return totalGb * 1024 * 1024 * 1024
}

// Gruppen-Nutzung zusammenstellen
export async function getGroupUsage(groupId) {
  const group = getGroup(groupId)
  if (!group) return null

  const projects = getGroupProjects(groupId)
  const storageBytes = await getGroupStorageBytes(groupId)
  const effectiveStorageBytes = getEffectiveStorageBytes(group)

  // E-Mail-Konten zaehlen
  const emailLimits = group.limits.email || { count: 0, sizeGb: 0 }
  const groupDomains = getEmailDomains().filter(d => d.groupId === groupId)
  const totalEmailAccounts = groupDomains.reduce(
    (sum, d) => sum + getAccountsByDomain(d.domain).length, 0
  )

  return {
    projects: {
      used: projects.length,
      limit: group.limits.projects,
      unlimited: isUnlimited(group.limits.projects)
    },
    storage: {
      usedBytes: storageBytes,
      limitBytes: effectiveStorageBytes,
      unlimited: isUnlimited(group.limits.storage),
      warning: !isUnlimited(group.limits.storage) &&
               effectiveStorageBytes > 0 &&
               storageBytes > effectiveStorageBytes * 0.8,
      exceeded: !isUnlimited(group.limits.storage) &&
                effectiveStorageBytes > 0 &&
                storageBytes > effectiveStorageBytes
    },
    domains: {
      used: projects.length,
      limit: group.limits.domains,
      unlimited: isUnlimited(group.limits.domains)
    },
    email: {
      used: totalEmailAccounts,
      limit: emailLimits.count,
      unlimited: isUnlimited(emailLimits.count)
    }
  }
}

// HARD: Kann ein neues Projekt erstellt werden?
export function checkProjectCreationLimit(group) {
  if (!group) return { allowed: true }
  if (isUnlimited(group.limits.projects)) return { allowed: true }

  const projects = getGroupProjects(group.id)
  if (projects.length >= group.limits.projects) {
    return {
      allowed: false,
      reason: `Projektlimit erreicht (${projects.length}/${group.limits.projects})`
    }
  }
  return { allowed: true }
}

// HARD: E-Mail-Konto-Limit pruefen
export function checkEmailAccountLimit(group) {
  if (!group) return { allowed: true }
  if (!group.limits?.email) return { allowed: true }
  if (isUnlimited(group.limits.email.count)) return { allowed: true }

  const groupDomains = getEmailDomains().filter(d => d.groupId === group.id)
  const totalAccounts = groupDomains.reduce(
    (sum, d) => sum + getAccountsByDomain(d.domain).length, 0
  )

  if (totalAccounts >= group.limits.email.count) {
    return {
      allowed: false,
      reason: `E-Mail-Limit erreicht (${totalAccounts}/${group.limits.email.count})`
    }
  }
  return { allowed: true }
}

// HARD: Domain-Anzahl pruefen
export function checkDomainLimit(group, additionalDomains = 1) {
  if (!group) return { allowed: true }
  if (isUnlimited(group.limits.domains)) return { allowed: true }

  const projects = getGroupProjects(group.id)
  if (projects.length + additionalDomains > group.limits.domains) {
    return {
      allowed: false,
      reason: `Domain-Limit erreicht (${projects.length}/${group.limits.domains})`
    }
  }
  return { allowed: true }
}
