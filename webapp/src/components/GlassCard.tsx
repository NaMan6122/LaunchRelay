import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  glow?: boolean
  style?: React.CSSProperties
}

export default function GlassCard({ children, className = '', glow = false, style }: Props) {
  return (
    <div
      className={`glass-card ${glow ? 'glass-glow' : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}
