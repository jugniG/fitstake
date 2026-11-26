import { createAuthClient } from 'better-auth/react'
import { magicLinkClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({ plugins: [magicLinkClient()] })

export const useSession = () => authClient.useSession()

export function signInWithGoogle(callbackURL = '/dashboard') {
  return authClient.signIn.social({ provider: 'google', callbackURL })
}

export function sendMagicLinkEmail(email: string, name?: string, callbackURL = '/dashboard') {
  return authClient.signIn.magicLink({ email, name, callbackURL })
}

export function signOut() {
  return authClient.signOut()
}
