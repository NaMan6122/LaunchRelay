import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Nav() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 20) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = useCallback(async () => {
    await logout()
    navigate('/')
  }, [logout, navigate])

  function closeMenu() { setMenuOpen(false); setUserMenuOpen(false) }

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
            <div className="nav-user-menu" ref={userMenuRef}>
              <button className="nav-user-trigger" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                <span className="nav-user-avatar">{user.email.charAt(0).toUpperCase()}</span>
                <span className="nav-user-email">{user.email}</span>
                <span className="nav-user-arrow">{userMenuOpen ? '▲' : '▼'}</span>
              </button>
              {userMenuOpen && (
                <div className="nav-user-dropdown">
                  {user.startupId && (
                    <>
                      <Link to={`/dashboard/${user.startupId}`} className="nav-dropdown-item" onClick={closeMenu}>Dashboard</Link>
                      <Link to={`/dashboard/${user.startupId}/settings`} className="nav-dropdown-item" onClick={closeMenu}>Settings</Link>
                      <Link to={`/dashboard/${user.startupId}/widget`} className="nav-dropdown-item" onClick={closeMenu}>Widget</Link>
                      <Link to={`/dashboard/${user.startupId}/exclusions`} className="nav-dropdown-item" onClick={closeMenu}>Exclusions</Link>
                      <div className="nav-dropdown-divider" />
                    </>
                  )}
                  <button className="nav-dropdown-item nav-dropdown-danger" onClick={() => { closeMenu(); handleLogout() }}>Log out</button>
                </div>
              )}
            </div>
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
