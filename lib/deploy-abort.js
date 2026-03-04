// Deploy-Abort Registry — in-memory Map fuer laufende Deploys
// Jeder Deploy bekommt einen AbortController, der per API abgebrochen werden kann

const activeControllers = new Map()

export function registerDeploy(projectId) {
  const controller = new AbortController()
  activeControllers.set(projectId, controller)
  return controller.signal
}

export function unregisterDeploy(projectId) {
  activeControllers.delete(projectId)
}

export function abortDeploy(projectId) {
  const controller = activeControllers.get(projectId)
  if (!controller) return false
  controller.abort()
  return true
}

export function isDeployActive(projectId) {
  return activeControllers.has(projectId)
}
