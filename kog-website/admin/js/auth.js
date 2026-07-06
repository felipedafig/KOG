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

// Shows the login view until a session exists, then shows the app and calls onReady().
// Re-runs automatically on sign-in/sign-out (e.g. session expiry), so staff are never
// stuck on a broken view — they just see the login screen again.
export function guard(onReady) {
  const loginView = document.getElementById('login-view');
  const appView = document.getElementById('app-view');

  async function render() {
    const session = await getSession();
    if (session) {
      loginView.classList.add('hidden');
      appView.classList.remove('hidden');
      onReady(session);
    } else {
      appView.classList.add('hidden');
      loginView.classList.remove('hidden');
    }
  }

  supabase.auth.onAuthStateChange(() => render());
  render();
}
