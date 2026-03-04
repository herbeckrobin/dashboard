// ============================================================
// REDAXO SCAFFOLD — Re-Exports aller oeffentlichen APIs
// Gleiches JSON-Schema wie Next.js Starter und WordPress
// ============================================================

export { REDAXO_MODULES } from '../sections/index.js'
export { generateMainTemplate } from './template.js'
export { generateStyleCSS } from './css-generator.js'
export { generateSetupPhp } from './setup-php.js'
export { generateSetupSql } from './setup-sql.js'
export { BOOT_PHP, generateConfigYml, DEFAULT_REDAXO_CONTENT } from './config.js'
export { phpEsc, sqlEsc } from './utils.js'
