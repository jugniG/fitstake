import { Resend } from 'resend'
import { env } from './env'

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

// Magic-link delivery. Without a transport configured it logs the link so dev still works.
export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  if (!resend || !env.RESEND_FROM) {
    console.info('[auth] magic-link url (no email transport configured):', url)
    return
  }
  try {
    await resend.emails.send({
      from: env.RESEND_FROM,
      to: email,
      subject: 'Sign in to Habit-Stakes',
      text: `Open this link to sign in:\n${url}`,
      html: `<p>Open this link to sign in:</p><p><a href="${url}">${url}</a></p>`,
    })
  } catch (error) {
    console.error('[auth] magic-link send failed:', error)
    // Let Better Auth report the failure instead of claiming a link was sent.
    throw new Error('The sign-in email could not be sent. Try again or continue with Google.')
  }
}
