import { cn } from '#/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 40" fill="none" className={cn('shrink-0', className)}>
      <path
        d="M8.2 2.5h11.6l5.6 5.1-3.1 28.9H5.7L2.6 7.6l5.6-5.1Z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M10.2 6.1h7.6l3.5 3.2-2.1 22.8H8.8L6.7 9.3l3.5-3.2Z"
        stroke="currentColor"
        strokeOpacity=".35"
        strokeWidth=".8"
        strokeLinejoin="round"
      />
      <path
        d="M14 11.2c-1.6 2.8-1.6 4.6 0 7.4 1.6-2.8 1.6-4.6 0-7.4Z"
        fill="currentColor"
        fillOpacity=".8"
      />
      <path d="M14 22.4v4.3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="14" cy="29.7" r="1.45" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  )
}
