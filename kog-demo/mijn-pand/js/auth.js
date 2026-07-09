import { supabase } from '../../admin/js/supabaseClient.js';
import { route, startRouter, refresh } from '../../admin/js/router.js';
import { t, onLangChange, mountLangPicker } from '../../admin/js/i18n.js';
import { mountAppShell } from '../../admin/js/app-shell.js';
import { renderHome, renderProperty, renderComponent } from './portal.js';
import { renderRapport } from './vve.js';

// Same shell as the admin app, dressed for the client portal: one nav item,
// "Mijn Pand" branding, client role label, and the contact footer.
const SHELL_CONFIG = {
  storageKey: 'kog_portal_sidebar_collapsed',
  brandKey: 'header.brand',
  subtitleKey: 'shell.portal_subtitle',
  roleKey: 'shell.role_client',
  homeHref: '/',
  footerKey: 'footer.contact',
  navItems: [
    { key: 'home', labelKey: 'nav.portal_home', href: '/', exact: false, icon: 'building', roles: ['client'] },
  ],
  crumbLabelForPath: path => {
    if (/^\/property\/[^/]+\/component\//.test(path)) return t('shell.breadcrumb_component');
    if (/^\/property\/[^/]+\/rapport$/.test(path)) return t('shell.breadcrumb_rapport');
    if (path.startsWith('/property/')) return t('shell.breadcrumb_detail');
    return null;
  },
};

// Portal guard. Order matters:
//   no session                       -> login view
//   staff session                    -> redirect to the admin app
//   client with must_change_password -> forced change-password view
//   client                           -> app
//   any other authenticated user     -> sign out + "geen toegang"
// (must_change_password is UX, not a security boundary — RLS scopes all data.)

const views = ['login-view', 'pwchange-view', 'app-view'];
function show(id) {
  views.forEach(v => document.getElementById(v).classList.toggle('hidden', v !== id));
}

let started = false;
let triedRefresh = false;
let shell = null;

async function render() {
  try {
    let { data: { session } } = await supabase.auth.getSession();

    if (!session) { show('login-view'); return; }

    let role = session.user?.app_metadata?.user_role;
    if (!role && !triedRefresh) {
      // Token minted before the role system existed — one refresh picks up the claim.
      triedRefresh = true;
      const { data } = await supabase.auth.refreshSession();
      session = data?.session;
      role = session?.user?.app_metadata?.user_role;
      if (!session) { show('login-view'); return; }
    }

    if (role === 'staff') { location.replace('../admin/'); return; }
    if (role !== 'client') {
      try { await supabase.auth.signOut(); } catch { /* still show login below */ }
      const errorBox = document.getElementById('login-error');
      errorBox.textContent = t('auth.no_access');
      errorBox.classList.remove('hidden');
      show('login-view');
      return;
    }

    if (session.user?.user_metadata?.must_change_password) { show('pwchange-view'); return; }

    show('app-view');
    if (!shell) {
      shell = mountAppShell(document.getElementById('app-view'), {
        session,
        onLogout: () => supabase.auth.signOut(),
        config: SHELL_CONFIG,
      });
      mountLangPicker(shell.langSlot);
    } else {
      shell.setSession(session);
    }
    if (!started) {
      started = true;
      startRouter();
    }
  } catch (err) {
    // Whatever happens, never leave the page blank.
    console.error('Portal render failed:', err);
    show('login-view');
  }
}

export function initPortal() {
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const errorBox = document.getElementById('login-error');
    errorBox.classList.add('hidden');
    const { error } = await supabase.auth.signInWithPassword({
      email: document.getElementById('login-email').value.trim(),
      password: document.getElementById('login-password').value,
    });
    if (error) {
      errorBox.textContent = t('auth.login_failed');
      errorBox.classList.remove('hidden');
    }
  });

  document.getElementById('pwchange-form').addEventListener('submit', async e => {
    e.preventDefault();
    const errorBox = document.getElementById('pwchange-error');
    errorBox.classList.add('hidden');
    const pw = document.getElementById('pw-new').value;
    const confirm = document.getElementById('pw-confirm').value;
    if (pw !== confirm) {
      errorBox.textContent = t('auth.pw_mismatch');
      errorBox.classList.remove('hidden');
      return;
    }
    const { error } = await supabase.auth.updateUser({
      password: pw,
      data: { must_change_password: false },
    });
    if (error) {
      errorBox.textContent = error.message.includes('different from the old')
        ? t('auth.pw_same_as_temp')
        : t('auth.save_failed', { msg: error.message });
      errorBox.classList.remove('hidden');
      return;
    }
    render();
  });

  // Logout lives in the shell's account menu (onLogout above).
  const root = () => document.getElementById('view-root');
  route('/', () => renderHome(root()));
  route('/property/:id', ({ id }) => renderProperty(root(), id));
  route('/property/:pid/component/:cid', ({ pid, cid }) => renderComponent(root(), pid, cid));
  route('/property/:id/rapport', ({ id }) => renderRapport(root(), id));

  // Re-render the active view (if any) with the new language; harmless no-op
  // before the router has started (e.g. while still on the login screen).
  onLangChange(() => { if (started) refresh(); });

  // setTimeout defers render() out of the auth callback: awaiting supabase.auth
  // methods inside onAuthStateChange deadlocks against the client's init lock
  // when a persisted session exists at page load.
  supabase.auth.onAuthStateChange(() => setTimeout(render, 0));
  render();
}
