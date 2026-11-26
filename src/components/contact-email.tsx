import { useState } from 'react'
import { Check, Copy, Mail } from 'lucide-react'

const CONTACT_EMAIL = 'guptas3067@gmail.com'
const GMAIL_COMPOSE_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}`

interface ContactEmailProps {
  prefix?: string
  className?: string
}

export function ContactEmail({
  prefix = 'Talk with me directly:',
  className = '',
}: ContactEmailProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('[contact] failed to copy email address', error)
    }
  }

  return (
    <div
      className={`flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-xs font-medium text-[#5a6678] ${className}`}
    >
      <Mail className="size-3.5 shrink-0 text-[#2b66f2]" aria-hidden="true" />
      <span>{prefix}</span>
      <a
        href={GMAIL_COMPOSE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold text-[#0d1b2a] underline decoration-[#2b66f2]/40 underline-offset-4 transition-colors hover:text-[#2b66f2]"
      >
        {CONTACT_EMAIL}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        aria-live="polite"
        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#0d1b2a14] bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#5a6678] shadow-2xs transition-colors hover:border-[#2b66f2]/40 hover:text-[#0d1b2a]"
      >
        {copied ? (
          <>
            <Check className="size-3 text-emerald-600" aria-hidden="true" />
            <span className="text-emerald-700">Copied</span>
          </>
        ) : (
          <>
            <Copy className="size-3" aria-hidden="true" />
            <span>Copy</span>
          </>
        )}
      </button>
    </div>
  )
}
