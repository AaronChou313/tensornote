import type { ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const buttonVariants = cva(
  'inline-flex min-h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] px-3 text-sm font-medium transition-[background-color,color,transform,border-color] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--accent)] text-white hover:brightness-95',
        secondary:
          'border border-[var(--line)] bg-[var(--surface-raised)] text-[var(--ink)] hover:bg-[var(--surface-muted)]',
        ghost: 'text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]',
        danger: 'border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_9%,transparent)]',
      },
      size: {
        sm: 'min-h-8 px-2.5 text-xs',
        md: 'min-h-9 px-3',
        icon: 'size-9 p-0',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
