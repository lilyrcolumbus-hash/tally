import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/[0.05] shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-xl',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
