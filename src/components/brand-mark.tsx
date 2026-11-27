import { cn } from '#/lib/utils'

// The logo has one source, public/favicon.svg, which is also the browser tab icon. Change the
// logo there, not here.
export const LOGO_SRC = '/favicon.svg'

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={LOGO_SRC}
      alt=""
      aria-hidden="true"
      width={32}
      height={32}
      className={cn('shrink-0', className)}
    />
  )
}
