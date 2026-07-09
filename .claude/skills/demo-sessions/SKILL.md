---
name: demo-sessions
description: Prepare three isolated browser sessions of the KOG site (one staff/admin + two independent client sessions) for demos and testing. Use when the user wants to run the demo, test the admin and client portal side by side, or sign in with multiple accounts at once.
---

# KOG demo sessions — three isolated logins

Make sure the local KOG site is running, then hand the user three URLs to open in their **own** normal Chrome tabs. The three tabs do **not** share logins, so the user can be signed in as staff and as clients simultaneously.

IMPORTANT (user preference, 2026-07-09): the user wants these in their OWN regular Google Chrome tabs, NOT Claude-controlled MCP tabs. Do NOT create MCP tabs (`tabs_create_mcp`) or drive the browser by default — just give them the URLs to open themselves. Only use the Chrome automation tools if the user explicitly asks Claude to open/verify the tabs.

## How the isolation works (do not "simplify" this away)

Browser storage (cookies, localStorage — and therefore Supabase auth sessions) is **per-origin**, not per-tab. Two tabs on the same origin mirror one session. So each tab uses a different loopback address for the *same* server — this works in any normal Chrome tab, no MCP/automation needed:

| Tab | URL | Intended use |
|-----|-----|--------------|
| 1 | `http://localhost:8080/mijn-pand/` | Staff — after login it auto-redirects to `/admin/` |
| 2 | `http://127.0.0.1:8080/mijn-pand/` | Client account |
| 3 | `http://127.0.0.2:8080/mijn-pand/` | Second client / spare session |

All logins happen at `/mijn-pand/` (single login page by design). `/admin/` has no login form — anyone without a staff session there is redirected back to `mijn-pand`. `127.0.0.2` is a normal Windows loopback address; it needs no configuration.

## Steps

1. **Server** — check whether the KOG site is already up:
   - `curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8080/mijn-pand/` → if `200`, reuse it.
   - If port 8080 is busy with something else, use 8081 (and substitute the port everywhere below).
   - Otherwise start it in the background from the project root: `npx serve -l 8080 kog-website`
   - Do NOT use port 3000 — that is an unrelated project (Propela Therapy Next.js) that is often running on this machine.
   - Verify all three hosts return 200: repeat the curl for `localhost`, `127.0.0.1`, `127.0.0.2`.

2. **Hand off** — give the user the three URLs (table above) to open in their own Chrome tabs, one per tab, and note which seat is which. Tell them the logins stay independent because each address is a separate origin. Do not open the tabs yourself.

3. **Report** — remind them all sign-ins happen at the `/mijn-pand/` page. Test accounts (passwords deliberately not stored here — this repo is on GitHub):
   - Staff: `delanowitbraad@outlook.com`
   - Test client: `kogtestclient1@example.com` (linked to "VvE Testcomplex De Haven"; also linked to a second property "Woonhuis Andere Klant")

## Gotcha — Chrome forcing HTTPS on localhost

If the user reports the pages won't load (connection error, or it jumps to `https://`), Chrome's **"Always use secure connections"** setting is force-upgrading `http://`. The KOG server is plain HTTP, so the page can never load. This is a browser setting only the user can change: `chrome://settings/security` → turn off "Always use secure connections" (or exempt these addresses). If it's already off, an extension (HTTPS enforcer, ad-blocker, antivirus guard) is doing it. As of 2026-07-09 the user disabled this and the sites load fine.

The user signs in themselves unless they explicitly hand over credentials in chat. Leave the serve process running when done — the user will be demoing.
