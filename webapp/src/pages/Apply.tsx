import { useState, useEffect } from 'react'
import { useAuth } from '../auth'
import { api, type Category } from '../api'

export default function Apply() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState({ name: '', url: '', one_line_pitch: '', email: '', categories: [] as string[] })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ embed_code: string; id: string } | null>(null)

  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    if (user?.email && !form.email) {
      setForm((f) => ({ ...f, email: user.email! }))
    }
  }, [user, form.email])

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
    setError('')
    if (form.categories.length === 0) {
      setError('Select at least one category')
      return
    }
    setLoading(true)
    try {
      const res = await api.startups.create(form)
      setResult({ embed_code: res.embed_code, id: res.id })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit application')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <section className="page-centered">
        <div className="result-card">
          <div className="result-icon">&#x2705;</div>
          <h2>Application submitted!</h2>
          <p>Your startup is <strong>pending review</strong>. You&apos;ll be notified once it&apos;s approved.</p>
          <div className="embed-preview">
            <p className="text-muted">Your embed code:</p>
            <code className="embed-code">{result.embed_code}</code>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="page-centered">
      <div className="apply-card">
        <h2>Apply to LaunchRelay</h2>
        <p>Join the network and start getting real visitors.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Startup name</label>
            <input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label htmlFor="url">Website URL</label>
            <input id="url" type="url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://example.com" required />
          </div>
          <div className="form-group">
            <label htmlFor="pitch">One-line pitch</label>
            <input id="pitch" value={form.one_line_pitch} onChange={(e) => setForm((f) => ({ ...f, one_line_pitch: e.target.value }))} maxLength={280} placeholder="What does your startup do?" required />
            <span className="char-count">{form.one_line_pitch.length}/280</span>
          </div>
          <div className="form-group">
            <label>Categories (select at least one)</label>
            <div className="category-grid">
              {categories.map((cat) => (
                <label key={cat.id} className={`category-chip ${form.categories.includes(cat.name) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.categories.includes(cat.name)}
                    onChange={() => toggleCategory(cat.name)}
                    hidden
                  />
                  {cat.name}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="btn btn-primary btn-full btn-large" disabled={loading}>
            {loading ? 'Submitting...' : 'Apply Now'}
          </button>
        </form>
      </div>
    </section>
  )
}
