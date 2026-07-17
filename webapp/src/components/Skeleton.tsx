interface SkeletonCardProps {
  lines?: number
}

export function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card-inner">
        <div className="skeleton skeleton-avatar" />
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`skeleton skeleton-line ${
              i === lines - 1 ? 'skeleton-line-sm' : i === 0 ? 'skeleton-line-lg' : 'skeleton-line-md'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export function SkeletonKpi() {
  return <div className="skeleton-kpi" />
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="directory-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skeleton-line skeleton-line-lg" style={{ height: 14 }} />
      ))}
    </div>
  )
}
