// Install-Steps Router — delegiert an Framework-spezifische Module

import { getWordPressSteps } from './wordpress'
import { getRedaxoSteps } from './redaxo'
import { getLaravelSteps } from './laravel'
import { getNextjsStarterSteps } from './nextjs'
import { getExpressStarterSteps } from './express'
import { getTypo3Steps } from './typo3'
import { getContaoSteps } from './contao'

export function getInstallSteps(project) {
  if (!project.framework || project.frameworkInstalled) return null

  switch (project.framework) {
    case 'wordpress':
      return getWordPressSteps(project)
    case 'redaxo':
      return getRedaxoSteps(project)
    case 'laravel':
      return getLaravelSteps(project)
    case 'typo3':
      return getTypo3Steps(project)
    case 'contao':
      return getContaoSteps(project)
    case 'nextjs-starter':
      return getNextjsStarterSteps(project)
    case 'express-starter':
      return getExpressStarterSteps(project)
    default:
      return null
  }
}
