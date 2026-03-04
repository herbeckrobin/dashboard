// Paket-Vorlagen fuer Kunden-Gruppen

export const PACKAGES = {
  starter: {
    id: 'starter',
    label: 'Starter',
    price: { monthly: 25, yearly: 259 },
    limits: {
      projects: 1,
      storage: 5,           // GB
      domains: 1,
      email: { count: 3, sizeGb: 1 },
      support: { type: 'email', responseHours: 48 }
    }
  },
  business: {
    id: 'business',
    label: 'Business',
    price: { monthly: 49, yearly: 499 },
    limits: {
      projects: 3,
      storage: 15,
      domains: 3,
      email: { count: 20, sizeGb: 5 },
      support: { type: 'email+phone', responseHours: 24 }
    }
  },
  unbegrenzt: {
    id: 'unbegrenzt',
    label: 'Unbegrenzt',
    price: null,
    limits: {
      projects: -1,
      storage: -1,
      domains: -1,
      email: { count: -1, sizeGb: -1 },
      support: { type: 'email+phone', responseHours: 24 }
    }
  }
}

// Extra-Speicher: 2 EUR/Monat pro 5 GB
export const EXTRA_STORAGE_PRICE = 2
export const EXTRA_STORAGE_STEP = 5

export function getPackage(id) {
  return PACKAGES[id] || null
}

export function getPackageList() {
  return Object.values(PACKAGES)
}

export function isUnlimited(value) {
  return value === -1
}
