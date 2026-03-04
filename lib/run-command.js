// Zentralisierte Shell-Befehle ausfuehren
import { exec, spawn } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Kurzer Befehl ohne Live-Output
export async function runCommand(cmd, timeoutMs = 300000) {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024
    })
    return { success: true, output: (stdout + (stderr ? '\n' + stderr : '')).trim() }
  } catch (error) {
    const output = [error.stdout, error.stderr].filter(Boolean).join('\n').trim()
    return { success: false, error: output || error.message || 'Unbekannter Fehler' }
  }
}

// Langer Befehl mit Live-Output via onOutput Callback
// signal: optionaler AbortSignal zum Abbrechen des Prozesses
export function runCommandLive(cmd, timeoutMs = 300000, onOutput = null, signal = null) {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-c', cmd], { env: process.env })
    let output = ''
    let lastFlushed = ''
    let killed = false
    let aborted = false

    // Abort-Signal: Prozess sofort beenden
    if (signal) {
      if (signal.aborted) {
        child.kill('SIGTERM')
        aborted = true
      } else {
        signal.addEventListener('abort', () => {
          aborted = true
          child.kill('SIGTERM')
        }, { once: true })
      }
    }

    const flush = () => {
      if (onOutput && output !== lastFlushed) {
        // Nur die letzten 50 Zeilen senden (verhindert riesige Log-Dateien)
        const lines = output.split('\n')
        const tail = lines.length > 50 ? lines.slice(-50).join('\n') : output
        onOutput(tail)
        lastFlushed = output
      }
    }
    const interval = setInterval(flush, 1000)

    const timer = setTimeout(() => {
      killed = true
      child.kill('SIGTERM')
    }, timeoutMs)

    child.stdout.on('data', (data) => { output += data.toString() })
    child.stderr.on('data', (data) => { output += data.toString() })

    child.on('close', (code) => {
      clearInterval(interval)
      clearTimeout(timer)
      flush()
      if (aborted) {
        resolve({ success: false, error: 'Deploy abgebrochen' })
      } else if (killed) {
        resolve({ success: false, error: `Timeout nach ${timeoutMs / 1000}s` })
      } else {
        resolve({ success: code === 0, output: output.trim(), error: code !== 0 ? output.trim() : undefined })
      }
    })

    child.on('error', (err) => {
      clearInterval(interval)
      clearTimeout(timer)
      resolve({ success: false, error: err.message })
    })
  })
}

// Kurzer Befehl mit kurzem Timeout (fuer system-info o.ae.)
export async function runQuick(cmd, timeoutMs = 5000) {
  try {
    const { stdout } = await execAsync(cmd, { timeout: timeoutMs })
    return stdout.trim()
  } catch {
    return ''
  }
}
