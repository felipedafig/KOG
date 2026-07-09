import { onLangChange, t, applyStaticI18n } from './i18n.js';

// Local copy (properties.js has one too) so the shell doesn't eagerly pull in
// the view modules that index.html loads lazily per route.
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const HIDDEN_PREFIXES = ['/auth', '/login', '/onboarding', '/signup', '/reset-password', '/welcome', '/landing'];

const NAV_ITEMS = [
  {
    key: 'quotes',
    labelKey: 'nav.quotes',
    href: '/quotes',
    exact: false,
    icon: 'inbox',
    prefetchKey: 'quotes',
    roles: ['staff'],
  },
  {
    key: 'properties',
    labelKey: 'nav.properties',
    href: '/properties',
    exact: false,
    icon: 'building',
    prefetchKey: 'properties',
    roles: ['staff'],
  },
  {
    key: 'agenda',
    labelKey: 'nav.agenda',
    href: '/agenda',
    exact: true,
    icon: 'calendar',
    prefetchKey: 'agenda',
    roles: ['staff'],
    badge: { type: 'dot', tone: 'leaf' },
  },
];

function icon(name, className = 'h-5 w-5 shrink-0') {
  const shared = `class="${className}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
  const icons = {
    inbox: `<svg viewBox="0 0 24 24" ${shared}><path d="M4 6h16v12H4z"/><path d="M4 12h4l2 3h4l2-3h4"/></svg>`,
    building: `<svg viewBox="0 0 24 24" ${shared}><path d="M5 21V3h10v18"/><path d="M9 7h2"/><path d="M9 11h2"/><path d="M9 15h2"/><path d="M15 21v-8h4v8"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24" ${shared}><path d="M7 3v3M17 3v3"/><path d="M4 8h16"/><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 12h4"/></svg>`,
    bell: `<svg viewBox="0 0 24 24" ${shared}><path d="M15 17H5l1.5-2.5V11a5.5 5.5 0 0 1 11 0v3.5L19 17h-4"/><path d="M10 17a2 2 0 0 0 4 0"/></svg>`,
    gear: `<svg viewBox="0 0 24 24" ${shared}><circle cx="12" cy="12" r="3.2"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.8-1L14.2 3h-4.4l-.5 2.9a7 7 0 0 0-1.8 1l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .3 0 .6.1 1l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.8 1l.5 2.9h4.4l.5-2.9a7 7 0 0 0 1.8-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.6.1-1z"/></svg>`,
    user: `<svg viewBox="0 0 24 24" ${shared}><path d="M20 21a8 8 0 1 0-16 0"/><circle cx="12" cy="8" r="3.2"/></svg>`,
    menu: `<svg viewBox="0 0 24 24" ${shared}><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
    chevron: `<svg viewBox="0 0 24 24" ${shared}><path d="M6 9l6 6 6-6"/></svg>`,
    collapse: `<svg viewBox="0 0 24 24" ${shared}><path d="M10 6 4 12l6 6"/><path d="M20 12H4"/></svg>`,
    expand: `<svg viewBox="0 0 24 24" ${shared}><path d="M14 6 20 12l-6 6"/><path d="M4 12h16"/></svg>`,
    dot: `<svg viewBox="0 0 24 24" fill="currentColor" class="${className}"><circle cx="12" cy="12" r="4.2"/></svg>`,
  };
  return icons[name] || icons.menu;
}

function readCollapsedState(storageKey) {
  return localStorage.getItem(storageKey) === 'true';
}

function writeCollapsedState(storageKey, value) {
  localStorage.setItem(storageKey, value ? 'true' : 'false');
}

function normalizePath() {
  const path = (location.hash || '#/').slice(1) || '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function isHiddenRoute(path) {
  return HIDDEN_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

function matchesNav(item, path) {
  if (item.exact) return path === item.href;
  // A non-exact "/" item (portal home) is the section for every route.
  if (item.href === '/') return true;
  return path === item.href || path.startsWith(`${item.href}/`);
}

function canSeeNavItem(item, session) {
  const role = session?.user?.app_metadata?.user_role;
  if (item.roles && item.roles.length) return Boolean(role && item.roles.includes(role));
  return true;
}

function initials(session) {
  const value = session?.user?.user_metadata?.full_name || session?.user?.email || 'KOG';
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || 'K';
}

function adminCrumbLabelForPath(path) {
  if (path.startsWith('/quotes/')) return t('shell.breadcrumb_detail');
  if (path.startsWith('/properties/')) return t('shell.breadcrumb_detail');
  if (path.startsWith('/components/')) return t('shell.breadcrumb_component');
  return null;
}

// Defaults describe the staff admin app; mijn-pand passes its own `config`
// (nav items, brand/role keys, footer) to get the same chrome around client views.
const ADMIN_CONFIG = {
  storageKey: 'kog_admin_sidebar_collapsed',
  brandKey: 'admin.brand',
  subtitleKey: 'shell.brand_subtitle',
  roleKey: 'shell.role_staff',
  homeHref: '/quotes',
  navItems: NAV_ITEMS,
  crumbLabelForPath: adminCrumbLabelForPath,
  footerKey: null,
};

export function mountAppShell(container, { session = null, onLogout = () => {}, onPrefetchRoute = () => {}, config = {} } = {}) {
  const cfg = { ...ADMIN_CONFIG, ...config };

  function currentSection(path) {
    return cfg.navItems.find(item => matchesNav(item, path)) || cfg.navItems[0];
  }

  const collapsed = readCollapsedState(cfg.storageKey);
  const shell = document.createElement('div');
  shell.className = 'app-shell relative min-h-screen bg-paper text-ink';
  shell.dataset.collapsed = String(collapsed);
  shell.dataset.mobileOpen = 'false';
  shell.innerHTML = `
    <div class="app-shell__overlay no-print fixed inset-0 z-30 bg-ink/35 lg:hidden" data-shell-overlay></div>
    <div class="app-shell__body relative min-h-screen lg:grid" style="grid-template-columns: var(--sidebar-width) minmax(0,1fr);">
      <aside data-shell-sidebar class="app-shell__sidebar no-print fixed inset-y-0 left-0 z-40 w-[var(--sidebar-width)] -translate-x-full border-r border-rule bg-white/95 backdrop-blur transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0">
        <div class="flex h-full flex-col">
          <div class="border-b border-rule px-3 py-3 lg:px-4">
            <div class="shell-brand-stack flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="shell-brand-text flex items-center gap-2.5">
                  <div class="shell-brand-shape flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sienna text-white font-semibold shadow-sm">K</div>
                  <div class="min-w-0 shell-brand-copy">
                    <div class="text-[17px] font-semibold leading-none tracking-[-.03em]" data-i18n="${cfg.brandKey}">${escapeHtml(t(cfg.brandKey))}</div>
                    <div class="shell-brand-subtitle mt-1 text-[12px] text-ink/50" data-i18n="${cfg.subtitleKey}">${escapeHtml(t(cfg.subtitleKey))}</div>
                  </div>
                </div>
              </div>
              <button type="button" data-shell-collapse class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rule text-ink/70 hover:border-sienna hover:text-sienna transition-colors" aria-label="${escapeHtml(t('shell.sidebar_collapse'))}" aria-pressed="${String(collapsed)}" title="${escapeHtml(collapsed ? t('shell.sidebar_expand') : t('shell.sidebar_collapse'))}">
                <span class="shell-collapse-icon">${icon(collapsed ? 'expand' : 'collapse')}</span>
                <span class="shell-collapse-copy sr-only">${escapeHtml(collapsed ? t('shell.sidebar_expand') : t('shell.sidebar_collapse'))}</span>
              </button>
            </div>
          </div>
          <nav class="flex-1 overflow-y-auto px-2.5 py-4" aria-label="${escapeHtml(t('nav.main'))}">
            <div data-shell-nav class="space-y-1"></div>
          </nav>
          <div class="shell-sidebar-footer border-t border-rule px-3 py-4 lg:px-4">
              <button type="button" data-shell-toggle-mobile class="inline-flex items-center gap-2 rounded-lg border border-rule px-3 py-2 text-[13px] text-ink/70 hover:border-sienna hover:text-sienna lg:hidden">
              ${icon('menu', 'h-4 w-4')}
              <span data-i18n="shell.close_sidebar">${escapeHtml(t('shell.close_sidebar'))}</span>
            </button>
            <div class="mt-3 flex items-center justify-between gap-3 text-[12px] text-ink/50">
              <span class="shell-brand-meta" data-i18n="shell.brand_meta">${escapeHtml(t('shell.brand_meta'))}</span>
              <button type="button" data-shell-collapse-footer class="inline-flex items-center gap-2 rounded-md px-2 py-1 hover:bg-paper2 hover:text-sienna transition-colors" aria-label="${escapeHtml(t('shell.sidebar_collapse'))}">
                <span class="shell-collapse-icon">${icon(collapsed ? 'expand' : 'collapse', 'h-4 w-4')}</span>
                <span class="shell-collapse-copy">${escapeHtml(collapsed ? t('shell.sidebar_expand') : t('shell.sidebar_collapse'))}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div class="min-w-0 flex min-h-screen flex-col">
        <header data-shell-topbar class="no-print sticky top-0 z-20 border-b border-rule bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
          <div class="flex items-center gap-3 px-4 py-3 lg:px-6">
            <button type="button" data-shell-mobile-menu class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rule bg-white text-ink/70 hover:border-sienna hover:text-sienna transition-colors lg:hidden" aria-label="${escapeHtml(t('shell.open_sidebar'))}" aria-expanded="false">
              ${icon('menu', 'h-5 w-5')}
            </button>
            <nav data-shell-breadcrumbs class="min-w-0 flex items-center gap-2 overflow-hidden text-[13px] text-ink/60"></nav>
            <div class="ml-auto flex items-center gap-2">
              <div data-lang-slot></div>
              <details data-shell-notifications class="relative">
                <summary class="list-none inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rule bg-white text-ink/70 hover:border-sienna hover:text-sienna transition-colors cursor-pointer" aria-label="${escapeHtml(t('shell.notifications'))}">
                  <span class="relative inline-flex">
                    ${icon('bell', 'h-5 w-5')}
                    <span class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-sienna"></span>
                  </span>
                </summary>
                <div class="absolute right-0 mt-2 w-72 rounded-xl border border-rule bg-white p-4 shadow-[0_18px_60px_-24px_rgba(26,26,26,.35)]">
                  <div data-shell-notifications-label class="flex items-center gap-2 text-[12px] uppercase tracking-[.18em] text-ink/45">${icon('bell', 'h-4 w-4')} ${escapeHtml(t('shell.notifications'))}</div>
                  <p class="mt-3 text-[13px] text-ink/65" data-i18n="shell.notifications_empty">${escapeHtml(t('shell.notifications_empty'))}</p>
                </div>
              </details>
              <details data-shell-settings class="relative">
                <summary class="list-none inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rule bg-white text-ink/70 hover:border-sienna hover:text-sienna transition-colors cursor-pointer" aria-label="${escapeHtml(t('shell.settings'))}">
                  ${icon('gear', 'h-5 w-5')}
                </summary>
                <div class="absolute right-0 mt-2 w-64 rounded-xl border border-rule bg-white p-3 shadow-[0_18px_60px_-24px_rgba(26,26,26,.35)]">
                  <div data-shell-settings-label class="px-2 py-1 text-[12px] uppercase tracking-[.18em] text-ink/45">${escapeHtml(t('shell.settings'))}</div>
                  <button type="button" data-shell-toggle-collapse class="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-paper2 hover:text-sienna transition-colors">
                    ${icon(collapsed ? 'expand' : 'collapse', 'h-4 w-4')}
                    <span>${escapeHtml(collapsed ? t('shell.sidebar_expand') : t('shell.sidebar_collapse'))}</span>
                  </button>
                </div>
              </details>
              <details data-shell-account class="relative">
                <summary class="list-none inline-flex h-10 items-center gap-2 rounded-lg border border-rule bg-white px-2.5 text-ink/70 hover:border-sienna hover:text-sienna transition-colors cursor-pointer" aria-label="${escapeHtml(t('shell.account'))}">
                  <span data-shell-avatar class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-paper2 text-[12px] font-semibold text-ink">${escapeHtml(initials(session))}</span>
                  <span class="hidden max-w-[10rem] flex-col items-start text-left leading-tight md:flex">
                    <span data-shell-account-email class="max-w-full truncate text-[13px] font-medium text-ink">${escapeHtml(session?.user?.email || t('shell.account'))}</span>
                    <span data-shell-account-role class="text-[11px] text-ink/45">${escapeHtml(t(cfg.roleKey))}</span>
                  </span>
                  ${icon('chevron', 'h-4 w-4')}
                </summary>
                <div class="absolute right-0 mt-2 w-72 rounded-xl border border-rule bg-white p-3 shadow-[0_18px_60px_-24px_rgba(26,26,26,.35)]">
                  <div class="border-b border-rule px-2 pb-3">
                    <div data-shell-account-email-detail class="text-[13px] font-medium">${escapeHtml(session?.user?.email || t('shell.account'))}</div>
                    <div data-shell-account-role-detail class="mt-1 text-[12px] text-ink/50">${escapeHtml(t(cfg.roleKey))}</div>
                  </div>
                  <button type="button" data-shell-signout class="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-paper2 hover:text-sienna transition-colors">
                    ${icon('user', 'h-4 w-4')}
                    <span data-i18n="nav.logout">${escapeHtml(t('nav.logout'))}</span>
                  </button>
                </div>
              </details>
            </div>
          </div>
        </header>

        <main class="isolate flex-1 min-w-0">
          <div id="view-root" class="mx-auto w-full max-w-[1440px] px-4 py-6 lg:px-6 lg:py-8"></div>
        </main>
        ${cfg.footerKey ? `
        <footer class="no-print border-t border-rule bg-white">
          <div class="mx-auto w-full max-w-[1440px] px-4 py-4 lg:px-6 text-[12.5px] text-ink/45" data-i18n="${cfg.footerKey}">${escapeHtml(t(cfg.footerKey))}</div>
        </footer>` : ''}
      </div>
    </div>
  `;

  const overlay = shell.querySelector('[data-shell-overlay]');
  const sidebar = shell.querySelector('[data-shell-sidebar]');
  const topbar = shell.querySelector('[data-shell-topbar]');
  const navList = shell.querySelector('[data-shell-nav]');
  const breadcrumbs = shell.querySelector('[data-shell-breadcrumbs]');
  const collapseButtons = [
    shell.querySelector('[data-shell-collapse]'),
    shell.querySelector('[data-shell-collapse-footer]'),
    shell.querySelector('[data-shell-toggle-collapse]'),
  ].filter(Boolean);
  const mobileButton = shell.querySelector('[data-shell-mobile-menu]');
  const mobileCloseButton = shell.querySelector('[data-shell-toggle-mobile]');
  const signOutButton = shell.querySelector('[data-shell-signout]');
  const settingsDetails = shell.querySelector('[data-shell-settings]');
  const accountDetails = shell.querySelector('[data-shell-account]');
  const notificationsDetails = shell.querySelector('[data-shell-notifications]');
  const langSlot = shell.querySelector('[data-lang-slot]');
  const contentRoot = shell.querySelector('#view-root');

  const navRefs = cfg.navItems.filter(item => canSeeNavItem(item, session)).map(item => {
    const a = document.createElement('a');
    a.href = `#${item.href}`;
    a.dataset.shellNav = item.key;
    a.dataset.prefetchKey = item.prefetchKey || '';
    a.className = 'shell-nav-link group flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[14px] font-medium text-ink/75 transition-colors hover:bg-paper2 hover:text-sienna';
    a.innerHTML = `
      <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-paper2 text-ink/70 transition-colors group-hover:bg-white group-hover:text-sienna">${icon(item.icon, 'h-5 w-5')}</span>
      <span class="shell-nav-label min-w-0 flex-1 truncate">${escapeHtml(t(item.labelKey))}</span>
      ${item.badge?.type === 'dot' ? `<span class="shell-nav-badge inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-${item.badge.tone || 'leaf'}" aria-hidden="true"></span>` : ''}
    `;
    a.addEventListener('pointerenter', () => item.prefetchKey && onPrefetchRoute(item.prefetchKey));
    a.addEventListener('focus', () => item.prefetchKey && onPrefetchRoute(item.prefetchKey));
    a.addEventListener('click', () => closeMobileMenu());
    navList.appendChild(a);
    return { item, el: a, labelEl: a.querySelector('.shell-nav-label') };
  });

  function setCollapsed(value) {
    shell.dataset.collapsed = String(value);
    writeCollapsedState(cfg.storageKey, value);
    collapseButtons.forEach(btn => {
      const label = value ? t('shell.sidebar_expand') : t('shell.sidebar_collapse');
      btn.setAttribute('aria-pressed', String(value));
      btn.setAttribute('aria-label', label);
      btn.title = label;
      const iconSlot = btn.querySelector('.shell-collapse-icon');
      if (iconSlot) iconSlot.innerHTML = icon(value ? 'expand' : 'collapse', 'h-4 w-4');
      const textSlot = btn.querySelector('.shell-collapse-copy');
      if (textSlot) textSlot.textContent = label;
    });
    navRefs.forEach(ref => {
      if (value) ref.el.title = t(ref.item.labelKey);
      else ref.el.removeAttribute('title');
    });
  }

  function openMobileMenu() {
    shell.dataset.mobileOpen = 'true';
    mobileButton?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    shell.dataset.mobileOpen = 'false';
    mobileButton?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function toggleMobileMenu() {
    if (shell.dataset.mobileOpen === 'true') closeMobileMenu(); else openMobileMenu();
  }

  function closeDetails() {
    [settingsDetails, accountDetails, notificationsDetails].forEach(details => details?.removeAttribute('open'));
  }

  function syncChrome() {
    const path = normalizePath();
    const hidden = isHiddenRoute(path);
    shell.dataset.chromeless = String(hidden);
    sidebar.hidden = hidden;
    topbar.hidden = hidden;
    if (overlay) overlay.hidden = hidden;
    if (hidden) {
      closeMobileMenu();
      return;
    }

    if (window.innerWidth >= 1024) closeMobileMenu();

    const section = currentSection(path);
    const activeNav = navRefs.find(ref => matchesNav(ref.item, path));

    const isCollapsed = shell.dataset.collapsed === 'true';
    navRefs.forEach(ref => {
      const isActive = matchesNav(ref.item, path);
      if (isActive) ref.el.setAttribute('aria-current', 'page');
      else ref.el.removeAttribute('aria-current');
      ref.el.classList.toggle('bg-paper2', isActive);
      ref.el.classList.toggle('text-sienna', isActive);
      ref.el.classList.toggle('ring-1', isActive);
      ref.el.classList.toggle('ring-sienna/15', isActive);
      // Tooltip only when the label is hidden; when expanded the visible text suffices.
      if (isCollapsed) ref.el.title = t(ref.item.labelKey);
      else ref.el.removeAttribute('title');
      if (ref.labelEl) ref.labelEl.textContent = t(ref.item.labelKey);
    });

    breadcrumbs.innerHTML = buildBreadcrumbs(path, section);

    const accountSummary = accountDetails?.querySelector('[data-shell-account-email]');
    if (accountSummary) {
      accountSummary.textContent = session?.user?.email || t('shell.account');
    }

    const roleLabel = accountDetails?.querySelector('[data-shell-account-role]');
    if (roleLabel) roleLabel.textContent = t(cfg.roleKey);
    const roleDetail = accountDetails?.querySelector('[data-shell-account-role-detail]');
    if (roleDetail) roleDetail.textContent = t(cfg.roleKey);

    const notificationsLabel = notificationsDetails?.querySelector('[data-shell-notifications-label]');
    if (notificationsLabel) notificationsLabel.textContent = t('shell.notifications');

    const settingsLabel = settingsDetails?.querySelector('[data-shell-settings-label]');
    if (settingsLabel) settingsLabel.textContent = t('shell.settings');

    if (!activeNav && navRefs.length) {
      breadcrumbs.innerHTML = buildBreadcrumbs(path, section, navRefs[0].item);
    }
  }

  function buildBreadcrumbs(path, section, fallbackSection = section) {
    const crumbs = [
      { label: t(cfg.brandKey), href: cfg.homeHref },
      { label: t(fallbackSection.labelKey), href: fallbackSection.href },
    ];
    const detailLabel = cfg.crumbLabelForPath(path);
    if (detailLabel) crumbs.push({ label: detailLabel, href: null });
    return crumbs.map((crumb, index) => {
      const isLast = index === crumbs.length - 1;
      if (!crumb.href || isLast) {
        return `<span class="truncate ${isLast ? 'text-ink/80 font-medium' : ''}">${escapeHtml(crumb.label)}</span>`;
      }
      return `<a href="#${crumb.href}" class="truncate hover:text-sienna">${escapeHtml(crumb.label)}</a>`;
    }).join(`<span class="text-ink/35">/</span>`);
  }

  collapseButtons.forEach(button => button.addEventListener('click', () => setCollapsed(shell.dataset.collapsed !== 'true')));
  mobileButton?.addEventListener('click', toggleMobileMenu);
  mobileCloseButton?.addEventListener('click', closeMobileMenu);
  overlay?.addEventListener('click', closeMobileMenu);
  signOutButton?.addEventListener('click', () => onLogout());
  shell.addEventListener('click', event => {
    if (!event.target.closest('details[data-shell-notifications], details[data-shell-settings], details[data-shell-account]')) {
      closeDetails();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeMobileMenu();
      closeDetails();
    }
  });
  window.addEventListener('resize', syncChrome);
  window.addEventListener('hashchange', syncChrome);
  onLangChange(() => {
    applyStaticI18n(shell);
    setCollapsed(shell.dataset.collapsed === 'true');
    syncChrome();
  });

  setCollapsed(collapsed);
  container.replaceChildren(shell);
  syncChrome();

  return {
    session,
    contentRoot,
    langSlot,
    syncChrome,
    setSession(nextSession) {
      session = nextSession;
      const initialsSlot = accountDetails?.querySelector('[data-shell-avatar]');
      if (initialsSlot) initialsSlot.textContent = initials(session);
      const emailText = accountDetails?.querySelector('[data-shell-account-email]');
      if (emailText) emailText.textContent = session?.user?.email || t('shell.account');
      syncChrome();
    },
  };
}