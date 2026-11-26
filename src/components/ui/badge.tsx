import * as React from 'react'
import { cn } from '#/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    default: 'border-transparent bg-[#2b66f2] text-white shadow-xs',
    secondary: 'border-transparent bg-[#eef3fb] text-[#2b66f2]',
    destructive: 'border-transparent bg-rose-50 border border-rose-200 text-rose-700',
    outline: 'border border-[#0d1b2a14] text-[#0d1b2a] bg-white',
    success: 'border-transparent bg-emerald-50 border border-emerald-200 text-emerald-700',
    warning: 'border-transparent bg-amber-50 border border-amber-200 text-amber-800',
  }[variant]

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wider uppercase transition-colors',
        variantStyles,
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
