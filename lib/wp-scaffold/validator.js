import fs from 'fs'
import path from 'path'
import { capitalize } from '../theme-defaults.js'

// ============================================================
// VALIDATE BLOCKS (Backward-Kompatibilitaet)
// ============================================================

export function validateBlocks(themePath) {
  const blocksDir = path.join(themePath, 'src', 'blocks')
  if (!fs.existsSync(blocksDir)) return { success: true, output: 'Keine Blocks vorhanden' }

  const webpackPath = path.join(themePath, 'webpack.config.js')
  if (fs.existsSync(webpackPath)) fs.unlinkSync(webpackPath)

  const blockDirs = fs.readdirSync(blocksDir).filter(d =>
    fs.statSync(path.join(blocksDir, d)).isDirectory()
  )

  const fixes = []

  for (const blockName of blockDirs) {
    const blockDir = path.join(blocksDir, blockName)

    for (const scssFile of ['style.scss', 'editor.scss']) {
      const scssPath = path.join(blockDir, scssFile)
      if (!fs.existsSync(scssPath)) {
        fs.writeFileSync(scssPath, '')
        fixes.push(`${blockName}/${scssFile} erstellt`)
      }
    }

    const blockJsonPath = path.join(blockDir, 'block.json')
    if (!fs.existsSync(blockJsonPath)) continue

    try {
      const blockJson = JSON.parse(fs.readFileSync(blockJsonPath, 'utf8'))
      let changed = false

      if (!blockJson.title) {
        blockJson.title = capitalize(blockName.replace(/-/g, ' '))
        changed = true
        fixes.push(`${blockName}: title gesetzt`)
      }

      if (blockJson.editorScript !== 'file:./index.js') {
        blockJson.editorScript = 'file:./index.js'
        changed = true
      }
      if (blockJson.editorStyle !== 'file:./index.css') {
        blockJson.editorStyle = 'file:./index.css'
        changed = true
      }
      if (blockJson.style !== 'file:./style-index.css') {
        blockJson.style = 'file:./style-index.css'
        changed = true
      }

      if (!blockJson.apiVersion) {
        blockJson.apiVersion = 3
        changed = true
      }

      if (changed) {
        fs.writeFileSync(blockJsonPath, JSON.stringify(blockJson, null, 2) + '\n')
        fixes.push(`${blockName}: block.json korrigiert`)
      }
    } catch {
      fixes.push(`${blockName}: block.json parse-Fehler`)
    }
  }

  return {
    success: true,
    output: fixes.length > 0
      ? `${blockDirs.length} Blocks validiert, ${fixes.length} Fixes: ${fixes.join(', ')}`
      : `${blockDirs.length} Blocks validiert, keine Fixes noetig`
  }
}
