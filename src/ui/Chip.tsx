import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  icon?: ReactNode
}

/** A selectable pill. Use inside a role="radiogroup" or "group" container. */
export function Chip({ selected, icon, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(
        'inline-flex min-h-12 items-center gap-2 rounded-full border px-4 text-base font-medium transition-colors',
        selected
          ? 'border-primary bg-primary-soft text-primary-strong'
          : 'border-border bg-surface text-text hover:bg-surface-2',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
