import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type Category } from '../api'
import GlassCard from '../components/GlassCard'
import { useToast } from '../components/ToastContext'

interface Exclusion {
  id: string
  excluded_startup_id?: string
  excluded_category_id?: string
}

export default function Exclusions() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [exclusions, setExclusions] = useState<Exclusion[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      api.exclusions.list(id),
      api.categories.list(),
    ]).then(([ex, cats]) => {
      setExclusions(ex || [])
      setCategories(cats || [])
    }).catch(() => toast('Failed to load', 'error'))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function addCategoryExclusion() {
    if (!id || !selectedCategory) return
    try {
      const res = await api.exclusions.create(id, { excluded_category_id: selectedCategory })
      setExclusions((prev) => [...prev, { id: res.id, excluded_category_id: selectedCategory }])
      setSelectedCategory('')
      toast('Category excluded', 'success')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to add exclusion', 'error')
    }
  }

  async function removeExclusion(exclusionId: string) {
    if (!id) return
    try {
      await api.exclusions.remove(id, exclusionId)
      setExclusions((prev) => prev.filter((e) => e.id !== exclusionId))
      toast('Exclusion removed', 'success')
    } catch {
      toast('Failed to remove', 'error')
    }
  }

  const excludedCatIds = new Set(exclusions.filter((e) => e.excluded_category_id).map((e) => e.excluded_category_id))

  if (loading) {
    return <section className="page-centered"><div className="spinner" /></section>
  }

  return (
    <section className="page-centered" style={{ display: 'block', maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 32 }}>Competitor Exclusions</h2>

      <GlassCard glow style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Block a Category</h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="cat-select">Category</label>
            <select
              id="cat-select"
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Select a category...</option>
              {categories
                .filter((c) => !excludedCatIds.has(c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </div>
          <button className="btn btn-primary" disabled={!selectedCategory} onClick={addCategoryExclusion}>
            Block
          </button>
        </div>
      </GlassCard>

      {exclusions.length === 0 ? (
        <GlassCard>
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px 0' }}>
            No exclusions yet. Block categories to avoid matching with competitors.
          </p>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {exclusions.map((ex) => {
            const cat = ex.excluded_category_id ? categories.find((c) => c.id === ex.excluded_category_id) : null
            return (
              <GlassCard key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {cat ? (
                    <span><strong>Category:</strong> {cat.name}</span>
                  ) : ex.excluded_startup_id ? (
                    <span><strong>Startup:</strong> {ex.excluded_startup_id}</span>
                  ) : (
                    <span className="text-muted">Unknown exclusion</span>
                  )}
                </div>
                <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 13, color: 'var(--rose-500)' }} onClick={() => removeExclusion(ex.id)}>
                  Remove
                </button>
              </GlassCard>
            )
          })}
        </div>
      )}

      <button className="btn btn-outline" onClick={() => navigate(`/dashboard/${id}`)} style={{ marginTop: 20 }}>
        Back to Dashboard
      </button>
    </section>
  )
}
