import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-brand">
            <strong className="footer-logo">Launch<span>Relay</span></strong>
            <br />
            Free reciprocal traffic for indie founders. Embed a widget, get real visitors. Zero ad spend, zero content grind.
          </div>
        </div>
        <div>
          <h4>Product</h4>
          <Link to="/">Home</Link>
          <Link to="/directory">Directory</Link>
          <Link to="/apply">Join Free</Link>
        </div>
        <div>
          <h4>Resources</h4>
          <Link to="/about">How It Works</Link>
          <Link to="/about#trust">Trust &amp; Safety</Link>
          <Link to="/about#faq">FAQ</Link>
        </div>
        <div>
          <h4>Dashboard</h4>
          <Link to="/apply">Apply</Link>
          <Link to="/directory">Browse Startups</Link>
        </div>
      </div>
      <div className="footer-bottom">LaunchRelay &mdash; reciprocal traffic for indie founders. Free forever.</div>
    </footer>
  )
}
