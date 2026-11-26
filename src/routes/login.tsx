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

function LoginPage() {
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
          <Button variant="secondary" size="lg" className="w-full" onClick={() => void onGoogle()}>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-[0.65rem] font-bold uppercase tracking-wider text-[#94a3b8]">
            <span className="h-px flex-1 bg-[#0d1b2a14]" />
            or with email link
            <span className="h-px flex-1 bg-[#0d1b2a14]" />
          </div>

          <form onSubmit={onMagicLink} className="space-y-3.5 text-left">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Name <span className="text-xs font-normal text-[#94a3b8]">(optional)</span>
              </Label>
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
