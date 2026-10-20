import type { HTMLAttributes } from 'react'
import { cx } from './cx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean
}

export function Card({ padded = true, className, ...rest }: CardProps) {
  return (
    <div
      className={cx('rounded-card bg-surface shadow-card border border-border/60', padded && 'p-5', className)}
      {...rest}
    />
  )
}
