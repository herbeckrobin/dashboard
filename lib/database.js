import crypto from 'crypto'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function execSql(sql) {
  try {
    const { stdout, stderr } = await execAsync(`sudo mysql -e "${sql}"`, { timeout: 30000 })
    return { success: true, output: (stdout + (stderr ? '\n' + stderr : '')).trim() }
  } catch (error) {
    return { success: false, error: error.message }
  }
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
  const sql = `CREATE DATABASE IF NOT EXISTS \\\`${name}\\\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS '${user}'@'localhost' IDENTIFIED BY '${password}'; GRANT ALL PRIVILEGES ON \\\`${name}\\\`.* TO '${user}'@'localhost'; FLUSH PRIVILEGES;`

  return execSql(sql)
}

export async function dropDatabase({ name, user }) {
  const sql = `DROP DATABASE IF EXISTS \\\`${name}\\\`; DROP USER IF EXISTS '${user}'@'localhost'; FLUSH PRIVILEGES;`

  return execSql(sql)
}
