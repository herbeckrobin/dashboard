// Rechtliche Dokumente: Markdown-Templates laden, befüllen und als druckoptimiertes HTML rendern

import fs from 'fs'
import path from 'path'
import { marked } from 'marked'

const LEGAL_DIR = path.join(process.cwd(), 'lib', 'legal')

const DOCS = {
  avv: { file: 'avv-vorlage.md', title: 'Vertrag zur Auftragsverarbeitung (AVV)' },
  tom: { file: 'tom.md', title: 'Technische und organisatorische Maßnahmen (TOM)' },
  backup: { file: 'backup-konzept.md', title: 'Backup-Konzept' }
}

// Markdown-Template laden
export function getLegalDoc(docType) {
  const doc = DOCS[docType]
  if (!doc) return null
  const filePath = path.join(LEGAL_DIR, doc.file)
  if (!fs.existsSync(filePath)) return null
  const markdown = fs.readFileSync(filePath, 'utf8')
  return { markdown, title: doc.title }
}

// Markdown zu HTML konvertieren
export function renderLegalHtml(markdown) {
  return marked.parse(markdown)
}

// Vollständige druckoptimierte HTML-Seite erstellen
export function buildPrintPage(title, domain, datum, contentHtml) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — ${domain}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      line-height: 1.65;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      font-size: 14px;
    }
    h1 { font-size: 1.6rem; margin-bottom: 0.3rem; }
    h2 { font-size: 1.25rem; margin-top: 2rem; margin-bottom: 0.6rem; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
    h3 { font-size: 1rem; margin-top: 1.25rem; margin-bottom: 0.4rem; }
    p { margin-bottom: 0.6rem; }
    ul, ol { margin-left: 1.5rem; margin-bottom: 0.6rem; }
    li { margin-bottom: 0.2rem; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 0.9em; }
    th, td { border: 1px solid #bbb; padding: 0.4rem 0.6rem; text-align: left; }
    th { background: #f0f0f0; font-weight: 600; }
    code { background: #f5f5f5; padding: 0.1rem 0.35rem; border-radius: 3px; font-size: 0.85em; }
    pre { background: #f5f5f5; padding: 0.8rem; border-radius: 4px; overflow-x: auto; margin-bottom: 0.8rem; }
    pre code { background: none; padding: 0; }
    hr { border: none; border-top: 1px solid #ddd; margin: 1.5rem 0; }
    strong { font-weight: 600; }
    a { color: #1a1a1a; text-decoration: none; }
    .doc-header {
      background: #f8f9fa;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 0.8rem 1.2rem;
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .doc-header .meta { font-size: 0.85rem; color: #555; }
    .doc-header .meta strong { color: #1a1a1a; }
    .print-btn {
      background: #2563eb;
      color: white;
      border: none;
      padding: 0.45rem 1.1rem;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .print-btn:hover { background: #1d4ed8; }
    @media print {
      body { padding: 0; max-width: none; font-size: 11pt; }
      .doc-header { display: none; }
      h2 { break-before: auto; }
      table, tr, td, th { break-inside: avoid; }
      a { color: #1a1a1a; }
      @page { margin: 2cm; }
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <div>
      <div class="meta">Projekt: <strong>${domain}</strong></div>
      <div class="meta">Erstellt am: ${datum}</div>
    </div>
    <button class="print-btn" onclick="window.print()">Als PDF speichern</button>
  </div>
  ${contentHtml}
  <script>window.onload = () => setTimeout(() => window.print(), 300)</script>
</body>
</html>`
}
