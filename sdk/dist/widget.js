"use strict";var LaunchRelay=(()=>{(function(){"use strict";function v(){let n=document.currentScript||document.querySelector("script[data-startup-id]");if(!n)return null;let e=n.getAttribute("data-startup-id");return e?{startupId:e,theme:n.getAttribute("data-theme")||"light",format:n.getAttribute("data-format")||"bar",position:n.getAttribute("data-position")||"bottom",noBranding:n.hasAttribute("data-no-branding"),token:n.getAttribute("data-token")||""}:null}function y(n){let e=document.createElement("div");if(e.id="lr-slot",n.format==="card")return e.style.cssText="width:100%;overflow:hidden;box-sizing:border-box;",e;let t=n.position==="bottom",i=n.format==="badge";return e.style.cssText=["position:fixed",t?"bottom:0":"top:0","left:0","right:0","z-index:999999","overflow:hidden","box-sizing:border-box"].join(";")+";",i?(e.style.width="64px",e.style.height="64px",e.style.left="auto",e.style.right="16px",t?e.style.bottom="16px":e.style.top="16px",e.style.borderRadius="50%"):e.style.minHeight="48px",e}async function x(n){let e=C(),t=window.location.hostname,i=`${e}/v1/match?startup_id=${encodeURIComponent(n.startupId)}&host_domain=${encodeURIComponent(t)}`,o=await fetch(i,{headers:{Authorization:"Bearer "+n.token}});if(o.status===204)return null;if(!o.ok)throw new Error("match fetch failed: "+o.status);return o.json()}function w(n,e,t){let i=n.attachShadow({mode:"closed"}),o=document.createElement("style");o.textContent=T(t),i.appendChild(o);let r=document.createElement("div");r.className=`lr-widget lr-${t.format} lr-${t.theme}`,r.innerHTML=L(e,t),t.format==="badge"&&k(r,i),i.appendChild(r)}function E(n,e){let t=n.attachShadow({mode:"closed"}),i=document.createElement("style");i.textContent=`
      :host { all: initial; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 1.4; }
      .lr-placeholder { padding: 6px 12px; text-align: center; color: ${e.theme==="dark"?"#888":"#999"}; }
      .lr-placeholder a { color: ${e.theme==="dark"?"#4d94ff":"#0066ff"}; text-decoration: none; }
    `,t.appendChild(i);let o=document.createElement("div");o.className="lr-placeholder",o.innerHTML='Supporting indie founders \xB7 <a href="https://launchrelay.com/directory" target="_blank" rel="noopener">Explore</a>',t.appendChild(o)}function k(n,e){let t=n.querySelector(".lr-badge-trigger"),i=n.querySelector(".lr-popover");if(!t||!i)return;let o=!1;function r(){o=!o,i.style.display=o?"block":"none"}t.addEventListener("click",r),t.addEventListener("mouseenter",()=>{i.style.display="block"}),t.addEventListener("mouseleave",()=>{setTimeout(()=>{o||(i.style.display="none")},300)}),i.addEventListener("mouseenter",()=>{i.style.display="block"}),i.addEventListener("mouseleave",()=>{i.style.display="none",o=!1})}function T(n){let e=n.theme==="dark",t=e?"#1a1a1a":"#ffffff",i=e?"#e0e0e0":"#333333",o=e?"#333":"#e5e5e5",r=e?"rgba(0,0,0,0.3)":"rgba(0,0,0,0.06)",a=e?"#4d94ff":"#0066ff";return`
      :host { all: initial; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.4; }
      .lr-widget { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; background: ${t}; color: ${i}; }
      .lr-bar { border-top: 1px solid ${o}; box-shadow: 0 -2px 8px ${r}; cursor: pointer; user-select: none; }
      .lr-card { border: 1px solid ${o}; border-radius: 8px; box-shadow: 0 2px 8px ${r}; }
      .lr-content { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
      .lr-logo { width: 24px; height: 24px; border-radius: 4px; background: ${e?"#2a2a2a":"#f0f0f0"}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 12px; font-weight: 700; color: ${e?"#666":"#999"}; }
      .lr-info { display: flex; flex-direction: column; min-width: 0; }
      .lr-name { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .lr-pitch { font-size: 12px; opacity: 0.7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .lr-cta { flex-shrink: 0; padding: 4px 12px; border-radius: 4px; background: ${a}; color: #fff; font-size: 12px; font-weight: 600; text-decoration: none; border: none; cursor: pointer; transition: opacity 0.15s; }
      .lr-cta:hover { opacity: 0.85; }
      .lr-branding { font-size: 10px; opacity: 0.4; margin-left: 8px; white-space: nowrap; }

      /* Badge format */
      .lr-badge { position: relative; width: 100%; height: 100%; border-radius: 50%; cursor: pointer; user-select: none; }
      .lr-badge-trigger { width: 100%; height: 100%; border-radius: 50%; background: ${a}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; box-shadow: 0 2px 12px rgba(0,0,0,0.15); }
      .lr-popover { display: none; position: fixed; bottom: 88px; right: 16px; width: 280px; background: ${t}; border: 1px solid ${o}; border-radius: 8px; padding: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); z-index: 1000000; }
      .lr-popover .lr-content { margin-bottom: 8px; }
      .lr-popover .lr-name { font-size: 14px; }
      .lr-popover .lr-pitch { font-size: 13px; white-space: normal; }
    `}function L(n,e){let t=n.match,i=t.name.charAt(0).toUpperCase(),o=`?utm_source=launchrelay&utm_medium=widget&utm_campaign=partner_${encodeURIComponent(t.id)}`,r=t.url+o;return e.format==="badge"?`
        <div class="lr-badge-trigger">${i}</div>
        <div class="lr-popover">
          <div class="lr-content">
            <div class="lr-logo">${i}</div>
            <div class="lr-info">
              <div class="lr-name">${d(t.name)}</div>
              <div class="lr-pitch">${d(t.one_line_pitch)}</div>
            </div>
          </div>
          <a class="lr-cta" href="${d(r)}" target="_blank" rel="noopener">Learn More</a>
          ${e.noBranding?"":'<div class="lr-branding" style="margin-top:4px;text-align:right">LaunchRelay</div>'}
        </div>`:`
      <div class="lr-content">
        <div class="lr-logo">${i}</div>
        <div class="lr-info">
          <span class="lr-name">${d(t.name)}</span>
          <span class="lr-pitch">${d(t.one_line_pitch)}</span>
        </div>
      </div>
      <a class="lr-cta" href="${d(r)}" target="_blank" rel="noopener">Learn More \u2192</a>
      ${e.noBranding?"":'<span class="lr-branding">LaunchRelay</span>'}
    `}function d(n){let e=document.createElement("div");return e.appendChild(document.createTextNode(n)),e.innerHTML}function $(n,e,t,i,o,r){let a=null,u=!1;new IntersectionObserver(s=>{s.forEach(l=>{l.isIntersecting?!a&&!u&&(a=setTimeout(()=>{c("impression",e,o,t,r),u=!0,a=null},1e3)):a&&(clearTimeout(a),a=null)})},{threshold:.5}).observe(n);let p=n.shadowRoot;if(!p)return;if(t.format==="badge"){let s=p.querySelector(".lr-badge-trigger");s&&s.addEventListener("click",function(){c("click",e,o,t,r)});let l=p.querySelector(".lr-popover .lr-cta");l&&l.addEventListener("click",function(m){c("click",e,o,t,r);let b=this.getAttribute("href");b&&!m.defaultPrevented&&(m.preventDefault(),setTimeout(()=>{window.open(b,"_blank")},100))});return}let h=p.querySelector(".lr-cta");h&&h.addEventListener("click",function(s){c("click",e,o,t,r);let l=this.getAttribute("href");l&&!s.defaultPrevented&&(s.preventDefault(),setTimeout(()=>{window.open(l,"_blank")},100))})}function c(n,e,t,i,o){let r=t.length===0;t.push({type:n,impression_id:e,timestamp:Date.now()}),r&&o()}function f(n,e){if(n.length===0)return;let t={startup_id:e.startupId,events:n.splice(0,n.length)};try{let i=new Blob([JSON.stringify(t)],{type:"application/json"});navigator.sendBeacon("/v1/impressions",i)}catch{}}function B(n,e){let t=null;function i(){t&&clearTimeout(t),t=setTimeout(()=>{f(n,e),t=null},2e3)}return setInterval(()=>f(n,e),3e4),window.addEventListener("beforeunload",()=>{t&&clearTimeout(t),f(n,e)}),i}function C(){let n=document.getElementsByTagName("script");for(let e=0;e<n.length;e++){let t=n[e].src;if(t&&t.includes("widget.js"))try{return new URL(t).origin}catch{continue}}return"https://api.launchrelay.com"}function g(){let n=v();if(!n)return;let e=y(n);document.body.appendChild(e);let t=[],i=B(t,n);x(n).then(o=>{if(!o){E(e,n),e.setAttribute("data-lr-ready","true");return}w(e,o,n),e.setAttribute("data-lr-ready","true"),$(e,o.impression_id,n,o,t,i)}).catch(()=>{e.style.display="none"})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",g):g()})();})();
