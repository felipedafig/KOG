import { supabase } from './supabaseClient.js';

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  await supabase.auth.signOut();
}

// Shows the login view until a STAFF session exists, then shows the app and calls
// onReady(). Re-runs automatically on sign-in/sign-out (e.g. session expiry), so staff
// are never stuck on a broken view — they just see the login screen again.
// Non-staff sessions (client portal accounts) are refused with a clear message and
// signed out; RLS is the real boundary, this just prevents an empty, confusing admin.
let refusedMessage = null;

export function guard(onReady) {
  const loginView = document.getElementById('login-view');
  const appView = document.getElementById('app-view');

  async function render() {
    const session = await getSession();
    if (session && session.user?.app_metadata?.user_role !== 'staff') {
      refusedMessage = 'Dit account heeft geen toegang tot KOG Beheer. Ga naar Mijn Pand om uw pand te bekijken.';
      await signOut(); // triggers onAuthStateChange -> render() again, message survives via the module flag
      return;
    }
    if (session) {
      loginView.classList.add('hidden');
      appView.classList.remove('hidden');
      onReady(session);
    } else {
      appView.classList.add('hidden');
      loginView.classList.remove('hidden');
      if (refusedMessage) {
        const errorBox = document.getElementById('login-error');
        if (errorBox) {
          errorBox.textContent = refusedMessage;
          errorBox.classList.remove('hidden');
        }
        refusedMessage = null;
      }
    }
  }

  supabase.auth.onAuthStateChange(() => render());
  render();
}
