import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'data', 'projects.json')
const GROUPS_FILE = path.join(process.cwd(), 'data', 'groups.json')

export function getProjects() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8')
    return JSON.parse(data).projects || []
  } catch (e) {
    return []
  }
}

export function saveProjects(projects) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ projects }, null, 2))
}

// --- Gruppen ---

export function getGroups() {
  try {
    const data = fs.readFileSync(GROUPS_FILE, 'utf8')
    return JSON.parse(data).groups || []
  } catch (e) {
    return []
  }
}

export function saveGroups(groups) {
  fs.writeFileSync(GROUPS_FILE, JSON.stringify({ groups }, null, 2))
}

export function getGroup(id) {
  return getGroups().find(g => g.id === id)
}

export function addGroup(group) {
  const groups = getGroups()
  group.id = Date.now().toString()
  group.createdAt = new Date().toISOString()
  groups.push(group)
  saveGroups(groups)
  return group
}

export function updateGroup(id, updates) {
  const groups = getGroups()
  const index = groups.findIndex(g => g.id === id)
  if (index !== -1) {
    groups[index] = { ...groups[index], ...updates }
    saveGroups(groups)
    return groups[index]
  }
  return null
}

export function deleteGroup(id) {
  const groups = getGroups()
  const index = groups.findIndex(g => g.id === id)
  if (index !== -1) {
    const deleted = groups.splice(index, 1)[0]
    saveGroups(groups)
    return deleted
  }
  return null
}

export function getGroupProjects(groupId) {
  return getProjects().filter(p => p.groupId === groupId)
}

export function getProject(id) {
  const projects = getProjects()
  return projects.find(p => p.id === id)
}

export function addProject(project) {
  const projects = getProjects()
  project.id = Date.now().toString()
  project.status = 'pending'
  project.createdAt = new Date().toISOString()
  projects.push(project)
  saveProjects(projects)
  return project
}

export function updateProject(id, updates) {
  const projects = getProjects()
  const index = projects.findIndex(p => p.id === id)
  if (index !== -1) {
    projects[index] = { ...projects[index], ...updates }
    saveProjects(projects)
    return projects[index]
  }
  return null
}

export function deleteProject(id) {
  const projects = getProjects()
  const index = projects.findIndex(p => p.id === id)
  if (index !== -1) {
    const deleted = projects.splice(index, 1)[0]
    saveProjects(projects)
    return deleted
  }
  return null
}
