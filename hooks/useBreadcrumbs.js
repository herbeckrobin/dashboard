// Breadcrumb-Context fuer dynamische Breadcrumbs (z.B. Projektname auf Edit-Seite)

import { createContext, useContext, useState, useEffect } from 'react'

const BreadcrumbContext = createContext({ extra: [], setExtra: () => {} })

export function BreadcrumbProvider({ children }) {
  const [extra, setExtra] = useState([])
  return (
    <BreadcrumbContext.Provider value={{ extra, setExtra }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

// Setzt zusaetzliche Breadcrumbs fuer die aktuelle Seite
export function useBreadcrumbs(crumbs) {
  const { setExtra } = useContext(BreadcrumbContext)
  const key = JSON.stringify(crumbs)
  useEffect(() => {
    setExtra(crumbs)
    return () => setExtra([])
  }, [key])
}

export function useExtraBreadcrumbs() {
  return useContext(BreadcrumbContext).extra
}
