import * as React from 'react'
import { cn } from '#/lib/utils'

export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'ghost'
  | 'link'
  | 'quippy'
  | 'quiet'
  | 'danger'

export type ButtonSize = 'default' | 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantStyles: Record<ButtonVariant, string> = {
  default: 'btn-quippy text-white shadow-xs',
  primary: 'btn-quippy text-white shadow-xs',
  quippy: 'btn-quippy text-white shadow-xs',
  secondary: 'btn-quippy-secondary shadow-xs',
  destructive:
    'bg-rose-600 text-white hover:bg-rose-700 shadow-xs border border-transparent rounded-full font-bold',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 shadow-xs border border-transparent rounded-full font-bold',
  outline:
    'border border-[#0d1b2a1a] bg-white text-[#0d1b2a] hover:bg-[#f1f3f7] rounded-full font-bold shadow-xs',
  ghost: 'text-[#5a6678] hover:text-[#0d1b2a] hover:bg-[#eef3fb] rounded-full font-bold',
  quiet: 'text-[#5a6678] hover:text-[#0d1b2a] hover:bg-[#eef3fb] rounded-full font-bold',
  link: 'text-[#2b66f2] underline-offset-4 hover:underline font-bold',
}

const sizeStyles: Record<ButtonSize, string> = {
  default: 'h-10 px-5 py-2 text-sm',
  md: 'h-10 px-5 py-2 text-sm',
  sm: 'h-8 px-3.5 text-xs',
  lg: 'h-12 px-7 text-base',
  icon: 'size-10 p-0 grid place-items-center',
}

export function buttonStyles({
  variant = 'default',
  size = 'default',
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 font-display font-bold tracking-tight rounded-full transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 select-none',
    variantStyles[variant],
    sizeStyles[size],
    className,
  )
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  ),
)

Button.displayName = 'Button'
