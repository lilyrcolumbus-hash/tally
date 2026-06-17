import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl border border-ink-800 bg-ink-900/70 backdrop-blur-sm', className)}
      {...props}
    >
      {children}
    </div>
  )
}
