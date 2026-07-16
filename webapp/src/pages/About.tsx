import { Link } from 'react-router-dom'

export default function About() {
  return (
    <>
      <section className="page-header">
        <h1>About LaunchRelay</h1>
        <p className="lead">Free, reciprocal traffic for indie founders &mdash; built to stay fair at scale.</p>
      </section>

      <section className="section">
        <h2>The Problem</h2>
        <p>Early-stage founders have almost no cheap, low-effort way to get their first real visitors. Paid ads require budget most side projects don&apos;t have. SEO takes months. Cold outreach doesn&apos;t scale. Community launches give one-time spikes, not sustained flow.</p>
        <p>There&apos;s a gap between &ldquo;zero visitors&rdquo; and &ldquo;enough traffic to validate a product&rdquo; — and nothing fills it cheaply.</p>
      </section>

      <section className="section">
        <h2>How LaunchRelay Is Different</h2>
        <p>Classic traffic exchanges failed because of quality collapse: irrelevant matches, bot clicks, and members who quietly removed their embeds. LaunchRelay was built from day one to avoid that fate:</p>
        <div className="comparison-grid">
          <div className="comparison-card good">
            <h3>Relevance</h3>
            <p>Category-aware matching ensures your widget shows startups in related spaces, not random sites.</p>
          </div>
          <div className="comparison-card good">
            <h3>Fairness</h3>
            <p>Traffic-weighted reciprocity means members who send more real traffic earn proportionally more back. Not a flat 1:1 count.</p>
          </div>
          <div className="comparison-card good">
            <h3>Trust</h3>
            <p>Automated re-crawling detects removed embeds, grace-periods honest mistakes, and de-lists members who stop participating.</p>
          </div>
        </div>
      </section>

      <section id="trust" className="section">
        <h2>Trust &amp; Safety</h2>
        <p>We take quality seriously. Every member benefits from:</p>
        <ul>
          <li><strong>Daily re-crawling</strong> &mdash; we check that your embed is still active. Accidental removal triggers a grace period, not immediate de-listing.</li>
          <li><strong>Rate limiting</strong> &mdash; anti-fraud protections on every endpoint prevent abuse.</li>
          <li><strong>Viewport verification</strong> &mdash; impressions only count after 1 second of continuous visibility. No hidden iframe tricks.</li>
          <li><strong>Trust scoring</strong> &mdash; domain age, re-crawl history, and manual review combine into a visible trust score.</li>
        </ul>
      </section>

      <section id="faq" className="section">
        <h2>FAQ</h2>
        <div className="faq-list">
          <div className="faq-item">
            <h3>Is it really free?</h3>
            <p>Yes. The core reciprocal exchange is free forever. We may offer optional paid features later (priority placement, deeper analytics), but the basic loop stays free.</p>
          </div>
          <div className="faq-item">
            <h3>How is this different from an ad network?</h3>
            <p>Ad networks charge you to show ads. LaunchRelay is reciprocal &mdash; you show another founder&apos;s startup, and yours gets shown in return. No money changes hands.</p>
          </div>
          <div className="faq-item">
            <h3>What happens if I remove the embed?</h3>
            <p>Our automated re-crawler checks daily. If your embed disappears, you enter a 7-day grace period. If it&apos;s still missing after that, your startup is de-listed from the network.</p>
          </div>
          <div className="faq-item">
            <h3>Does the widget slow down my site?</h3>
            <p>No. The widget is under 3KB gzipped, loads async, uses Shadow DOM for style isolation, and reserves its slot to prevent layout shift. Your Core Web Vitals stay green.</p>
          </div>
          <div className="faq-item">
            <h3>What platforms does the embed work on?</h3>
            <p>Everywhere. Plain HTML, Next.js, Webflow, WordPress, Shopify &mdash; any platform that lets you paste a script tag.</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to join?</h2>
        <p>30 seconds to apply. Free forever.</p>
        <Link to="/apply" className="btn btn-primary">Apply Now &rarr;</Link>
      </section>
    </>
  )
}
