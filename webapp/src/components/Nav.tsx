import { Link } from 'react-router-dom'

interface NavProps {
  user: { email: string; startupId?: string } | null
}

export default function Nav({ user }: NavProps) {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">Launch<span>Relay</span></Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/directory">Directory</Link>
          <Link to="/about">About</Link>
          {user?.startupId ? (
            <Link to={`/dashboard/${user.startupId}`}>Dashboard</Link>
          ) : null}
          {user ? (
            <span className="nav-user">{user.email}</span>
          ) : (
            <>
              <Link to="/login" className="nav-link-secondary">Log in</Link>
              <Link to="/apply" className="nav-cta">Join Free</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
