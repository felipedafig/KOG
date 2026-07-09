# Deploying KOG to a VPS

The site is fully static (zero-build ES modules; all vendor scripts self-hosted
in `kog-website/assets/vendor/`) and talks only to the Supabase project
`zhiifaeqwrowmjqemgnl`. Deployment = copy `kog-website/` to a web root behind
Caddy, which handles HTTPS automatically.

## Prerequisites

- A VPS running Ubuntu or Debian, reachable as root (or a sudo user) over SSH.
- A domain or subdomain (e.g. `demo.kogonderhoud.nl`) with an **A record
  pointing at the VPS IP**. HTTPS is mandatory — the portal is a login-protected
  app and the quote form uploads photos.
  - No domain available? `<VPS-IP>.sslip.io` (e.g. `203.0.113.7.sslip.io`)
    usually works with Let's Encrypt, but it's a shared domain subject to
    shared rate limits — a real subdomain is more reliable.

## Steps (from the repo root, Git Bash on Windows)

```bash
# 1. One-time server setup: installs Caddy, writes the site config, opens the firewall
ssh root@YOUR_VPS 'DOMAIN=demo.example.com bash -s' < deploy/setup-vps.sh

# 2. Upload the site (re-run this for every update; atomic swap with rollback copy)
./deploy/deploy.sh root@YOUR_VPS
```

Then open `https://demo.example.com` — Caddy fetches the certificate on the
first request (DNS must already resolve).

## URLs on the deployed site

- `/` — marketing site with the public quote form
- `/mijn-pand/` — the single login front door (staff are auto-redirected to
  `/admin/` after signing in; clients stay in the portal)
- `/admin/` — staff app (no login form; bounces non-staff sessions to `/mijn-pand/`)

## Supabase notes

- The anon key in `admin/js/supabaseClient.js` is public by design; RLS
  enforces all access rules.
- The `create-client-account` edge function has a local update
  (`kog-website/supabase/functions/create-client-account/index.ts`) that must be
  redeployed via the Supabase management API / CLI (needs the account access
  token). The currently deployed version still works with the new frontend —
  redeploy when convenient.
- `robots.txt` currently disallows all crawling (demo phase). Loosen it at real
  launch.

## Not yet production-grade (known, deliberate — see punch list memory)

No SMTP/email flows, no CAPTCHA on the public quote form, single Supabase
project for dev+prod, test data still present. Fine for a demo link; revisit
before real launch.
