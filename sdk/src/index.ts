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
    shown_startup_id: string;
    timestamp: number;
  }

  interface BeaconBatch {
    viewer_startup_id: string;
    events: BeaconEvent[];
  }

  // ── Config parsing ────────────────────────────────────────────────

  function parseConfig(): Config | null {
    const script =
      document.currentScript ||
      (document.querySelector('script[data-startup-id]') as HTMLScriptElement | null);
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

  // ── Container creation ────────────────────────────────────────────

  function createContainer(config: Config): HTMLDivElement {
    const el = document.createElement('div');
    el.id = 'lr-slot';

    if (config.format === 'card') {
      el.style.cssText = 'width:100%;overflow:hidden;box-sizing:border-box;';
      return el;
    }

    const isBottom = config.position === 'bottom';
    const isBadge = config.format === 'badge';

    el.style.cssText = [
      'position:fixed',
      isBottom ? 'bottom:0' : 'top:0',
      'left:0',
      'right:0',
      'z-index:999999',
      'overflow:hidden',
      'box-sizing:border-box',
    ].join(';') + ';';

    if (isBadge) {
      el.style.width = '64px';
      el.style.height = '64px';
      el.style.left = 'auto';
      el.style.right = '16px';
      if (isBottom) el.style.bottom = '16px';
      else el.style.top = '16px';
      el.style.borderRadius = '50%';
    } else {
      el.style.minHeight = '48px';
    }

    return el;
  }

  // ── Match fetching (production: real API) ─────────────────────────

  async function fetchMatch(config: Config): Promise<MatchData | null> {
    const base = getApiBase();
    const hostDomain = window.location.hostname;
    const url = `${base}/v1/match?startup_id=${encodeURIComponent(config.startupId)}&host_domain=${encodeURIComponent(hostDomain)}`;

    const res = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + config.token },
    });

    if (res.status === 204) return null;
    if (!res.ok) throw new Error('match fetch failed: ' + res.status);

    return res.json() as Promise<MatchData>;
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
    root.className = `lr-widget lr-${config.format} lr-${config.theme}`;
    root.innerHTML = buildWidgetHTML(data, config);

    if (config.format === 'badge') {
      setupBadgeInteraction(root, shadow);
    }

    shadow.appendChild(root);
  }

  function renderPlaceholder(host: HTMLElement, config: Config): void {
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 1.4; }
      .lr-placeholder { padding: 6px 12px; text-align: center; color: ${config.theme === 'dark' ? '#888' : '#999'}; }
      .lr-placeholder a { color: ${config.theme === 'dark' ? '#4d94ff' : '#0066ff'}; text-decoration: none; }
    `;
    shadow.appendChild(style);
    const div = document.createElement('div');
    div.className = 'lr-placeholder';
    div.innerHTML = 'Supporting indie founders · <a href="https://launchrelay.com/directory" target="_blank" rel="noopener">Explore</a>';
    shadow.appendChild(div);
  }

  function setupBadgeInteraction(root: HTMLElement, shadow: ShadowRoot): void {
    const badge = root.querySelector('.lr-badge-trigger') as HTMLElement | null;
    const popover = root.querySelector('.lr-popover') as HTMLElement | null;
    if (!badge || !popover) return;

    let open = false;
    function toggle() {
      open = !open;
      popover.style.display = open ? 'block' : 'none';
    }

    badge.addEventListener('click', toggle);
    badge.addEventListener('mouseenter', () => { popover.style.display = 'block'; });
    badge.addEventListener('mouseleave', () => {
      setTimeout(() => { if (!open) popover.style.display = 'none'; }, 300);
    });
    popover.addEventListener('mouseenter', () => { popover.style.display = 'block'; });
    popover.addEventListener('mouseleave', () => {
      popover.style.display = 'none';
      open = false;
    });
  }

  // ── Widget styles ─────────────────────────────────────────────────

  function getWidgetStyles(config: Config): string {
    const dark = config.theme === 'dark';
    const bg = dark ? '#1a1a1a' : '#ffffff';
    const fg = dark ? '#e0e0e0' : '#333333';
    const border = dark ? '#333' : '#e5e5e5';
    const shadow_c = dark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)';
    const accent = dark ? '#4d94ff' : '#0066ff';
    const logoBg = dark ? '#2a2a2a' : '#f0f0f0';
    const logoFg = dark ? '#666' : '#999';

    return `
      :host { all: initial; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.4; }
      .lr-widget { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; background: ${bg}; color: ${fg}; }
      .lr-bar { border-top: 1px solid ${border}; box-shadow: 0 -2px 8px ${shadow_c}; cursor: pointer; user-select: none; }
      .lr-card { border: 1px solid ${border}; border-radius: 8px; box-shadow: 0 2px 8px ${shadow_c}; }
      .lr-content { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
      .lr-logo { width: 24px; height: 24px; border-radius: 4px; background: ${logoBg}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 12px; font-weight: 700; color: ${logoFg}; }
      .lr-info { display: flex; flex-direction: column; min-width: 0; }
      .lr-name { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .lr-pitch { font-size: 12px; opacity: 0.7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .lr-cta { flex-shrink: 0; padding: 4px 12px; border-radius: 4px; background: ${accent}; color: #fff; font-size: 12px; font-weight: 600; text-decoration: none; border: none; cursor: pointer; transition: opacity 0.15s; }
      .lr-cta:hover { opacity: 0.85; }
      .lr-branding { font-size: 10px; opacity: 0.4; margin-left: 8px; white-space: nowrap; }

      /* Badge format */
      .lr-badge { position: relative; width: 100%; height: 100%; border-radius: 50%; cursor: pointer; user-select: none; }
      .lr-badge-trigger { width: 100%; height: 100%; border-radius: 50%; background: ${accent}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; box-shadow: 0 2px 12px rgba(0,0,0,0.15); }
      .lr-popover { display: none; position: fixed; bottom: 88px; right: 16px; width: 280px; background: ${bg}; border: 1px solid ${border}; border-radius: 8px; padding: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); z-index: 1000000; }
      .lr-popover .lr-content { margin-bottom: 8px; }
      .lr-popover .lr-name { font-size: 14px; }
      .lr-popover .lr-pitch { font-size: 13px; white-space: normal; }
    `;
  }

  function buildWidgetHTML(data: MatchData, config: Config): string {
    const m = data.match;
    const initial = m.name.charAt(0).toUpperCase();
    const utm = `?utm_source=launchrelay&utm_medium=widget&utm_campaign=partner_${encodeURIComponent(m.id)}`;
    const href = m.url + utm;

    if (config.format === 'badge') {
      return `
        <div class="lr-badge-trigger">${initial}</div>
        <div class="lr-popover">
          <div class="lr-content">
            <div class="lr-logo">${initial}</div>
            <div class="lr-info">
              <div class="lr-name">${escapeHTML(m.name)}</div>
              <div class="lr-pitch">${escapeHTML(m.one_line_pitch)}</div>
            </div>
          </div>
          <a class="lr-cta" href="${escapeHTML(href)}" target="_blank" rel="noopener">Learn More</a>
          ${config.noBranding ? '' : '<div class="lr-branding" style="margin-top:4px;text-align:right">LaunchRelay</div>'}
        </div>`;
    }

    return `
      <div class="lr-content">
        <div class="lr-logo">${initial}</div>
        <div class="lr-info">
          <span class="lr-name">${escapeHTML(m.name)}</span>
          <span class="lr-pitch">${escapeHTML(m.one_line_pitch)}</span>
        </div>
      </div>
      <a class="lr-cta" href="${escapeHTML(href)}" target="_blank" rel="noopener">Learn More →</a>
      ${config.noBranding ? '' : '<span class="lr-branding">LaunchRelay</span>'}
    `;
  }

  function escapeHTML(s: string): string {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(s));
    return div.innerHTML;
  }

  // ── Viewport tracking ─────────────────────────────────────────────

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
                queueEvent('impression', impressionId, matchData.match.id, beaconQueue, config, flushSoon);
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

    const shadow = container.shadowRoot;
    if (!shadow) return;

    if (config.format === 'badge') {
      const trigger = shadow.querySelector('.lr-badge-trigger');
      if (trigger) {
        trigger.addEventListener('click', function () {
          queueEvent('click', impressionId, matchData.match.id, beaconQueue, config, flushSoon);
        });
      }
      const popoverCta = shadow.querySelector('.lr-popover .lr-cta');
      if (popoverCta) {
        popoverCta.addEventListener('click', function (e: Event) {
          queueEvent('click', impressionId, matchData.match.id, beaconQueue, config, flushSoon);
          const href = (this as HTMLAnchorElement).getAttribute('href');
          if (href && !e.defaultPrevented) {
            e.preventDefault();
            setTimeout(() => { window.open(href, '_blank'); }, 100);
          }
        });
      }
      return;
    }

    const cta = shadow.querySelector('.lr-cta');
    if (cta) {
      cta.addEventListener('click', function (e: Event) {
        queueEvent('click', impressionId, matchData.match.id, beaconQueue, config, flushSoon);
        const href = (this as HTMLAnchorElement).getAttribute('href');
        if (href && !e.defaultPrevented) {
          e.preventDefault();
          setTimeout(() => { window.open(href, '_blank'); }, 100);
        }
      });
    }
  }

  function queueEvent(
    type: 'impression' | 'click',
    impressionId: string,
    shownStartupId: string,
    queue: BeaconEvent[],
    config: Config,
    flushSoon: () => void
  ): void {
    const wasEmpty = queue.length === 0;
    queue.push({ type, impression_id: impressionId, shown_startup_id: shownStartupId, timestamp: Date.now() });
    if (wasEmpty) flushSoon();
  }

  // ── Beacon flushing ──────────────────────────────────────────────

  function flushBeacons(queue: BeaconEvent[], config: Config): void {
    if (queue.length === 0) return;

    const batch: BeaconBatch = {
      viewer_startup_id: config.startupId,
      events: queue.splice(0, queue.length),
    };

    try {
      const blob = new Blob([JSON.stringify(batch)], { type: 'application/json' });
      navigator.sendBeacon('/v1/impressions', blob);
    } catch {
      // silent
    }
  }

  function startBeaconFlusher(queue: BeaconEvent[], config: Config): () => void {
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

  // ── API base URL ─────────────────────────────────────────────────

  function getApiBase(): string {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src;
      if (src && src.includes('widget.js')) {
        try {
          return new URL(src).origin;
        } catch { continue; }
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
        if (!data) {
          renderPlaceholder(container, config);
          container.setAttribute('data-lr-ready', 'true');
          return;
        }
        renderWidget(container, data, config);
        container.setAttribute('data-lr-ready', 'true');
        startTracking(container, data.impression_id, config, data, beaconQueue, flushSoon);
      })
      .catch(() => {
        container.style.display = 'none';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
