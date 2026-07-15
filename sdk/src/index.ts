(function () {
  'use strict';

  type WidgetFormat = 'bar' | 'badge' | 'card';
  type WidgetPosition = 'top' | 'bottom';

  interface Config {
    startupId: string;
    theme: 'light' | 'dark';
    format: WidgetFormat;
    position: WidgetPosition;
    noBranding: boolean;
    token: string;
  }

  interface MatchData {
    match: {
      id: string;
      name: string;
      one_line_pitch: string;
      url: string;
      logo_url: string;
      category: string[];
    };
    impression_id: string;
  }

  interface BeaconEvent {
    type: 'impression' | 'click';
    impression_id: string;
    timestamp: number;
  }

  interface BeaconBatch {
    startup_id: string;
    events: BeaconEvent[];
  }

  // ── Config parsing ────────────────────────────────────────────────

  function parseConfig(): Config | null {
    const script =
      document.currentScript ||
      document.querySelector<HTMLScriptElement>(
        'script[data-startup-id]'
      );
    if (!script) return null;

    const startupId = script.getAttribute('data-startup-id');
    if (!startupId) return null;

    return {
      startupId,
      theme: (script.getAttribute('data-theme') as 'light' | 'dark') || 'light',
      format: (script.getAttribute('data-format') as WidgetFormat) || 'bar',
      position: (script.getAttribute('data-position') as WidgetPosition) || 'bottom',
      noBranding: script.hasAttribute('data-no-branding'),
      token: script.getAttribute('data-token') || '',
    };
  }

  // ── Container creation (CLS prevention) ───────────────────────────

  function createContainer(config: Config): HTMLDivElement {
    const el = document.createElement('div');
    el.id = 'lr-slot';
    el.setAttribute('aria-live', 'polite');

    const baseStyles: Record<string, string> = {
      width: '100%',
      overflow: 'hidden',
      'box-sizing': 'border-box',
    };

    if (config.format === 'bar') {
      if (config.position === 'bottom') {
        baseStyles['position'] = 'fixed';
        baseStyles['bottom'] = '0';
        baseStyles['left'] = '0';
        baseStyles['right'] = '0';
        baseStyles['z-index'] = '999999';
      } else {
        baseStyles['position'] = 'fixed';
        baseStyles['top'] = '0';
        baseStyles['left'] = '0';
        baseStyles['right'] = '0';
        baseStyles['z-index'] = '999999';
      }
      el.style.minHeight = '48px';
    }

    Object.assign(el.style, baseStyles);
    return el;
  }

  // ── Match fetching (mock for prototype) ──────────────────────────

  async function fetchMatch(config: Config): Promise<MatchData> {
    const mock: MatchData = {
      match: {
        id: 'mock-startup-001',
        name: 'ShipFast',
        one_line_pitch: 'Deploy your SaaS in days, not months',
        url: 'https://shipfast.example.com',
        logo_url: '',
        category: ['devtools'],
      },
      impression_id: 'imp-mock-' + Date.now(),
    };

    return new Promise((resolve) => {
      setTimeout(() => resolve(mock), 200);
    });
  }

  // ── Shadow DOM rendering ─────────────────────────────────────────

  function renderWidget(
    host: HTMLElement,
    data: MatchData,
    config: Config
  ): void {
    const shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = getWidgetStyles(config);
    shadow.appendChild(style);

    const root = document.createElement('div');
    root.className = `lr-widget lr-theme-${config.theme} lr-format-${config.format}`;
    root.innerHTML = buildWidgetHTML(data, config);
    shadow.appendChild(root);
  }

  function getWidgetStyles(config: Config): string {
    const isLight = config.theme === 'light';
    return `
      :host {
        all: initial;
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.4;
      }
      .lr-widget {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        background: ${isLight ? '#ffffff' : '#1a1a1a'};
        color: ${isLight ? '#333333' : '#e0e0e0'};
        border-top: 1px solid ${isLight ? '#e5e5e5' : '#333333'};
        box-shadow: 0 -2px 8px rgba(0,0,0,${isLight ? '0.06' : '0.3'});
        cursor: pointer;
        user-select: none;
      }
      .lr-format-badge .lr-widget {
        border-radius: 8px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.12);
      }
      .lr-content {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        min-width: 0;
      }
      .lr-logo {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        background: ${isLight ? '#f0f0f0' : '#2a2a2a'};
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 12px;
        font-weight: 700;
        color: ${isLight ? '#999' : '#666'};
      }
      .lr-info {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .lr-name {
        font-weight: 600;
        font-size: 13px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .lr-pitch {
        font-size: 12px;
        opacity: 0.7;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .lr-cta {
        flex-shrink: 0;
        padding: 4px 12px;
        border-radius: 4px;
        background: ${isLight ? '#0066ff' : '#4d94ff'};
        color: #ffffff;
        font-size: 12px;
        font-weight: 600;
        text-decoration: none;
        border: none;
        cursor: pointer;
        transition: opacity 0.15s;
      }
      .lr-cta:hover {
        opacity: 0.85;
      }
      .lr-branding {
        font-size: 10px;
        opacity: 0.4;
        margin-left: 8px;
        white-space: nowrap;
      }
    `;
  }

  function buildWidgetHTML(data: MatchData, config: Config): string {
    const m = data.match;
    const initial = m.name.charAt(0).toUpperCase();
    return `
      <div class="lr-content">
        <div class="lr-logo">${initial}</div>
        <div class="lr-info">
          <span class="lr-name">${escapeHTML(m.name)}</span>
          <span class="lr-pitch">${escapeHTML(m.one_line_pitch)}</span>
        </div>
      </div>
      <a class="lr-cta" href="${escapeHTML(m.url)}" target="_blank" rel="noopener">Learn More →</a>
      ${config.noBranding ? '' : '<span class="lr-branding">LaunchRelay</span>'}
    `;
  }

  function escapeHTML(s: string): string {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(s));
    return div.innerHTML;
  }

  // ── Viewport tracking (IntersectionObserver) ─────────────────────

  function startTracking(
    container: HTMLElement,
    impressionId: string,
    config: Config,
    matchData: MatchData,
    beaconQueue: BeaconEvent[],
    flushSoon: () => void
  ): void {
    let visibilityTimer: ReturnType<typeof setTimeout> | null = null;
    let impressionRecorded = false;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!visibilityTimer && !impressionRecorded) {
              visibilityTimer = setTimeout(() => {
                queueEvent('impression', impressionId, beaconQueue, config, flushSoon);
                impressionRecorded = true;
                visibilityTimer = null;
              }, 1000);
            }
          } else {
            if (visibilityTimer) {
              clearTimeout(visibilityTimer);
              visibilityTimer = null;
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(container);

    // CTA click tracking
    const shadow = container.shadowRoot;
    if (shadow) {
      const cta = shadow.querySelector('.lr-cta');
      if (cta) {
        cta.addEventListener('click', function (e: Event) {
          queueEvent('click', impressionId, beaconQueue, config, flushSoon);
          const href = (this as HTMLAnchorElement).getAttribute('href');
          if (href && !e.defaultPrevented) {
            e.preventDefault();
            setTimeout(() => {
              window.open(href, '_blank');
            }, 100);
          }
        });
      }
    }
  }

  function queueEvent(
    type: 'impression' | 'click',
    impressionId: string,
    queue: BeaconEvent[],
    config: Config,
    flushSoon: () => void
  ): void {
    const wasEmpty = queue.length === 0;
    queue.push({
      type,
      impression_id: impressionId,
      timestamp: Date.now(),
    });
    if (wasEmpty) {
      flushSoon();
    }
  }

  // ── Beacon flushing ──────────────────────────────────────────────

  function flushBeacons(queue: BeaconEvent[], config: Config): void {
    if (queue.length === 0) return;

    const batch: BeaconBatch = {
      startup_id: config.startupId,
      events: queue.splice(0, queue.length),
    };

    try {
      const blob = new Blob([JSON.stringify(batch)], {
        type: 'application/json',
      });
      navigator.sendBeacon('/v1/impressions', blob);
    } catch {
      // Silently fail — analytics loss is acceptable for the prototype
    }
  }

  function startBeaconFlusher(
    queue: BeaconEvent[],
    config: Config
  ): () => void {
    let flushSoonTimer: ReturnType<typeof setTimeout> | null = null;

    function flushSoon() {
      if (flushSoonTimer) clearTimeout(flushSoonTimer);
      flushSoonTimer = setTimeout(() => {
        flushBeacons(queue, config);
        flushSoonTimer = null;
      }, 2000);
    }

    setInterval(() => flushBeacons(queue, config), 30000);
    window.addEventListener('beforeunload', () => {
      if (flushSoonTimer) clearTimeout(flushSoonTimer);
      flushBeacons(queue, config);
    });

    return flushSoon;
  }

  // ── API URL (CDN resolution) ─────────────────────────────────────

  function getApiBase(): string {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src;
      if (src && src.includes('widget.js')) {
        try {
          const url = new URL(src);
          return url.origin;
        } catch {
          continue;
        }
      }
    }
    return 'https://api.launchrelay.com';
  }

  // ── Init ─────────────────────────────────────────────────────────

  function init(): void {
    const config = parseConfig();
    if (!config) return;

    const container = createContainer(config);
    document.body.appendChild(container);

    const beaconQueue: BeaconEvent[] = [];
    const flushSoon = startBeaconFlusher(beaconQueue, config);

    fetchMatch(config)
      .then((data) => {
        renderWidget(container, data, config);
        container.setAttribute('data-lr-ready', 'true');
        startTracking(container, data.impression_id, config, data, beaconQueue, flushSoon);
      })
      .catch(() => {
        container.style.display = 'none';
      });
  }

  // ── Entry ────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
