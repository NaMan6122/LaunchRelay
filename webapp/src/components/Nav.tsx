import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

interface NavProps {
  user: { email: string; startupId?: string } | null
}

export default function Nav({ user }: NavProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 20) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function closeMenu() { setMenuOpen(false) }

  return (
    <nav className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
      <div className="nav-inner">
        <Link to="/" className="nav-logo" onClick={closeMenu}>Launch<span>Relay</span></Link>
        <button className="nav-mobile-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          {menuOpen ? '✕' : '☰'}
        </button>
        <div className={`nav-links ${menuOpen ? 'nav-open' : ''}`}>
          <Link to="/" onClick={closeMenu}>Home</Link>
          <Link to="/directory" onClick={closeMenu}>Directory</Link>
          <Link to="/about" onClick={closeMenu}>About</Link>
          {user?.startupId ? (
            <Link to={`/dashboard/${user.startupId}`} onClick={closeMenu}>Dashboard</Link>
          ) : null}
          {user ? (
            <span className="nav-user">{user.email}</span>
          ) : (
            <>
              <Link to="/login" className="nav-link-secondary" onClick={closeMenu}>Log in</Link>
              <Link to="/apply" className="nav-cta" onClick={closeMenu}>Join Free</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
