import type { ReactNode } from 'react'

type Variant = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'premium'

interface Props {
  children: ReactNode
  variant?: Variant
  className?: string
}

export default function Badge({ children, variant = 'gray', className = '' }: Props) {
  return <span className={`badge badge-${variant} ${className}`}>{children}</span>
}
