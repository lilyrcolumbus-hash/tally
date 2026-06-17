export interface Settings {
  currency: string
  lowStockDefault: number
}

const KEY = 'tally_settings'

const DEFAULTS: Settings = {
  currency: (import.meta.env.VITE_DEFAULT_CURRENCY as string | undefined) || 'USD',
  lowStockDefault: 3,
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function saveSettings(next: Settings): void {
  localStorage.setItem(KEY, JSON.stringify(next))
}
