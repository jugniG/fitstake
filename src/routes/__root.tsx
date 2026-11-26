import { HeadContent, Scripts, createRootRoute, Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/400-italic.css'
import '@fontsource-variable/inter'
import appCss from '../styles.css?url'
import { BrandMark } from '#/components/brand-mark'

export const Route = createRootRoute({
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#070807' },
      { name: 'color-scheme', content: 'dark' },
      { title: 'Habit-Stakes — lock your word with real stakes' },
      {
        name: 'description',
        content:
          'Lock a commitment pot, win each day back with camera-verified workouts, settle once.',
      },
    ],
    links: [
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
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <BrandMark className="h-14 w-10 text-rust" />
      <p className="eyebrow mt-6">Missing page</p>
      <h1 className="mt-2 font-display text-3xl font-medium text-bone">
        This page was never carved.
      </h1>
      <Link
        to="/dashboard"
        className="mt-6 border border-line-strong px-4 py-2.5 text-sm text-bone-dim transition-colors hover:border-bone/40 hover:text-bone"
      >
        Return to the ritual
      </Link>
    </div>
  )
}
