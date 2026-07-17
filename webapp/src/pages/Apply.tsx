import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { api, type Category } from '../api'
import GlassCard from '../components/GlassCard'
import { useToast } from '../components/ToastContext'

export default function Apply() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', one_line_pitch: '', email: '', categories: [] as string[] })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ embed_code: string; id: string } | null>(null)
  const emailPrefilled = useRef(false)

  function loadCategories() {
    setCategoriesLoading(true)
    setCategoriesError(false)
    api.categories.list()
      .then(setCategories)
      .catch(() => {
        setCategoriesError(true)
        toast('Failed to load categories', 'error')
      })
      .finally(() => setCategoriesLoading(false))
  }

  useEffect(() => {
    loadCategories()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user?.email && !emailPrefilled.current) {
      emailPrefilled.current = true
      setForm((f) => ({ ...f, email: user.email }))
    }
  }, [user])

  function toggleCategory(name: string) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(name)
        ? f.categories.filter((c) => c !== name)
        : [...f.categories, name],
    }))
    if (fieldErrors.categories) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n.categories; return n })
    }
  }

  function clearFieldError(field: string) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n })
    }
  }

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = 'Startup name is required'
    if (!form.url.trim()) errors.url = 'Website URL is required'
    else if (!/^https?:\/\/.+/.test(form.url)) errors.url = 'Must be a valid http or https URL'
    if (!form.one_line_pitch.trim()) errors.pitch = 'One-line pitch is required'
    if (form.categories.length === 0) errors.categories = 'Select at least one category'
    if (!form.email.trim()) errors.email = 'Email is required'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = await api.startups.create(form)
      setResult({ embed_code: res.embed_code, id: res.id })
      toast('Application submitted successfully!', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit application'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function copyEmbed() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.embed_code)
      toast('Embed code copied!', 'success')
    } catch {
      toast('Failed to copy', 'error')
    }
  }

  const pitchLen = form.one_line_pitch.length
  const pitchWarning = pitchLen >= 240 ? (pitchLen >= 280 ? 'max' : 'warn') : ''

  if (result) {
    return (
      <section className="page-centered">
        <GlassCard glow>
          <div className="result-icon">&#x2705;</div>
          <h2 style={{ marginBottom: 6 }}>Application submitted!</h2>
          <p className="text-muted" style={{ marginBottom: 28 }}>Your startup is <strong>now live</strong> in the directory. Start embedding the widget to get traffic.</p>
          <div className="embed-preview">
            <p className="text-muted" style={{ marginBottom: 8 }}>Your embed code:</p>
            <code className="embed-code" style={{ marginBottom: 12 }}>{result.embed_code}</code>
            <button className="btn btn-primary btn-full" onClick={copyEmbed}>Copy Embed Code</button>
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link to={user?.startupId ? `/dashboard/${user.startupId}` : '/'} className="btn btn-primary btn-large">
              {user?.startupId ? 'Go to Dashboard' : 'Back to Home'}
            </Link>
          </div>
        </GlassCard>
      </section>
    )
  }

  return (
    <section className="page-centered">
      <GlassCard glow>
        <h2 style={{ marginBottom: 6 }}>Apply to LaunchRelay</h2>
        <p className="text-muted" style={{ marginBottom: 28 }}>Join the network and start getting real visitors.</p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="name">Startup name</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); clearFieldError('name') }}
              className={fieldErrors.name ? 'input-error' : ''}
              required
            />
            {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="url">Website URL</label>
            <input
              id="url"
              type="url"
              value={form.url}
              onChange={(e) => { setForm((f) => ({ ...f, url: e.target.value })); clearFieldError('url') }}
              className={fieldErrors.url ? 'input-error' : ''}
              placeholder="https://example.com"
              required
            />
            {fieldErrors.url && <span className="field-error">{fieldErrors.url}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="pitch">One-line pitch</label>
            <input
              id="pitch"
              value={form.one_line_pitch}
              onChange={(e) => { setForm((f) => ({ ...f, one_line_pitch: e.target.value })); clearFieldError('pitch') }}
              className={fieldErrors.pitch ? 'input-error' : ''}
              maxLength={280}
              placeholder="What does your startup do?"
              required
            />
            <span className={`char-count ${pitchWarning === 'warn' ? 'char-warn' : pitchWarning === 'max' ? 'char-max' : ''}`}>
              {pitchLen}/280
            </span>
            {fieldErrors.pitch && <span className="field-error">{fieldErrors.pitch}</span>}
          </div>
          <div className="form-group">
            <label>
              Categories <span className="text-muted" style={{ fontWeight: 400 }}>(select at least one)</span>
            </label>
            {categoriesLoading ? (
              <div className="category-grid">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton" style={{ width: 80, height: 34, borderRadius: 100 }} />
                ))}
              </div>
            ) : categoriesError ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <span className="field-error">Failed to load categories.</span>
                <button type="button" className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 13 }} onClick={loadCategories}>Retry</button>
              </div>
            ) : (
              <div className="category-grid" role="group" aria-label="Categories">
                {categories.map((cat) => {
                  const selected = form.categories.includes(cat.name)
                  const chipId = `cat-${cat.id}`
                  return (
                    <label
                      key={cat.id}
                      htmlFor={chipId}
                      className={`category-chip ${selected ? 'selected' : ''}`}
                    >
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
            )}
            {fieldErrors.categories && <span className="field-error">{fieldErrors.categories}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); clearFieldError('email') }}
              className={fieldErrors.email ? 'input-error' : ''}
              required
            />
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="btn btn-primary btn-full btn-large" disabled={submitting}>
            {submitting && <span className="btn-spinner" />}
            {submitting ? 'Submitting...' : 'Apply Now'}
          </button>
        </form>
      </GlassCard>
    </section>
  )
}
