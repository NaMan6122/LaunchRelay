import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type EmbedInstance } from '../api'
import GlassCard from '../components/GlassCard'
import { useToast } from '../components/ToastContext'

const FORMATS = ['bar', 'badge', 'card'] as const
const THEMES = ['light', 'dark'] as const
const POSITIONS = ['bottom', 'top'] as const

function buildEmbedCode(startupID: string, cfg: { format: string; theme: string; position: string; noBranding: boolean }) {
  let code = `<script src="https://cdn.launchrelay.com/widget.js" data-startup-id="${startupID}"`
  code += ` data-format="${cfg.format}"`
  code += ` data-theme="${cfg.theme}"`
  code += ` data-position="${cfg.position}"`
  if (cfg.noBranding) code += ` data-no-branding`
  code += ` async></script>`
  return code
}

export default function WidgetSettings() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [embeds, setEmbeds] = useState<EmbedInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  function loadEmbeds() {
    if (!id) return
    api.embeds.list(id).then((data) => setEmbeds(data || [])).catch(() => {
      toast('Failed to load embeds', 'error')
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadEmbeds()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function updateEmbed(embedId: string, field: string, value: string | boolean) {
    if (!id) return
    setSaving(embedId)
    try {
      await api.embeds.update(id, embedId, { [field]: value })
      setEmbeds((prev) => prev.map((e) =>
        e.id === embedId ? { ...e, [field === 'no_branding' ? 'no_branding' : field]: value } : e
      ))
      toast('Widget setting updated', 'success')
    } catch {
      toast('Failed to update', 'error')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return <section className="page-centered"><div className="spinner" /></section>
  }

  const embedCode = embeds.length > 0
    ? buildEmbedCode(id!, {
        format: embeds[0].widget_format,
        theme: embeds[0].widget_theme,
        position: embeds[0].widget_position,
        noBranding: embeds[0].no_branding,
      })
    : `<script src="https://cdn.launchrelay.com/widget.js" data-startup-id="${id}" async></script>`

  return (
    <section className="page-centered" style={{ display: 'block', maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 32 }}>Widget Settings</h2>

      {embeds.length === 0 ? (
        <GlassCard glow>
          <h3>No embeds detected</h3>
          <p className="text-muted" style={{ marginTop: 8, marginBottom: 16 }}>
            Paste this script tag on your site to get started. Once the re-crawl system detects it, you'll be able to customize settings here.
          </p>
          <code className="embed-code" style={{ display: 'block', marginBottom: 12, padding: 12, background: 'var(--bg-primary)', borderRadius: 6, fontSize: 13, wordBreak: 'break-all' }}>
            {embedCode}
          </code>
          <button className="btn btn-primary" onClick={() => navigator.clipboard.writeText(embedCode).then(() => toast('Copied!', 'success'))}>
            Copy Embed Code
          </button>
        </GlassCard>
      ) : (
        embeds.map((embed) => (
          <GlassCard key={embed.id} glow style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{embed.host_domain}</h3>
              <span className={`badge ${embed.status === 'active' ? 'badge-green' : embed.status === 'grace_period' ? 'badge-yellow' : 'badge-red'}`}>
                {embed.status}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div className="form-group">
                <label>Format</label>
                <select
                  value={embed.widget_format}
                  onChange={(e) => updateEmbed(embed.id, 'widget_format', e.target.value)}
                  className="form-select"
                  disabled={saving === embed.id}
                >
                  {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Theme</label>
                <select
                  value={embed.widget_theme}
                  onChange={(e) => updateEmbed(embed.id, 'widget_theme', e.target.value)}
                  className="form-select"
                  disabled={saving === embed.id}
                >
                  {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Position</label>
                <select
                  value={embed.widget_position}
                  onChange={(e) => updateEmbed(embed.id, 'widget_position', e.target.value)}
                  className="form-select"
                  disabled={saving === embed.id}
                >
                  {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Branding</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={embed.no_branding}
                    onChange={(e) => updateEmbed(embed.id, 'no_branding', e.target.checked)}
                    disabled={saving === embed.id}
                  />
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Hide "Powered by LaunchRelay"</span>
                </label>
              </div>
            </div>

            <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 16 }}>
              <p className="text-muted" style={{ fontSize: 13, marginBottom: 8 }}>Your embed code:</p>
              <code className="embed-code" style={{ display: 'block', fontSize: 12, wordBreak: 'break-all', marginBottom: 10 }}>
                {buildEmbedCode(id!, {
                  format: embed.widget_format,
                  theme: embed.widget_theme,
                  position: embed.widget_position,
                  noBranding: embed.no_branding,
                })}
              </code>
              <button className="btn btn-primary" style={{ fontSize: 13, padding: '8px 16px' }} onClick={() => {
                const code = buildEmbedCode(id!, { format: embed.widget_format, theme: embed.widget_theme, position: embed.widget_position, noBranding: embed.no_branding })
                navigator.clipboard.writeText(code).then(() => toast('Copied!', 'success'))
              }}>Copy Code</button>
            </div>
          </GlassCard>
        ))
      )}

      <button className="btn btn-outline" onClick={() => navigate(`/dashboard/${id}`)} style={{ marginTop: 8 }}>
        Back to Dashboard
      </button>
    </section>
  )
}
