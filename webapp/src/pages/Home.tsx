import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Free for indie founders
        </div>
        <h1>Get real visitors<br />by showing <span className="gradient-text">other founders</span></h1>
        <p>Embed a tiny widget on your site. Another founder&apos;s startup appears there, and yours appears on theirs. Zero ad spend, zero content grind &mdash; just reciprocal traffic.</p>
        <div className="hero-actions">
          <Link to="/apply" className="btn btn-primary btn-large">Join the Network</Link>
          <Link to="/directory" className="btn btn-outline btn-large">Browse Startups</Link>
        </div>
        <div className="code-block">
          <span className="tag">&lt;script</span> <span className="attr">src</span>=<span className="val">&quot;https://cdn.launchrelay.com/widget.js&quot;</span> <span className="attr">data-startup-id</span>=<span className="val">&quot;YOUR_ID&quot;</span> <span className="attr">async</span><span className="tag">&gt;&lt;/script&gt;</span>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><div className="num">&lt;3KB</div><div className="lbl">Widget size</div></div>
          <div className="hero-stat"><div className="num">1 line</div><div className="lbl">Integration</div></div>
          <div className="hero-stat"><div className="num">0</div><div className="lbl">Cost forever</div></div>
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <h2>How It Works</h2>
          <p>Four steps to start getting real visitors from other founders&apos; audiences.</p>
        </div>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <h3>Apply</h3>
            <p>Submit your startup URL, one-line pitch, and category tags. Automated checks verify your site.</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3>Embed</h3>
            <p>Paste a one-line script tag into your site. Works everywhere &mdash; static HTML, Next.js, Webflow, WordPress.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3>Earn</h3>
            <p>Your startup gets shown on other members&apos; sites. Impressions only count when the widget is actually visible.</p>
          </div>
          <div className="step">
            <div className="step-num">4</div>
            <h3>Send</h3>
            <p>Your visitors see other startups in your widget. The more traffic you send, the more you earn back.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <h2>Three Widget Formats</h2>
          <p>Choose the format that fits your site. All support light and dark themes.</p>
        </div>
        <div className="widget-showcase">
          <div className="widget-demo">
            <div className="widget-demo-header">Bar &mdash; Fixed 48px strip</div>
            <div className="widget-demo-body">
              <p className="demo-placeholder-text">Your page content here...</p>
              <div className="demo-bar">
                <div className="bar-info">
                  <span className="bar-name">CoolStartup</span>
                  <span className="bar-pitch">Analytics for indie hackers</span>
                </div>
                <span className="bar-cta">Learn More</span>
              </div>
            </div>
          </div>
          <div className="widget-demo">
            <div className="widget-demo-header">Badge &mdash; Corner circle</div>
            <div className="widget-demo-body">
              <p className="demo-placeholder-text">Your page content here...</p>
              <div className="demo-badge-widget" title="CoolStartup — Analytics for indie hackers">LR</div>
            </div>
          </div>
          <div className="widget-demo">
            <div className="widget-demo-header">Card &mdash; Inline content block</div>
            <div className="widget-demo-body">
              <p className="demo-placeholder-text">Your page content here...</p>
              <div className="demo-card-widget">
                <div className="demo-card-avatar">CS</div>
                <div className="demo-card-info">
                  <div className="demo-card-name">CoolStartup</div>
                  <div className="demo-card-pitch">Analytics for indie hackers</div>
                </div>
                <span className="demo-card-cta">Visit</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <h2>Why Founders Choose LaunchRelay</h2>
          <p>Built to avoid the quality collapse that killed classic traffic exchanges.</p>
        </div>
        <div className="features-grid">
          <div className="feature">
            <div className="feature-icon feature-icon-blue">&#x1F3AF;</div>
            <h3>Category Matching</h3>
            <p>Your widget shows startups in related spaces, not random cross-niche pairings. Relevant traffic by default.</p>
          </div>
          <div className="feature">
            <div className="feature-icon feature-icon-green">&#x2696;</div>
            <h3>Fair Reciprocity</h3>
            <p>Traffic-weighted, not flat 1:1. Members who send more real visitors earn proportionally more back.</p>
          </div>
          <div className="feature">
            <div className="feature-icon feature-icon-yellow">&#x1F6E1;</div>
            <h3>Trust Scoring</h3>
            <p>Automated re-crawls detect removed embeds. Low-trust members get deprioritized or de-listed.</p>
          </div>
          <div className="feature">
            <div className="feature-icon feature-icon-purple">&#x1F4CA;</div>
            <h3>Real Analytics</h3>
            <p>Impressions, clicks, CTR, reciprocity balance &mdash; all in your dashboard. Viewport-verified, never inflated.</p>
          </div>
          <div className="feature">
            <div className="feature-icon feature-icon-pink">&#x26A1;</div>
            <h3>Zero Layout Shift</h3>
            <p>Shadow DOM isolation, async loading, reserved-height slots. Your Core Web Vitals stay green.</p>
          </div>
          <div className="feature">
            <div className="feature-icon feature-icon-sky">&#x1F310;</div>
            <h3>Public Directory</h3>
            <p>Every member gets an SEO-indexable profile page. Discovery beyond the widget, filterable by category.</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to get your first real visitors?</h2>
        <p>Join the network in 30 seconds. Free forever, no credit card, no catch.</p>
        <Link to="/apply" className="btn btn-primary">Apply Now &rarr;</Link>
      </section>
    </>
  )
}
