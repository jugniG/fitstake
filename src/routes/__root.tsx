import { HeadContent, Scripts, createRootRoute, Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/400-italic.css'
import '@fontsource-variable/inter'
import appCss from '../styles.css?url'
import { BrandMark } from '#/components/brand-mark'

// The public production address. Link-preview crawlers can't fetch localhost, so the image URL
// must point here even in development. Change it when the custom domain is live.
const SITE_URL = 'https://fitstake-two.vercel.app'
const SITE_TITLE = 'StakeFit - Make showing up the only option'
const SITE_DESCRIPTION =
  'Do your workout on camera every day. Miss a day and your card is charged your stake.'

export const Route = createRootRoute({
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#070807' },
      { name: 'color-scheme', content: 'dark' },
      { title: SITE_TITLE },
      { name: 'description', content: SITE_DESCRIPTION },
      // Link previews (WhatsApp, X, LinkedIn, Slack). Crawlers need an absolute image URL.
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'StakeFit' },
      { property: 'og:url', content: SITE_URL },
      { property: 'og:title', content: SITE_TITLE },
      { property: 'og:description', content: SITE_DESCRIPTION },
      { property: 'og:image', content: `${SITE_URL}/og-image.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '825' },
      { property: 'og:image:alt', content: 'StakeFit: build a great body by working out consistently' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: SITE_TITLE },
      { name: 'twitter:description', content: SITE_DESCRIPTION },
      { name: 'twitter:image', content: `${SITE_URL}/og-image.png` },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Quicksand:wght@500;600;700&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#faf8f5] px-6 text-center text-[#0d1b2a]">
      <BrandMark className="size-12 text-[#2b66f2]" />
      <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#5a6678] mt-6">
        404 · Page Not Found
      </span>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-[#0d1b2a]">
        This page does not exist.
      </h1>
      <Link
        to="/dashboard"
        className="btn-quippy mt-6 inline-flex items-center gap-2 px-6 py-3 text-sm font-bold"
      >
        Return to Dashboard
      </Link>
    </div>
  )
}
