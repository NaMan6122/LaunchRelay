interface Props {
  score: number
  verified?: boolean
  boosted?: boolean
}

export default function TrustBadge({ score, verified, boosted }: Props) {
  let label: string
  let variant: string
  if (score >= 0.8) { label = 'High Trust'; variant = 'green' }
  else if (score >= 0.5) { label = 'Trusting'; variant = 'yellow' }
  else { label = 'New'; variant = 'gray' }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span className={`badge badge-${variant}`}>{(score * 100).toFixed(0)}% {label}</span>
      {verified && <span className="badge badge-blue">✓ Verified Traffic</span>}
      {boosted && <span className="badge badge-premium">★ Featured</span>}
    </span>
  )
}
