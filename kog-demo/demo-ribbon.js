// Demo chrome: the floating switcher bar + the first-run welcome popup.
// Lets the viewer hop between the three faces of the system (website /
// client portal / staff admin) without any login, and explains on first
// launch that this is a demonstration, not the live system.
(function () {
  const inApp = /\/(admin|mijn-pand)\//.test(location.pathname);
  const base = inApp ? '../' : './';
  const here = location.pathname.includes('/admin/') ? 'admin'
    : location.pathname.includes('/mijn-pand/') ? 'portal' : 'site';
  const SEEN_KEY = 'kog_demo_welcome_seen';

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
    #kog-demo-ribbon button.kdr-help { margin-left:2px; width:26px; height:26px; border:0; border-radius:999px;
      background:rgba(255,255,255,.14); color:#FAFAF8; font:700 13px/1 Montserrat,sans-serif; cursor:pointer; }
    #kog-demo-ribbon button.kdr-help:hover { background:#7FC65C; color:#1A1A1A; }
    @keyframes kdr-pulse { 0%,100% { box-shadow:0 8px 28px rgba(0,0,0,.28); transform:translateX(-50%) scale(1); }
      50% { box-shadow:0 0 0 8px rgba(206,27,36,.35); transform:translateX(-50%) scale(1.06); } }
    #kog-demo-ribbon.kdr-attention { animation: kdr-pulse 1s ease 3; }
    @media print { #kog-demo-ribbon, #kog-demo-welcome { display:none !important; } }
    @media (max-width: 520px) { #kog-demo-ribbon .kdr-tag { display:none; } }

    #kog-demo-welcome { position:fixed; inset:0; z-index:10000; display:flex; align-items:center;
      justify-content:center; padding:20px; background:rgba(26,26,26,.62); backdrop-filter:blur(3px);
      font-family:Montserrat,ui-sans-serif,system-ui,sans-serif; }
    #kog-demo-welcome .kdw-card { background:#FAFAF8; color:#1A1A1A; border-radius:16px; max-width:560px;
      width:100%; max-height:calc(100vh - 40px); overflow:auto; padding:34px 36px 28px;
      box-shadow:0 24px 80px rgba(0,0,0,.4); }
    #kog-demo-welcome .kdw-badge { display:inline-block; font-size:10px; font-weight:700;
      letter-spacing:.18em; text-transform:uppercase; color:#4C8B30; background:rgba(95,168,60,.14);
      padding:6px 12px; border-radius:999px; }
    #kog-demo-welcome h2 { margin:14px 0 0; font-size:24px; font-weight:700; line-height:1.2; color:#CE1B24; }
    #kog-demo-welcome p { margin:12px 0 0; font-size:13.5px; line-height:1.65; color:rgba(26,26,26,.75); }
    #kog-demo-welcome .kdw-nav { margin:18px 0 0; padding:16px 18px; background:#F1F0EA;
      border:1px solid #E5E2DA; border-radius:12px; }
    #kog-demo-welcome .kdw-nav-title { font-size:11px; font-weight:700; letter-spacing:.14em;
      text-transform:uppercase; color:#6B6862; }
    #kog-demo-welcome .kdw-nav ul { margin:10px 0 0; padding:0; list-style:none; }
    #kog-demo-welcome .kdw-nav li { display:flex; gap:10px; align-items:baseline; font-size:13px;
      line-height:1.55; color:rgba(26,26,26,.8); margin-top:7px; }
    #kog-demo-welcome .kdw-pill { flex:none; font-size:10.5px; font-weight:700; color:#FAFAF8;
      background:#1A1A1A; border-radius:999px; padding:4px 10px; white-space:nowrap; }
    #kog-demo-welcome .kdw-arrow { margin-top:12px; font-size:12.5px; font-weight:600; color:#4C8B30; }
    #kog-demo-welcome .kdw-actions { margin-top:22px; display:flex; gap:10px; flex-wrap:wrap; }
    #kog-demo-welcome .kdw-actions button, #kog-demo-welcome .kdw-actions a { font:600 13.5px/1 Montserrat,sans-serif;
      border-radius:8px; padding:13px 20px; cursor:pointer; text-decoration:none; border:0; }
    #kog-demo-welcome .kdw-primary { background:#CE1B24; color:#fff; }
    #kog-demo-welcome .kdw-primary:hover { background:#A3141B; }
    #kog-demo-welcome .kdw-secondary { background:transparent; color:#1A1A1A; border:1px solid #E5E2DA !important; }
    #kog-demo-welcome .kdw-secondary:hover { border-color:#CE1B24 !important; color:#CE1B24; }
  `;
  document.head.appendChild(style);

  /* ---------------- switcher bar ---------------- */
  const bar = document.createElement('div');
  bar.id = 'kog-demo-ribbon';
  bar.innerHTML = `
    <span class="kdr-tag">Demo</span>
    <a href="${base}index.html" class="${here === 'site' ? 'kdr-active' : ''}">Website</a>
    <a href="${base}mijn-pand/index.html" class="${here === 'portal' ? 'kdr-active' : ''}">Klantportaal</a>
    <a href="${base}admin/index.html" class="${here === 'admin' ? 'kdr-active' : ''}">Beheer</a>
    <button class="kdr-help" type="button" title="Uitleg over deze demo" aria-label="Uitleg over deze demo">?</button>
  `;
  document.body.appendChild(bar);
  bar.querySelector('.kdr-help').addEventListener('click', () => showWelcome());

  /* ---------------- first-run welcome popup ---------------- */
  function showWelcome() {
    if (document.getElementById('kog-demo-welcome')) return;
    const onSite = here === 'site';
    const overlay = document.createElement('div');
    overlay.id = 'kog-demo-welcome';
    overlay.innerHTML = `
      <div class="kdw-card" role="dialog" aria-modal="true" aria-label="Uitleg demo">
        <span class="kdw-badge">Demonstratie — niet het echte systeem</span>
        <h2>Welkom bij de demo van het KOG-systeem</h2>
        <p>Dit is <strong>geen live software</strong>, maar een vrij verkenbare demonstratie die laat zien
        hoe de applicatie werkt. Alle panden, namen en aanvragen zijn <strong>fictief</strong>, alles draait
        alleen op deze computer, en u kunt niets kapotmaken — na verversen begint alles opnieuw.</p>
        <div class="kdw-nav">
          <div class="kdw-nav-title">Zo navigeert u</div>
          <ul>
            <li><span class="kdw-pill">Website</span><span>De publiekswebsite, inclusief het <strong>slimme offerteformulier</strong> — het startpunt van de hele flow.</span></li>
            <li><span class="kdw-pill">Klantportaal</span><span>Wat een klant van zijn eigen pand(en) ziet — u bent al "ingelogd", geen wachtwoord nodig.</span></li>
            <li><span class="kdw-pill">Beheer</span><span>De werkomgeving van KOG-medewerkers: aanvragen, panddossiers en de onderhoudsagenda.</span></li>
          </ul>
          <div class="kdw-arrow">&darr;&nbsp; Wisselen kan altijd via de zwarte balk onderaan het scherm.</div>
        </div>
        <div class="kdw-actions">
          ${onSite
            ? '<button type="button" class="kdw-primary" data-kdw-quote>Open het offerteformulier</button>'
            : `<a class="kdw-primary" href="${base}index.html">Naar de website &amp; het offerteformulier</a>`}
          <button type="button" class="kdw-secondary" data-kdw-close>Zelf rondkijken</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    function dismiss() {
      try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode */ }
      overlay.remove();
      // Draw the eye to the switcher bar once the popup is gone.
      bar.classList.add('kdr-attention');
      setTimeout(() => bar.classList.remove('kdr-attention'), 3200);
    }
    overlay.querySelector('[data-kdw-close]').addEventListener('click', dismiss);
    overlay.addEventListener('click', e => { if (e.target === overlay) dismiss(); });
    const quoteBtn = overlay.querySelector('[data-kdw-quote]');
    if (quoteBtn) quoteBtn.addEventListener('click', () => {
      dismiss();
      const trigger = document.querySelector('[data-i18n="hero.ctaPrimary"]');
      (trigger?.closest('a, button') || trigger)?.click();
    });
    const link = overlay.querySelector('a.kdw-primary');
    if (link) link.addEventListener('click', () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch {} });
  }

  let seen = false;
  try { seen = !!localStorage.getItem(SEEN_KEY); } catch { /* private mode */ }
  if (!seen) showWelcome();
})();
