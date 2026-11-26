import * as React from 'react'
import { cn } from '#/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-2xl border border-[#0d1b2a1a] bg-white px-4 py-2 text-sm text-[#0d1b2a] shadow-xs transition-all placeholder:text-[#94a3b8] focus-visible:border-[#2b66f2] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#2b66f2]/15 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
