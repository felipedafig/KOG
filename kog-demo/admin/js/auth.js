import { supabase } from './supabaseClient.js';

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// Single-login-page model: ALL sign-ins happen on ../mijn-pand/ (the one front door).
// This guard only decides whether a staff session exists here. Anything else — no
// session, a client account, sign-out — goes to Mijn Pand, which routes every account
// to the right place. RLS remains the real security boundary.
let triedRefresh = false;

export function guard(onReady) {
  const appView = document.getElementById('app-view');

  async function render() {
    let session = await getSession();
    if (session && !session.user?.app_metadata?.user_role && !triedRefresh) {
      // Token minted before the role system existed — one refresh picks up the claim.
      triedRefresh = true;
      const { data } = await supabase.auth.refreshSession();
      session = data?.session;
    }
    if (!session || session.user?.app_metadata?.user_role !== 'staff') {
      location.replace('../mijn-pand/');
      return;
    }
    appView.classList.remove('hidden');
    onReady(session);
  }

  // setTimeout defers render() out of the auth callback: awaiting supabase.auth
  // methods inside onAuthStateChange deadlocks against the client's init lock
  // when a persisted session exists at page load.
  supabase.auth.onAuthStateChange(() => setTimeout(render, 0));
  render();
}
