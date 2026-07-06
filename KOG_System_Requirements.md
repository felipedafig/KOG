# KOG — System Requirements & Build Guide

**"Painting work with memory."**
From website to digital maintenance platform for construction & painting works.

> Companion to `KOG_Website_USP_Strategy_English.pdf`. That document explains the *idea and the USP*. **This document explains the *system*** — what it must contain, how the pieces fit, and how it stays simple to use while doing all of it.

---

## 1. What the system actually is (in one paragraph)

KOG is not building a brochure website. It is building a **property maintenance record system with a website on the front**. A visitor sees a normal, attractive contractor site (services, projects, contact). Behind it, every project a visitor becomes a client on gets a permanent file: what was painted or repaired, on which building component, with which materials, with before/after photos, and when the *next* maintenance is due. The website's job is to **win the client**; the system's job is to **keep the client** by staying useful long after the job is finished.

**One rule that decides every design choice:**
> The public site must feel like a simple contractor website. The "memory" (files, history, planning) lives *behind a login* and only appears when it adds value. Never make a first-time visitor navigate the maintenance system.

---

## 2. Who uses it (the three audiences)

| Audience | What they want | What they see |
|---|---|---|
| **Public visitor** (private homeowner) | Trust, proof, easy quote request | Public marketing site + smart quote form |
| **Client** (homeowner, business, owners association board) | Overview of their property, history, next maintenance | "My Property" login area |
| **KOG staff / admin** | Manage projects, log work, generate advice, follow up | Internal dashboard |

Design each audience its **own front door**. Do not merge them into one menu.

---

## 3. The system in modules

The system is best understood as **6 modules**. Modules 1–2 are the public website. Modules 3–6 are the "memory." Build them in that order.

### Module 1 — Public marketing site *(the hook)*
The part that looks like a normal contractor website — but the very first screen states the USP.

- **Hero** with the USP up front (not at the bottom): *"Painting work with memory."*
- **Services** (painting, repair, renovation, facade, wood rot, etc.)
- **Project gallery** with a **before/after slider** and a **filter** (painting / renovation / private / business / owners association).
- **About / craftsmanship / trust** section.
- **Contact + smart quote form** (Module 2).

*Business value:* converts a cold visitor into a lead, and immediately signals "we are a maintenance partner, not just a painter."

### Module 2 — Smart quote form *(the intake)*
A guided form that is faster and more concrete than "send us an email."

- Property type (home / business / owners association complex).
- Building component(s) needing work.
- **Photo upload** (visitor uploads pictures of the problem).
- Preferred timing + details.
- Optional: an **indicative maintenance advice** result on submit ("based on what you describe, an inspection is sensible within X").

*Business value:* better leads, less back-and-forth, and it starts building the property file **before** the client even signs.

### Module 3 — The Property File *(the core / the "memory")*
This is the heart of the system. Every property is a record; every record holds a history that never gets deleted.

**Data model — one Property has many Building Components; each Component has many Maintenance Entries:**

```
PROPERTY
  ├─ name / address / type (home | business | owners association)
  ├─ owner / contact
  └─ BUILDING COMPONENT  (frames, facade, balcony, stairwell, fascia board, doors …)
        └─ MAINTENANCE ENTRY  (one per job/inspection)
              ├─ date carried out
              ├─ work done / findings (wood rot, open joints, moisture, cracks, damage)
              ├─ materials used (paint brand, system, coating type)
              ├─ photos (before / during / after)
              ├─ handover notes
              ├─ status (planned | quoted | in progress | completed | inspection needed)
              ├─ next inspection date   (auto-calculated)
              └─ next maintenance advice (auto-calculated from interval)
```

*Business value:* this is the proof of quality **and** the reason the client stays. Everything else is a view on top of this data.

### Module 4 — Maintenance calendar & advice engine *(the retention engine)*
Simple rules on top of the Property File — **no AI needed**.

- Each component/material type has a typical **maintenance interval** (e.g. exterior paint ≈ every N years).
- The system takes `last maintenance date + interval` → produces **next inspection date** and **next advice moment** automatically.
- Feeds a **maintenance calendar** and, later, automatic reminders ("time to inspect the facade").

