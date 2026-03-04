// Aufklappbare Sektion (Akkordeon) fuer Formulare und Einstellungen

import { useState } from 'react'

export default function CollapsibleSection({ title, defaultOpen = true, children, icon, headerRight }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 sm:p-6 hover:bg-gray-700/50 transition-colors">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          {icon && <span className="text-gray-400">{icon}</span>}
          <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {headerRight && <div onClick={e => e.stopPropagation()}>{headerRight}</div>}
      </div>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
