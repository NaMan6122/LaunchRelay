import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { api, type Category, type StartupResponse } from '../api'
import GlassCard from '../components/GlassCard'
import { useToast } from '../components/ToastContext'

export default function Settings() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [startup, setStartup] = useState<StartupResponse | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState({ name: '', url: '', one_line_pitch: '', categories: [] as string[] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id || !user) return
    Promise.all([
      api.startups.get(id),
      api.categories.list(),
    ]).then(([s, cats]) => {
      setStartup(s)
      setForm({ name: s.name, url: s.url, one_line_pitch: s.one_line_pitch, categories: s.categories || [] })
      setCategories(cats)
    }).catch(() => {
      toast('Failed to load startup', 'error')
    }).finally(() => setLoading(false))
  }, [id, user, toast])

  function toggleCategory(name: string) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(name)
        ? f.categories.filter((c) => c !== name)
        : [...f.categories, name],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    try {
      await api.startups.update(id, {
        name: form.name !== startup?.name ? form.name : undefined,
        url: form.url !== startup?.url ? form.url : undefined,
        one_line_pitch: form.one_line_pitch !== startup?.one_line_pitch ? form.one_line_pitch : undefined,
        categories: form.categories,
      })
      toast('Settings saved!', 'success')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="page-centered">
        <div className="spinner" />
      </section>
    )
  }

  if (!startup) {
    return (
      <section className="page-centered">
        <GlassCard>
          <h2>Startup not found</h2>
          <p className="text-muted" style={{ marginTop: 12 }}>This startup doesn't exist or you don't have access.</p>
        </GlassCard>
      </section>
    )
  }

  return (
    <section className="page-centered">
      <GlassCard glow>
        <h2 style={{ marginBottom: 6 }}>Settings</h2>
        <p className="text-muted" style={{ marginBottom: 28 }}>Edit your startup profile.</p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="name">Startup name</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="url">Website URL</label>
            <input
              id="url"
              type="url"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://example.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="pitch">One-line pitch</label>
            <input
              id="pitch"
              value={form.one_line_pitch}
              onChange={(e) => setForm((f) => ({ ...f, one_line_pitch: e.target.value }))}
              maxLength={280}
              required
            />
            <span className="char-count">{form.one_line_pitch.length}/280</span>
          </div>
          <div className="form-group">
            <label>Categories</label>
            <div className="category-grid" role="group" aria-label="Categories">
              {categories.map((cat) => {
                const selected = form.categories.includes(cat.name)
                const chipId = `settings-cat-${cat.id}`
                return (
                  <label key={cat.id} htmlFor={chipId} className={`category-chip ${selected ? 'selected' : ''}`}>
                    <input
                      id={chipId}
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleCategory(cat.name)}
                      className="category-chip-input"
                    />
                    {selected && <span className="category-chip-check">✓</span>}
                    {cat.name}
                  </label>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate(`/dashboard/${id}`)}>
              Cancel
            </button>
          </div>
        </form>
      </GlassCard>
    </section>
  )
}