*Business value:* **recurring revenue.** KOG contacts the client at exactly the right moment instead of waiting for damage.

### Module 5 — "My Property" client area *(the login)*
A clean, read-mostly view where a client logs in and sees only *their* property.

- Their property, components, history, photos.
- Status and next maintenance moment shown clearly ("Next inspection: recommended around …").
- Download / view handover reports.
- Keep it **read-only and simple in v1** — clients look, they don't manage.

*Business value:* the ongoing reason to stay connected — the client keeps a login they actually use.

### Module 6 — Owners-association dashboard *(the high-value B2B layer)*
An extended view of Module 5 for boards and property managers who manage a **complex** with many components and phases.

- Status/planning **per building component, phase, or complex**.
- Reporting they can show to their members ("here is what was done, here is what's next, here are the costs coming").

*Business value:* owners associations and property managers are the highest-value, most-recurring clients — they *require* files, planning and reporting, which competitors rarely provide.

---

## 4. How it stays easy to navigate (the part that matters most)

A system this capable usually becomes cluttered. It won't here **if these rules hold:**

1. **Two worlds, one door each.**
   Public site (no login) and "My Property" (login). A visitor should never bump into the maintenance system. A client should never have to scroll the marketing site to find their file. One clear "Login / My Property" button is the only bridge.

2. **The public menu stays short.** Home · Projects · Services · About · Contact. That's it. Everything "smart" is either inside the quote form or behind login.

3. **Progressive disclosure.** Show the property first → click a component → then see its history. Never show the full data model on one screen. Most users only need "what's my status and when's the next maintenance."

4. **Status is a color, not a paragraph.** Planned / In progress / Completed / Inspection needed → a colored badge. A client understands their situation in one glance.

5. **Staff enter data; clients only read it.** All the "complex" input (materials, findings, dates) is in the internal admin. The client-facing views are simple summaries. This keeps the client side effortless *and* the admin side powerful.

6. **The file fills itself.** Because staff log each job as normal work, the history, calendar and advice are generated automatically. Nobody maintains a separate database — that's what kills these systems.

---

## 5. Build order (don't build it all at once)

The strategy PDF says it well: *v1 does not need to be fully complex, but the design must already account for the file.* Suggested phasing:

| Phase | Ship | Why first |
|---|---|---|
| **Phase 1 — Website that converts** | Modules 1 & 2 (marketing site + smart quote form with photo upload) | Immediate business value; wins leads; states the USP. Build the data model *underneath* even if not shown yet. |
| **Phase 2 — The memory** | Module 3 (Property File) + basic staff admin to log work | Turns finished jobs into records. This is the actual differentiator. |
| **Phase 3 — Retention** | Modules 4 & 5 (calendar/advice + "My Property" client login) | Starts the recurring-contact loop. Clients get a reason to come back. |
| **Phase 4 — B2B** | Module 6 (owners-association dashboard + reporting) | Unlocks the highest-value clients once the core is proven. |

**Critical:** design the database and page structure in Phase 1 *as if* all four phases exist. Retro-fitting the property file into a brochure site later is the expensive mistake.

---

## 6. Function → business value (quick reference)

| Function | What it does | Why the business wants it |
|---|---|---|
| USP hero | States "painting with memory" in the first screen | Positions KOG as a maintenance partner, not a painter |
| Before/after slider | Visual proof | Sells quality without words |
| Project filter | Visitor finds relevant work | Faster trust for their specific need |
| Smart quote + photo upload | Guided, concrete intake | Better leads, less admin, file starts early |
| Property File | Permanent per-property history | Proof of quality + the reason clients stay |
| Maintenance calendar/advice | Auto next-inspection dates | **Recurring revenue** — contact at the right moment |
| "My Property" login | Client sees their own file | Ongoing engagement after the job ends |
| Owners-association dashboard | Status/planning/reporting per complex | Wins & keeps the highest-value B2B clients |

---

## 7. The one-line summary for the build team

> Build a **short, trustworthy contractor website** on the front, and a **simple permanent maintenance file** on the back. The website wins the client; the file keeps them. Keep the two worlds separate, let staff fill the file as a by-product of normal work, and show clients only a clean status-and-calendar view. The complexity lives in the data, never in the navigation.
