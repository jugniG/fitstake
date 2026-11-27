const usdFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export function formatUSD(amount: number): string {
  if (!Number.isFinite(amount)) return '$0'
  return `$${usdFormatter.format(Math.round(amount))}`
}

export function formatClock(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(
      new Date(iso),
    )
  } catch {
    return '-'
  }
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return 'Unknown time'
  }
}

export function formatPrescription(sets: number, reps: number): string {
  return `${sets} × ${reps}`
}
