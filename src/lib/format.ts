const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const currencyWhole = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function formatMoney(value: number, whole = false): string {
  return (whole ? currencyWhole : currency).format(value)
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7) // yyyy-mm
}

export function currentMonthKey(): string {
  return todayISO().slice(0, 7)
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export function prettyDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function clamp(n: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, n))
}

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  )
}
