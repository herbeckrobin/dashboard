import crypto from 'crypto'
import { exec } from 'child_process'
import { sanitizeSqlIdentifier, escapeSqlValue } from './validate.js'

// SQL via stdin an mysql uebergeben (verhindert Shell-Injection)
async function execSql(sql) {
  return new Promise((resolve) => {
    const child = exec('sudo mysql', { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message })
      } else {
        resolve({ success: true, output: (stdout + (stderr ? '\n' + stderr : '')).trim() })
      }
    })
    child.stdin.write(sql)
    child.stdin.end()
  })
}

export function generateDbCredentials(projectName) {
  const slug = projectName.replace(/[^a-z0-9]/gi, '_').substring(0, 16)
  const suffix = crypto.randomBytes(3).toString('hex')
  const password = crypto.randomBytes(16).toString('hex')

  return {
    name: `db_${slug}_${suffix}`,
    user: `u_${slug}_${suffix}`,
    password,
    host: 'localhost'
  }
}

export async function createDatabase({ name, user, password }) {
  const safeName = sanitizeSqlIdentifier(name)
  const safeUser = sanitizeSqlIdentifier(user)
  const safePwd = escapeSqlValue(password)

  const sql = `CREATE DATABASE IF NOT EXISTS \`${safeName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS '${safeUser}'@'localhost' IDENTIFIED BY ${safePwd}; GRANT ALL PRIVILEGES ON \`${safeName}\`.* TO '${safeUser}'@'localhost'; FLUSH PRIVILEGES;`

  return execSql(sql)
}

export async function dropDatabase({ name, user }) {
  const safeName = sanitizeSqlIdentifier(name)
  const safeUser = sanitizeSqlIdentifier(user)

  const sql = `DROP DATABASE IF EXISTS \`${safeName}\`; DROP USER IF EXISTS '${safeUser}'@'localhost'; FLUSH PRIVILEGES;`

  return execSql(sql)
}
