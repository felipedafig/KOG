// Minimal hash router. Routes are registered as "/quotes", "/properties/:id" etc.
// The matched handler receives (params) and is responsible for rendering into #view-root.
// Shared with mijn-pand/ (imported cross-folder) — keep free of admin-specific behavior.
const routes = [];

export function route(pattern, handler) {
  const paramNames = [];
  const regex = new RegExp(
    '^' + pattern.replace(/:([^/]+)/g, (_, name) => { paramNames.push(name); return '([^/]+)'; }) + '$'
  );
  routes.push({ regex, paramNames, handler });
}

export function navigate(path) {
  location.hash = '#' + path;
}

function resolve() {
  const path = (location.hash || '#/').slice(1) || '/';
  for (const r of routes) {
    const m = path.match(r.regex);
    if (m) {
      const params = {};
      r.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); });
      r.handler(params);
      return;
    }
  }
  // No match — fall back to the first registered route (the app's default view).
  if (routes.length) routes[0].handler({});
}

export function startRouter() {
  window.addEventListener('hashchange', resolve);
  resolve();
}
