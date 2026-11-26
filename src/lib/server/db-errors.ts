export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const record = error as { code?: unknown; message?: unknown; cause?: unknown } | null
  if (!record) return false

  const cause = record.cause as { code?: unknown; message?: unknown } | null
  const codes = [record.code, cause?.code]
  if (codes.includes('23505')) return true

  const messages = [record.message, cause?.message].filter(
    (message): message is string => typeof message === 'string',
  )
  if (!messages.some((message) => /23505|unique|duplicate/i.test(message))) return false
  return constraint ? messages.some((message) => message.includes(constraint)) : true
}
