// Floating demo switcher — lets the viewer hop between the three faces of the
// system (website / client portal / staff admin) without any login.
(function () {
  const inApp = /\/(admin|mijn-pand)\//.test(location.pathname);
  const base = inApp ? '../' : './';
  const here = location.pathname.includes('/admin/') ? 'admin'
    : location.pathname.includes('/mijn-pand/') ? 'portal' : 'site';

  const style = document.createElement('style');
  style.textContent = `
    #kog-demo-ribbon { position:fixed; left:50%; bottom:14px; transform:translateX(-50%);
      z-index:9999; display:flex; align-items:center; gap:2px; padding:5px 7px;
      background:#1A1A1A; color:#FAFAF8; border-radius:999px;
      box-shadow:0 8px 28px rgba(0,0,0,.28); font:600 12px/1 Montserrat,ui-sans-serif,system-ui,sans-serif; }
    #kog-demo-ribbon .kdr-tag { padding:6px 10px 6px 12px; letter-spacing:.14em; text-transform:uppercase;
      font-size:10px; color:#7FC65C; white-space:nowrap; }
    #kog-demo-ribbon a { color:#FAFAF8; text-decoration:none; padding:7px 12px; border-radius:999px;
      white-space:nowrap; opacity:.75; transition:opacity .15s, background .15s; }
    #kog-demo-ribbon a:hover { opacity:1; background:rgba(255,255,255,.12); }
    #kog-demo-ribbon a.kdr-active { opacity:1; background:#CE1B24; }
    @media print { #kog-demo-ribbon { display:none !important; } }
    @media (max-width: 520px) { #kog-demo-ribbon .kdr-tag { display:none; } }
  `;
  document.head.appendChild(style);

  const bar = document.createElement('div');
  bar.id = 'kog-demo-ribbon';
  bar.innerHTML = `
    <span class="kdr-tag">Demo</span>
    <a href="${base}index.html" class="${here === 'site' ? 'kdr-active' : ''}">Website</a>
    <a href="${base}mijn-pand/index.html" class="${here === 'portal' ? 'kdr-active' : ''}">Klantportaal</a>
    <a href="${base}admin/index.html" class="${here === 'admin' ? 'kdr-active' : ''}">Beheer</a>
  `;
  document.body.appendChild(bar);
})();
