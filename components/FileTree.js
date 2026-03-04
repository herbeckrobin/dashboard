// FileTree — Live-Ansicht der vom AI generierten Dateien (Git-Style)
// Zeigt Ordnerstruktur mit Datei-Preview (erste 5 Zeilen der zuletzt erstellten Datei)

import { useState, useEffect, useRef } from 'react'
import { Skeleton } from './Skeleton'

// Dateien in Baum-Struktur umwandeln
function buildTree(fileChanges) {
  const root = { name: '', children: {}, files: [] }

  for (const fc of fileChanges) {
    const parts = fc.path.split('/')
    let node = root

    // Ordner-Pfad durchlaufen
    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i]
      if (!node.children[dir]) {
        node.children[dir] = { name: dir, children: {}, files: [] }
      }
      node = node.children[dir]
    }

    // Datei einfuegen
    node.files.push({
      name: parts[parts.length - 1],
      preview: fc.preview,
      timestamp: fc.timestamp,
      fullPath: fc.path,
    })
  }

  return root
}

// Ordner-Icon (SVG)
function FolderIcon({ open }) {
  return open ? (
    <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  )
}

// Datei-Icon basierend auf Extension
function FileIcon({ name }) {
  const ext = name.split('.').pop()?.toLowerCase()
  const colors = {
    tsx: 'text-blue-400', ts: 'text-blue-400', jsx: 'text-yellow-400', js: 'text-yellow-400',
    scss: 'text-pink-400', css: 'text-pink-400',
    json: 'text-green-400', html: 'text-orange-400', php: 'text-purple-400',
    sql: 'text-cyan-400', md: 'text-gray-400',
  }
  const color = colors[ext] || 'text-gray-400'

  return (
    <svg className={`w-4 h-4 ${color} flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

// Einzelner Ordner-Knoten (rekursiv)
function TreeNode({ node, depth = 0, expandedFile, onFileClick, latestFile }) {
  const [open, setOpen] = useState(true)
  const dirs = Object.values(node.children).sort((a, b) => a.name.localeCompare(b.name))
  const files = [...node.files].sort((a, b) => a.name.localeCompare(b.name))
  const indent = depth * 16

  return (
    <>
      {node.name && (
        <div
          className="flex items-center gap-1.5 py-0.5 px-1 -mx-1 rounded cursor-pointer hover:bg-gray-800/50"
          style={{ paddingLeft: indent }}
          onClick={() => setOpen(!open)}
        >
          <span className="text-gray-500 text-[10px] w-3">{open ? '▼' : '▶'}</span>
          <FolderIcon open={open} />
          <span className="text-gray-300 text-xs">{node.name}</span>
        </div>
      )}
      {open && (
        <>
          {dirs.map(dir => (
            <TreeNode
              key={dir.name}
              node={dir}
              depth={node.name ? depth + 1 : depth}
              expandedFile={expandedFile}
              onFileClick={onFileClick}
              latestFile={latestFile}
            />
          ))}
          {files.map(file => {
            const isLatest = file.fullPath === latestFile
            const isExpanded = expandedFile === file.fullPath
            return (
              <div key={file.fullPath}>
                <div
                  className={`flex items-center gap-1.5 py-0.5 px-1 -mx-1 rounded cursor-pointer hover:bg-gray-800/50 ${
                    isLatest ? 'animate-fade-in' : ''
                  }`}
                  style={{ paddingLeft: (node.name ? depth + 1 : depth) * 16 }}
                  onClick={() => onFileClick(file.fullPath)}
                >
                  <span className="text-green-400 text-[10px] w-3 font-bold">+</span>
                  <FileIcon name={file.name} />
                  <span className={`text-xs truncate ${isLatest ? 'text-green-300' : 'text-gray-300'}`}>
                    {file.name}
                  </span>
                  {isExpanded && (
                    <span className="text-gray-600 text-[10px] ml-auto">▼</span>
                  )}
                </div>
                {isExpanded && file.preview && (
                  <pre
                    className="ml-5 mt-0.5 mb-1 p-2 rounded text-[10px] leading-relaxed bg-black/60 border border-gray-700/50 text-green-400/70 whitespace-pre-wrap break-all max-h-24 overflow-hidden"
                    style={{ marginLeft: ((node.name ? depth + 1 : depth) * 16) + 12 }}
                  >
                    {file.preview}
                  </pre>
                )}
              </div>
            )
          })}
        </>
      )}
    </>
  )
}

// Skeleton fuer FileTree (bevor Dateien kommen)
function FileTreeSkeleton() {
  return (
    <div className="space-y-1.5 p-3">
      {/* Ordner-Zeilen */}
      <div className="flex items-center gap-2">
        <Skeleton className="w-3 h-3 rounded-sm" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Skeleton className="w-3 h-3 rounded-sm" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Skeleton className="w-3 h-3 rounded-sm" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="flex items-center gap-2 ml-8">
        <Skeleton className="w-3 h-3 rounded-sm" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="flex items-center gap-2 ml-8">
        <Skeleton className="w-3 h-3 rounded-sm" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="w-3 h-3 rounded-sm" />
        <Skeleton className="h-3 w-14" />
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Skeleton className="w-3 h-3 rounded-sm" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Skeleton className="w-3 h-3 rounded-sm" />
        <Skeleton className="h-3 w-32" />
      </div>
      {/* Code-Preview Skeleton */}
      <div className="ml-8 mt-1 p-2 rounded bg-black/40 border border-gray-700/30 space-y-1">
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-2 w-3/4" />
        <Skeleton className="h-2 w-5/6" />
        <Skeleton className="h-2 w-2/3" />
        <Skeleton className="h-2 w-1/2" />
      </div>
    </div>
  )
}

export default function FileTree({ fileChanges = [], isDeploying = false }) {
  const [expandedFile, setExpandedFile] = useState(null)
  const containerRef = useRef(null)
  const prevCountRef = useRef(0)

  // Neueste Datei bestimmen
  const latestFile = fileChanges.length > 0
    ? fileChanges.reduce((a, b) => a.timestamp > b.timestamp ? a : b).path
    : null

  // Auto-expand der neuesten Datei wenn neue hinzukommen
  useEffect(() => {
    if (fileChanges.length > prevCountRef.current && latestFile) {
      setExpandedFile(latestFile)
    }
    prevCountRef.current = fileChanges.length
  }, [fileChanges.length, latestFile])

  // Auto-scroll nach unten bei neuen Dateien
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [fileChanges.length])

  const handleFileClick = (path) => {
    setExpandedFile(expandedFile === path ? null : path)
  }

  const tree = buildTree(fileChanges)
  const hasFiles = fileChanges.length > 0

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden h-full flex flex-col">
      <div className="px-3 py-2 bg-gray-800 border-b border-gray-700 flex items-center gap-2">
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className="font-medium text-xs text-gray-300">Dateien</span>
        {hasFiles && (
          <span className="text-[10px] text-gray-500 ml-auto">{fileChanges.length} Dateien</span>
        )}
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto font-mono text-xs p-3 min-h-0">
        {!hasFiles && isDeploying && <FileTreeSkeleton />}
        {!hasFiles && !isDeploying && (
          <div className="text-gray-500 text-xs p-2">Keine Dateien generiert</div>
        )}
        {hasFiles && (
          <TreeNode
            node={tree}
            expandedFile={expandedFile}
            onFileClick={handleFileClick}
            latestFile={latestFile}
          />
        )}
      </div>
    </div>
  )
}
