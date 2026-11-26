import { cn } from '#/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
    >
      {/* Outer commitment stake / athletic shield */}
      <path
        d="M16 2.5L27 6.5V15C27 22 22 27.5 16 29.5C10 27.5 5 22 5 15V6.5L16 2.5Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Inner energetic athletic lightning bolt */}
      <path
        d="M17.5 7.5L10 16.5H16L14.5 24.5L22 15.5H16L17.5 7.5Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}
