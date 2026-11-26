import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { sendMagicLinkEmail, signInWithGoogle, useSession } from '#/lib/auth-client'
import { BrandMark } from '#/components/brand-mark'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const { data: session, isPending } = useSession()
  const [name, setName] = useState('')
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
    const { error: err } = await sendMagicLinkEmail(
      email.trim(),
      name.trim() || undefined,
      '/dashboard',
    )
    if (err) {
      console.error('[login] magic-link failed:', err)
      setError(err.message ?? 'Could not send the sign-in link.')
      return
    }
    setSent(true)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#faf8f5] px-5 py-12 text-[#0d1b2a]">
      <Link to="/" className="mb-8 flex items-center gap-2.5 transition-transform hover:scale-105">
        <BrandMark className="size-8 text-[#2b66f2]" />
        <span className="font-sans text-2xl font-bold tracking-tight text-[#0d1b2a]">StakeFit</span>
      </Link>

      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-extrabold sm:text-3xl">Sign in to StakeFit</CardTitle>
          <CardDescription>
            Lock your daily commitment. Put skin in the game. Keep 100% of your money.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full flex items-center justify-center gap-3 border border-[#0d1b2a1a] bg-white py-3.5 text-sm sm:text-base font-bold text-[#0d1b2a] shadow-xs hover:bg-[#faf8f5] hover:border-[#0d1b2a2a] transition-all cursor-pointer"
            onClick={() => void onGoogle()}
          >
            <GoogleLogo className="size-5 shrink-0" />
            <span>Sign in with Google</span>
          </Button>

          <div className="flex items-center gap-3 text-[0.65rem] font-bold uppercase tracking-wider text-[#94a3b8]">
            <span className="h-px flex-1 bg-[#0d1b2a14]" />
            or with email link
            <span className="h-px flex-1 bg-[#0d1b2a14]" />
          </div>

          <form onSubmit={onMagicLink} className="space-y-3.5 text-left">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              disabled={!email}
            >
              Send sign-in link
            </Button>
          </form>

          {sent ? (
            <p
              role="status"
              className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center text-xs font-semibold text-emerald-800"
            >
              ✓ Check your inbox for your instant sign-in link.
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="rounded-2xl border border-rose-500/20 bg-rose-50 p-3 text-center text-xs font-semibold text-rose-700"
            >
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
