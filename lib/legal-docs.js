// Rechtliche Dokumente: Markdown-Templates laden und als PDF generieren

import fs from 'fs'
import path from 'path'
import { marked } from 'marked'
import puppeteer from 'puppeteer'

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

// HTML-Seite fuer PDF-Rendering erstellen
function buildHtmlForPdf(title, domain, datum, contentHtml) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      font-size: 11pt;
    }
    h1 { font-size: 18pt; margin-bottom: 4pt; color: #111; }
    h2 { font-size: 14pt; margin-top: 20pt; margin-bottom: 8pt; color: #111; border-bottom: 0.5pt solid #ccc; padding-bottom: 4pt; }
    h3 { font-size: 11pt; margin-top: 14pt; margin-bottom: 4pt; color: #222; }
    p { margin-bottom: 6pt; }
    em { font-style: italic; }
    ul, ol { margin-left: 18pt; margin-bottom: 6pt; }
    li { margin-bottom: 2pt; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10pt; font-size: 10pt; }
    th, td { border: 0.5pt solid #999; padding: 4pt 6pt; text-align: left; }
    th { background: #f0f0f0; font-weight: 600; }
    code { font-family: 'Courier New', monospace; background: #f5f5f5; padding: 1pt 3pt; border-radius: 2pt; font-size: 9pt; }
    pre { background: #f5f5f5; padding: 8pt; border-radius: 3pt; margin-bottom: 8pt; font-size: 9pt; }
    pre code { background: none; padding: 0; }
    hr { border: none; border-top: 0.5pt solid #ccc; margin: 14pt 0; }
    strong { font-weight: 600; }
    a { color: #1a1a1a; text-decoration: none; }
    .doc-header {
      border-bottom: 1pt solid #333;
      padding-bottom: 10pt;
      margin-bottom: 20pt;
    }
    .doc-header .title { font-size: 9pt; color: #666; margin-bottom: 2pt; }
    .doc-header .domain { font-size: 10pt; color: #333; }
  </style>
</head>
<body>
  <div class="doc-header">
    <div class="title">Erstellt am ${datum} fuer</div>
    <div class="domain"><strong>${domain}</strong></div>
  </div>
  ${contentHtml}
</body>
</html>`
}

// PDF aus Markdown generieren
export async function generatePdf(docType, domain) {
  const doc = getLegalDoc(docType)
  if (!doc) return null

  const datum = new Date().toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })

  const contentHtml = marked.parse(doc.markdown)
  const html = buildHtmlForPdf(doc.title, domain, datum, contentHtml)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
      printBackground: true
    })

    return { buffer: Buffer.from(pdf), title: doc.title }
  } finally {
    await browser.close()
  }
}
