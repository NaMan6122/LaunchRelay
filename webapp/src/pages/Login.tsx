import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { api } from '../api'
import GlassCard from '../components/GlassCard'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [debugUrl, setDebugUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, login } = useAuth()

  const token = searchParams.get('token')
  const redirectTo = searchParams.get('redirect') || '/'

  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (user) {
      navigate(user.startupId ? `/dashboard/${user.startupId}` : redirectTo, { replace: true })
    }
  }, [user, navigate, redirectTo])

  useEffect(() => {
    if (token) {
      setVerifying(true)
      login(token)
        .then(() => navigate(redirectTo, { replace: true }))
        .catch(() => {
          setError('Invalid or expired link. Please request a new one.')
          setVerifying(false)
        })
    }
  }, [token, login, navigate, redirectTo])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.auth.sendMagicLink(email)
      setSent(true)
      if (res.debug) setDebugUrl(res.debug)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send login link')
    } finally {
      setLoading(false)
    }
  }

  if (token) {
    return (
      <section className="page-centered">
        <GlassCard>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div className="spinner" />
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--navy)' }}>
              {verifying ? 'Verifying your link...' : ''}
            </h2>
          </div>
          {error && <p className="error-message">{error}</p>}
        </GlassCard>
      </section>
    )
  }

  if (sent) {
    return (
      <section className="page-centered">
        <GlassCard>
          <div className="login-icon">&#x2709;</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Check your email</h2>
          <p className="text-muted" style={{ marginBottom: 12 }}>We sent a magic link to <strong>{email}</strong>. Click it to log in.</p>
          <p className="text-muted" style={{ marginBottom: debugUrl ? 20 : 0 }}>No password needed. The link expires in 15 minutes.</p>
          {debugUrl && (
            <div className="debug-link">
              <span className="debug-label">Dev mode — click to log in:</span>
              <a href={debugUrl} className="debug-magic-link">{debugUrl}</a>
            </div>
          )}
        </GlassCard>
      </section>
    )
  }

  return (
    <section className="page-centered">
      <GlassCard>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, color: 'var(--navy)' }}>Log in to LaunchRelay</h2>
        <p style={{ color: 'var(--slate-500)', marginBottom: 28 }}>Enter your email and we&apos;ll send you a magic link.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="founder@startup.com"
              required
              autoFocus
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>
        <p className="text-muted login-footer">
          Don&apos;t have an account? <a href="/apply">Apply here</a>
        </p>
      </GlassCard>
    </section>
  )
}
