import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, type DirectoryEntry } from '../api'
import Badge from '../components/Badge'
import AnimatedSection from '../components/AnimatedSection'
import { SkeletonGrid } from '../components/Skeleton'

function trustLabel(score: number): string {
  if (score >= 0.8) return 'High Trust'
  if (score >= 0.5) return 'Trusting'
  return 'New'
}

function trustVariant(score: number): 'green' | 'yellow' | 'gray' {
  if (score >= 0.8) return 'green'
  if (score >= 0.5) return 'yellow'
  return 'gray'
}

export default function Directory() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [entries, setEntries] = useState<DirectoryEntry[]>([])
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const page = Number(searchParams.get('page')) || 1
  const category = searchParams.get('category') || ''
  const limit = 12

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.directory.list({ page, limit, category: category || undefined }),
      api.categories.list(),
    ]).then(([dir, cats]) => {
      setEntries(dir.data)
      setTotal(dir.pagination.total)
      setCategories(cats.map((c) => c.slug))
    }).finally(() => setLoading(false))
  }, [page, category])

  function setCategory(cat: string) {
    const params = new URLSearchParams()
    if (cat) params.set('category', cat)
    params.set('page', '1')
    setSearchParams(params)
  }

  function setPage(p: number) {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(p))
    setSearchParams(params)
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <>
      <section className="page-header">
        <h1>Startup Directory</h1>
        <p className="lead">Discover indie startups in the LaunchRelay network.</p>
      </section>

      <div className="directory-filters">
        <button
          className={`filter-btn ${!category ? 'active' : ''}`}
          onClick={() => setCategory('')}
        >All</button>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${category === cat ? 'active' : ''}`}
            onClick={() => setCategory(cat)}
          >{cat}</button>
        ))}
      </div>

      {loading ? (
        <SkeletonGrid count={6} />
      ) : entries.length === 0 ? (
        <div className="empty">
          <h3>No startups found</h3>
          <p>{category ? `No startups in "${category}" yet.` : 'The network is growing. Check back soon.'}</p>
        </div>
      ) : (
        <>
          <AnimatedSection>
            <div className="directory-grid">
              {entries.map((e) => (
                <Link to={`/directory/${e.slug}`} key={e.slug} className="dir-card">
                  <div className="dir-card-avatar">{e.name.charAt(0).toUpperCase()}</div>
                  <div className="dir-card-info">
                    <h3>{e.name}</h3>
                    <p>{e.one_line_pitch}</p>
                    <div className="dir-card-tags">
                      {e.categories.map((c) => (
                        <span key={c} className="badge badge-blue">{c}</span>
                      ))}
                      <Badge variant={trustVariant(e.trust_score)}>{trustLabel(e.trust_score)}</Badge>
                      {e.verified_traffic && <Badge variant="blue">✓ Verified Traffic</Badge>}
                      {e.boost_level > 0 && <Badge variant="yellow">★ Featured</Badge>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </AnimatedSection>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >Previous</button>
              <span className="page-info">Page {page} of {totalPages}</span>
              <button
                className="btn btn-outline"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >Next</button>
            </div>
          )}
        </>
      )}
    </>
  )
}
