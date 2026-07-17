import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, type DashboardData, type EmbedInstance } from '../api'
import KpiCard from '../components/KpiCard'
import GlassCard from '../components/GlassCard'
import TrustBadge from '../components/TrustBadge'
import AnimatedSection from '../components/AnimatedSection'
import { SkeletonKpi } from '../components/Skeleton'

export default function Dashboard() {
  const { startupId } = useParams<{ startupId: string }>()
  const [data, setData] = useState<DashboardData | null>(null)
  const [embeds, setEmbeds] = useState<EmbedInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!startupId) return
    setLoading(true)
    Promise.all([
      api.dashboard.get(startupId),
      api.embeds.list(startupId).catch(() => [] as EmbedInstance[]),
    ]).then(([d, e]) => {
      setData(d)
      setEmbeds(e)
    }).catch(() => setError('Dashboard not found'))
      .finally(() => setLoading(false))
  }, [startupId])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '16px 0' }}>
      <div className="skeleton skeleton-line skeleton-line-lg" style={{ height: 28, width: '30%' }} />
      <div className="kpi-grid">
        <SkeletonKpi /><SkeletonKpi /><SkeletonKpi /><SkeletonKpi />
      </div>
      <div className="grid-2">
        <div className="skeleton-card" style={{ height: 180 }} />
        <div className="skeleton-card" style={{ height: 180 }} />
      </div>
    </div>
  )
  if (error) return <div className="empty"><h3>{error}</h3><Link to="/" className="btn btn-outline">Go Home</Link></div>
  if (!data) return null

  const { overview, reciprocity, recent_matches, trust, breakdowns } = data

  function computeTrend(byDay?: { date: string; count: number }[]): { direction: 'up' | 'down'; change: string } | undefined {
    if (!byDay || byDay.length < 4) return undefined
    const n = byDay.length
    const firstHalf = byDay.slice(0, Math.floor(n / 2)).reduce((s, d) => s + d.count, 0)
    const secondHalf = byDay.slice(Math.floor(n / 2)).reduce((s, d) => s + d.count, 0)
    if (firstHalf === 0) return undefined
    const pct = ((secondHalf - firstHalf) / firstHalf) * 100
    const absPct = Math.abs(pct)
    if (absPct < 1) return undefined
    return { direction: pct > 0 ? 'up' : 'down', change: `${absPct.toFixed(0)}%` }
  }

  return (
    <>
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="trust-indicator">
          <TrustBadge score={trust.score} />
        </div>
      </div>

      <AnimatedSection>
        <div className="kpi-grid">
          <KpiCard
            value={overview.impressions_7d.toLocaleString()}
            label="Impressions (7d)"
            sparklineData={overview.impressions_by_day}
            trend={computeTrend(overview.impressions_by_day)}
            color="#3b82f6"
          />
          <KpiCard
            value={overview.clicks_7d.toLocaleString()}
            label="Clicks (7d)"
            sparklineData={overview.clicks_by_day}
            trend={computeTrend(overview.clicks_by_day)}
            color="#10b981"
          />
          <KpiCard value={(overview.ctr * 100).toFixed(2) + '%'} label="CTR" />
          <KpiCard value={overview.reciprocity_balance > 0 ? `+${overview.reciprocity_balance}` : String(overview.reciprocity_balance)} label="Reciprocity Balance" />
          {overview.conversions_7d !== undefined && (
            <KpiCard value={overview.conversions_7d.toLocaleString()} label="Conversions (7d)" />
          )}
          {overview.conversion_rate !== undefined && overview.conversion_rate > 0 && (
            <KpiCard value={overview.conversion_rate.toFixed(2) + '%'} label="Conversion Rate" />
          )}
        </div>
      </AnimatedSection>

      <AnimatedSection delay={100}>
        <div className="grid-2">
          <GlassCard>
            <h2>Reciprocity</h2>
            <div className="reciprocity-detail">
              <div className="reciprocity-row">
                <span>Impressions given</span>
                <strong>{reciprocity.impressions_given.toLocaleString()}</strong>
              </div>
              <div className="reciprocity-row">
                <span>Impressions received</span>
                <strong>{reciprocity.impressions_received.toLocaleString()}</strong>
              </div>
              <div className="reciprocity-row">
                <span>Balance</span>
                <strong className={reciprocity.balance >= 0 ? 'positive' : 'negative'}>
                  {reciprocity.balance > 0 ? '+' : ''}{reciprocity.balance}
                </strong>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h2>Trust Status</h2>
            <div className="trust-detail">
              <div className="trust-row">
                <span>Status</span>
                <span className={`badge ${trust.status === 'active' ? 'badge-green' : trust.status === 'grace_period' ? 'badge-yellow' : 'badge-red'}`}>
                  {trust.status}
                </span>
              </div>
              <div className="trust-row">
                <span>Trust score</span>
                <strong>{(trust.score * 100).toFixed(0)}%</strong>
              </div>
              {trust.last_verified_at && (
                <div className="trust-row">
                  <span>Last verified</span>
                  <span>{new Date(trust.last_verified_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </AnimatedSection>

      {embeds.length > 0 && (
        <AnimatedSection delay={150}>
          <GlassCard>
            <h2>Embedded Domains</h2>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Format</th>
                    <th>Theme</th>
                    <th>Status</th>
                    <th>Last Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {embeds.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.host_domain}</td>
                      <td>{e.widget_format}</td>
                      <td>{e.widget_theme}</td>
                      <td>
                        <span className={`badge ${e.status === 'active' ? 'badge-green' : e.status === 'grace_period' ? 'badge-yellow' : 'badge-red'}`}>
                          {e.status === 'grace_period' ? 'Grace Period' : e.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {e.last_verified_at ? new Date(e.last_verified_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link to={`/dashboard/${startupId}/widget`} className="btn btn-outline" style={{ marginTop: 16, display: 'inline-flex' }}>
              Widget Settings
            </Link>
          </GlassCard>
        </AnimatedSection>
      )}

      {recent_matches && recent_matches.length > 0 && (
        <AnimatedSection delay={200}>
          <GlassCard>
            <h2>Recent Matches</h2>
            <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Startup</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  {recent_matches[0].conversions !== undefined && <th>Conversions</th>}
                </tr>
              </thead>
              <tbody>
                {recent_matches.map((m) => (
                  <tr key={m.startup_id}>
                    <td><Link to={`/directory/${m.startup_id}`} className="startup-link">{m.name}</Link></td>
                    <td>{m.impressions}</td>
                    <td>{m.clicks}</td>
                    {m.conversions !== undefined && <td>{m.conversions}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </GlassCard>
        </AnimatedSection>
      )}

      {breakdowns && (
        <AnimatedSection delay={300}>
          <div className="breakdown-grid">
            {breakdowns.by_device.length > 0 && (
              <GlassCard>
                <h2>By Device</h2>
                <div className="table-wrap">
                <table>
                  <thead><tr><th>Device</th><th>Views</th><th>%</th></tr></thead>
                  <tbody>
                    {breakdowns.by_device.map((d) => (
                      <tr key={d.device_type}>
                        <td style={{ textTransform: 'capitalize' }}>{d.device_type}</td>
                        <td>{d.impressions}</td>
                        <td>{d.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </GlassCard>
            )}
            {breakdowns.by_referrer.length > 0 && (
              <GlassCard>
                <h2>By Referrer</h2>
                <div className="table-wrap">
                <table>
                  <thead><tr><th>Source</th><th>Views</th></tr></thead>
                  <tbody>
                    {breakdowns.by_referrer.map((r) => (
                      <tr key={r.source}>
                        <td>{r.source}</td>
                        <td>{r.impressions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </GlassCard>
            )}
            {breakdowns.by_country.length > 0 && (
              <GlassCard>
                <h2>By Country</h2>
                <div className="table-wrap">
                <table>
                  <thead><tr><th>Country</th><th>Views</th></tr></thead>
                  <tbody>
                    {breakdowns.by_country.map((c) => (
                      <tr key={c.country}>
                        <td>{c.country}</td>
                        <td>{c.impressions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </GlassCard>
            )}
          </div>
        </AnimatedSection>
      )}
    </>
  )
}
