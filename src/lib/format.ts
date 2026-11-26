const inrFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
})

export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0'
  return `₹${inrFormatter.format(Math.round(amount))}`
}

export function formatClock(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

export function formatDateTime(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(isoDate))
  } catch {
    return 'Unknown time'
  }
}

export function formatPrescription(sets: number, reps: number): string {
  return `${sets} × ${reps}`
}

export function exerciseSummary(exercises: Array<{ name: string }>): string {
  return exercises.map((exercise) => exercise.name).join(' · ')
}
