import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { sendMagicLinkEmail, signInWithGoogle, useSession } from '#/lib/auth-client'
import { BrandMark } from '#/components/brand-mark'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { data: session, isPending } = useSession()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isPending && session) {
      void navigate({ to: '/dashboard', replace: true })
    }
  }, [isPending, session, navigate])

  async function onGoogle() {
    setError(null)
    const { error: err } = await signInWithGoogle('/dashboard')
    if (err) {
      console.error('[login] Google sign-in failed:', err)
      setError(err.message ?? 'Google sign-in is not configured. Use the email link instead.')
    }
  }

  async function onMagicLink(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const { error: err } = await sendMagicLinkEmail(email.trim(), '/dashboard')
    if (err) {
      console.error('[login] magic-link failed:', err)
      setError(err.message ?? 'Could not send the sign-in link.')
      return
    }
    setSent(true)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <BrandMark className="h-14 w-10 text-rust" />
      <h1 className="mt-6 font-display text-3xl font-medium text-bone">Sign in</h1>

      <div className="mt-8 w-full max-w-sm space-y-4">
        <Button variant="secondary" size="lg" className="w-full" onClick={() => void onGoogle()}>
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-[0.6rem] uppercase tracking-[0.2em] text-faint">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={onMagicLink} className="space-y-3 text-left">
          <label htmlFor="email" className="field-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="field-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={!email}>
            Send sign-in link
          </Button>
        </form>

        {sent ? (
          <p
            role="status"
            className="border border-line bg-panel/50 px-3 py-2 text-xs text-bone-dim"
          >
            Check your email for the sign-in link.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="field-error">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
