"use strict";var LaunchRelay=(()=>{(function(){"use strict";function h(){let n=document.currentScript||document.querySelector("script[data-startup-id]");if(!n)return null;let t=n.getAttribute("data-startup-id");return t?{startupId:t,theme:n.getAttribute("data-theme")||"light",format:n.getAttribute("data-format")||"bar",position:n.getAttribute("data-position")||"bottom",noBranding:n.hasAttribute("data-no-branding"),token:n.getAttribute("data-token")||""}:null}function b(n){let t=document.createElement("div");t.id="lr-slot",t.setAttribute("aria-live","polite");let e={width:"100%",overflow:"hidden","box-sizing":"border-box"};return n.format==="bar"&&(n.position==="bottom"?(e.position="fixed",e.bottom="0",e.left="0",e.right="0",e["z-index"]="999999"):(e.position="fixed",e.top="0",e.left="0",e.right="0",e["z-index"]="999999"),t.style.minHeight="48px"),Object.assign(t.style,e),t}async function v(n){let t={match:{id:"mock-startup-001",name:"ShipFast",one_line_pitch:"Deploy your SaaS in days, not months",url:"https://shipfast.example.com",logo_url:"",category:["devtools"]},impression_id:"imp-mock-"+Date.now()};return new Promise(e=>{setTimeout(()=>e(t),200)})}function y(n,t,e){let i=n.attachShadow({mode:"closed"}),o=document.createElement("style");o.textContent=x(e),i.appendChild(o);let r=document.createElement("div");r.className=`lr-widget lr-theme-${e.theme} lr-format-${e.format}`,r.innerHTML=w(t,e),i.appendChild(r)}function x(n){let t=n.theme==="light";return`
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
        background: ${t?"#ffffff":"#1a1a1a"};
        color: ${t?"#333333":"#e0e0e0"};
        border-top: 1px solid ${t?"#e5e5e5":"#333333"};
        box-shadow: 0 -2px 8px rgba(0,0,0,${t?"0.06":"0.3"});
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
        background: ${t?"#f0f0f0":"#2a2a2a"};
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 12px;
        font-weight: 700;
        color: ${t?"#999":"#666"};
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
        background: ${t?"#0066ff":"#4d94ff"};
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
    `}function w(n,t){let e=n.match;return`
      <div class="lr-content">
        <div class="lr-logo">${e.name.charAt(0).toUpperCase()}</div>
        <div class="lr-info">
          <span class="lr-name">${l(e.name)}</span>
          <span class="lr-pitch">${l(e.one_line_pitch)}</span>
        </div>
      </div>
      <a class="lr-cta" href="${l(e.url)}" target="_blank" rel="noopener">Learn More \u2192</a>
      ${t.noBranding?"":'<span class="lr-branding">LaunchRelay</span>'}
    `}function l(n){let t=document.createElement("div");return t.appendChild(document.createTextNode(n)),t.innerHTML}function T(n,t,e,i,o,r){let a=null,u=!1;new IntersectionObserver(s=>{s.forEach(c=>{c.isIntersecting?!a&&!u&&(a=setTimeout(()=>{p("impression",t,o,e,r),u=!0,a=null},1e3)):a&&(clearTimeout(a),a=null)})},{threshold:.5}).observe(n);let g=n.shadowRoot;if(g){let s=g.querySelector(".lr-cta");s&&s.addEventListener("click",function(c){p("click",t,o,e,r);let m=this.getAttribute("href");m&&!c.defaultPrevented&&(c.preventDefault(),setTimeout(()=>{window.open(m,"_blank")},100))})}}function p(n,t,e,i,o){let r=e.length===0;e.push({type:n,impression_id:t,timestamp:Date.now()}),r&&o()}function d(n,t){if(n.length===0)return;let e={startup_id:t.startupId,events:n.splice(0,n.length)};try{let i=new Blob([JSON.stringify(e)],{type:"application/json"});navigator.sendBeacon("/v1/impressions",i)}catch{}}function E(n,t){let e=null;function i(){e&&clearTimeout(e),e=setTimeout(()=>{d(n,t),e=null},2e3)}return setInterval(()=>d(n,t),3e4),window.addEventListener("beforeunload",()=>{e&&clearTimeout(e),d(n,t)}),i}function k(){let n=document.getElementsByTagName("script");for(let t=0;t<n.length;t++){let e=n[t].src;if(e&&e.includes("widget.js"))try{return new URL(e).origin}catch{continue}}return"https://api.launchrelay.com"}function f(){let n=h();if(!n)return;let t=b(n);document.body.appendChild(t);let e=[],i=E(e,n);v(n).then(o=>{y(t,o,n),t.setAttribute("data-lr-ready","true"),T(t,o.impression_id,n,o,e,i)}).catch(()=>{t.style.display="none"})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",f):f()})();})();
