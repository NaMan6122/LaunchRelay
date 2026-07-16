import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, type StartupProfile } from '../api'

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

  if (loading) return <div className="loading-state"><div className="spinner" /></div>
  if (error) return <div className="empty"><h3>{error}</h3><Link to="/directory" className="btn btn-outline">Back to Directory</Link></div>
  if (!profile) return null

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
          <a href={profile.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
            Visit Website &rarr;
          </a>
        </div>
      </section>

      <div className="profile-stats-grid">
        <div className="kpi">
          <div className="value">{profile.stats.impressions_30d.toLocaleString()}</div>
          <div className="label">Impressions (30d)</div>
        </div>
        <div className="kpi">
          <div className="value">{profile.stats.clicks_30d.toLocaleString()}</div>
          <div className="label">Clicks (30d)</div>
        </div>
        <div className="kpi">
          <div className="value">{(profile.trust_score * 100).toFixed(0)}%</div>
          <div className="label">Trust Score</div>
        </div>
        <div className="kpi">
          <div className="value">{new Date(profile.joined_at).toLocaleDateString()}</div>
          <div className="label">Joined</div>
        </div>
      </div>

      <div className="card">
        <h2>About {profile.name}</h2>
        <p>{profile.one_line_pitch}</p>
        <p className="text-muted" style={{ marginTop: 16 }}>
          <a href={profile.url} target="_blank" rel="noopener noreferrer">{profile.url}</a>
        </p>
      </div>
    </>
  )
}
