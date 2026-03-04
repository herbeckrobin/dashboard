// ============================================================
// Utility-Funktionen fuer PHP/SQL String-Escaping
// ============================================================

// Helper: PHP single-quoted string literal
export function phpEsc(str) {
  return "'" + String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
}

// Helper: MySQL string literal (fuer setup.sql)
export function sqlEsc(str) {
  return "'" + String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\0/g, '\\0') + "'"
}
