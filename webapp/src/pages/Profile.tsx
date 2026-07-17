import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, type StartupProfile } from '../api'
import GlassCard from '../components/GlassCard'
import TrustBadge from '../components/TrustBadge'
import AnimatedSection from '../components/AnimatedSection'
import { SkeletonCard, SkeletonKpi } from '../components/Skeleton'

export default function Profile() {
  const { slug } = useParams<{ slug: string }>()
  const [profile, setProfile] = useState<StartupProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    api.directory.get(slug)
      .then(setProfile)
      .catch(() => setError('Startup not found'))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '32px 0' }}>
      <div className="skeleton skeleton-line skeleton-line-lg" style={{ height: 32, width: '40%' }} />
      <div className="skeleton skeleton-line skeleton-line-md" style={{ height: 16, width: '60%' }} />
      <div className="profile-stats-grid">
        <SkeletonKpi /><SkeletonKpi /><SkeletonKpi /><SkeletonKpi />
      </div>
      <SkeletonCard lines={4} />
    </div>
  )
  if (error) return <div className="empty"><h3>{error}</h3><Link to="/directory" className="btn btn-outline">Back to Directory</Link></div>
  if (!profile) return null

  const ctr = profile.stats.impressions_30d > 0
    ? ((profile.stats.clicks_30d / profile.stats.impressions_30d) * 100).toFixed(2)
    : '0.00'

  return (
    <>
      <section className="profile-header">
        <div className="profile-avatar">{profile.name.charAt(0).toUpperCase()}</div>
        <div className="profile-info">
          <h1>{profile.name}</h1>
          <p className="profile-pitch">{profile.one_line_pitch}</p>
          <div className="profile-tags">
            {profile.categories.map((c) => (
              <Link key={c} to={`/directory?category=${c}`} className="badge badge-blue">{c}</Link>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <a href={profile.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              Visit Website →
            </a>
          </div>
          <TrustBadge score={profile.trust_score} verified={profile.verified_traffic} boosted={profile.boost_level > 0} />
        </div>
      </section>

      <AnimatedSection>
        <div className="profile-stats-grid">
          <GlassCard>
            <div className="kpi-card-content">
              <div className="value">{profile.stats.impressions_30d.toLocaleString()}</div>
              <div className="label">Impressions (30d)</div>
            </div>
          </GlassCard>
          <GlassCard>
            <div className="kpi-card-content">
              <div className="value">{profile.stats.clicks_30d.toLocaleString()}</div>
              <div className="label">Clicks (30d)</div>
            </div>
          </GlassCard>
          <GlassCard>
            <div className="kpi-card-content">
              <div className="value">{ctr}%</div>
              <div className="label">CTR</div>
            </div>
          </GlassCard>
          <GlassCard>
            <div className="kpi-card-content">
              <div className="value">{new Date(profile.joined_at).toLocaleDateString()}</div>
              <div className="label">Joined</div>
            </div>
          </GlassCard>
        </div>
      </AnimatedSection>

      <GlassCard>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--navy)' }}>About {profile.name}</h2>
        <p style={{ color: 'var(--slate-600)', lineHeight: 1.7 }}>{profile.one_line_pitch}</p>
        <p style={{ marginTop: 16 }}>
          <a href={profile.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue-600)' }}>{profile.url}</a>
        </p>
      </GlassCard>
    </>
  )
}
