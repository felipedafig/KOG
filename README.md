# KOG

Kortlevers Onderhoud Groep — "Schilderwerk met geheugen" / "Painting work with memory."

A property-maintenance record system with a marketing website on the front:

- `kog-website/` — public marketing site (single-file, zero-build: Tailwind + vanilla JS, NL/EN, all vendor scripts self-hosted) with a smart quote form that persists to Supabase.
- `kog-website/admin/` — staff admin app (ES modules, no bundler): quote inbox, property files (properties → building components → maintenance entries with before/during/after photos).
- `kog-website/supabase/` — migrations for the Supabase backend (Postgres + Auth + Storage, RLS-secured).
- `KOG_System_Requirements.md` — the system requirements & build guide (6 modules, 4 phases).

Local dev: `npx serve kog-website` (the admin app uses native ES modules, so it needs http, not `file://`).

Deployment: static hosting behind Caddy — see `deploy/README.md` (one-time `deploy/setup-vps.sh` on the VPS, then `deploy/deploy.sh user@host` for every update).
