import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { api } from '../api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, login } = useAuth()

  const token = searchParams.get('token')

  useEffect(() => {
    if (user) {
      navigate(user.startupId ? `/dashboard/${user.startupId}` : '/', { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    if (token) {
      login(token)
        .then(() => navigate('/', { replace: true }))
        .catch(() => setError('Invalid or expired link. Please request a new one.'))
    }
  }, [token, login, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.auth.sendMagicLink(email)
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send login link')
    } finally {
      setLoading(false)
    }
  }

  if (token) {
    return (
      <section className="page-centered">
        <div className="login-card">
          <h2>Verifying your link...</h2>
          {error && <p className="error-message">{error}</p>}
        </div>
      </section>
    )
  }

  if (sent) {
    return (
      <section className="page-centered">
        <div className="login-card">
          <div className="login-icon">&#x2709;</div>
          <h2>Check your email</h2>
          <p>We sent a magic link to <strong>{email}</strong>. Click it to log in.</p>
          <p className="text-muted">No password needed. The link expires in 15 minutes.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="page-centered">
      <div className="login-card">
        <h2>Log in to LaunchRelay</h2>
        <p>Enter your email and we&apos;ll send you a magic link.</p>
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
      </div>
    </section>
  )
}
