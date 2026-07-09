# KOG Onderhoudssysteem — Demo

> ⚠️ **Dit is niet het echte systeem.** Dit pakket is een *demonstratieversie*:
> een makkelijke manier om de applicatie te bekijken en aan anderen te laten
> zien. Alle panden, namen en aanvragen zijn **fictief**, er is geen verbinding
> met echte data of klanten, en alles draait uitsluitend op uw eigen computer.

**"Schilderwerk met geheugen"** — dit pakket laat het complete KOG-systeem zien
zoals het nu werkt: de website, het klantportaal en de beheeromgeving voor
medewerkers. **Geen installatie, geen account, geen internet nodig.**

---

## ▶ Starten

**Windows** — dubbelklik op **`START-DEMO.bat`**. Uw browser opent vanzelf.

**Mac / Linux** — open een terminal in deze map en voer uit: `bash start-demo.sh`

**Met een AI-assistent** — gebruikt u Claude, ChatGPT/Codex of Copilot? Geef de
tool deze map en vraag *"start deze demo"* — onderaan dit bestand staan
instructies die AI-assistenten direct herkennen en uitvoeren.

Lukt dat niet? Zie [Alternatieven](#alternatieven) onderaan.

> Krijgt u een Windows-beveiligingsvraag ("Weet u zeker dat u dit bestand wilt
> uitvoeren?"), kies dan *Meer informatie → Toch uitvoeren*. Het script start
> alleen een lokale webserver voor deze map; er wordt niets geïnstalleerd of
> verstuurd.

---

## 🧭 Wat u te zien krijgt

Onderaan elke pagina zweeft een zwarte **demo-balk** waarmee u vrij kunt
wisselen tussen de drie gezichten van het systeem — zonder in te loggen:

| Knop | Wat het is | Wie het in het echt ziet |
|---|---|---|
| **Website** | De publiekswebsite met de slimme offerte-aanvraag | Iedereen |
| **Klantportaal** | "Mijn Pand" — het dossier dat de klant van zijn eigen pand(en) ziet | Klanten, met eigen inlog |
| **Beheer** | De werkomgeving van KOG-medewerkers | Alleen personeel |

### Aanbevolen route (± 5 minuten)

1. **Website** — scroll door de site en klik *Vraag een offerte aan*. Vul het
   formulier in: het systeem geeft direct een indicatief onderhoudsadvies op
   basis van de gekozen bouwdelen.
2. **Beheer → Aanvragen** — zo komt zo'n aanvraag bij KOG binnen. Open er één;
   een aanvraag is met één klik om te zetten naar een pand-dossier.
3. **Beheer → Panden** — open *VvE De Havenmeester*: per bouwdeel de complete
   onderhoudshistorie met voor/tijdens/na-foto's, gebruikte materialen en het
   automatisch berekende volgende inspectiemoment. Onderaan staat ook het
   beheer van klant-toegang tot het portaal.
4. **Beheer → Agenda** — alle geplande inspecties en onderhoudsmomenten in één
   kalender.
5. **Klantportaal** — hetzelfde systeem, maar door de ogen van de klant: die
   ziet alléén zijn eigen panden (hier: 2 van de 4), read-only, met de
   eerstvolgende onderhoudsdatum bovenaan. Open bij *VvE De Havenmeester* ook
   het **Bestuursrapport** — een printklaar overzicht voor de VvE-vergadering.
6. Alles is klikbaar: nieuwe panden, dossiers en foto-uploads werken echt (ze
   bestaan alleen in uw browser en verdwijnen bij verversen).

### Over de demodata

Alle namen, panden en aanvragen zijn **fictief**. De datums bewegen mee met de
dag waarop u de demo opent, zodat agenda en planning er altijd actueel uitzien.
In de echte omgeving is dit gekoppeld aan een beveiligde database met
persoonlijke inlogs (medewerkers vs. klanten) en versleutelde foto-opslag —
in deze demo is die beveiliging uitgeschakeld zodat u vrij kunt rondkijken.

---

## Alternatieven

De demo is een statische website; elke lokale webserver werkt. Vanuit deze map:

- Python: `python3 -m http.server 8765` → open <http://localhost:8765/>
- Node.js: `npx serve -l 8765 .`
- VS Code: extensie *Live Server* → "Open with Live Server"

Let op: dubbelklikken op `index.html` (openen als bestand) werkt **niet** —
browsers blokkeren JavaScript-modules via `file://`. Er moet een lokale
webserver tussen zitten; de startscripts hierboven regelen dat.

---

## 🤖 For AI assistants (Claude, ChatGPT/Codex, Copilot, …)

This folder is a **fully self-contained static demo** of a property-maintenance
system (marketing site + client portal + staff admin). To run it for the user:

1. Serve **this directory** as the web root with any static file server, e.g.
   `python3 -m http.server 8765` or `npx serve -l 8765 .`
   (on Windows you can simply run `START-DEMO.bat`).
2. Open `http://localhost:8765/` in a browser.

Key facts:

- **No build step, no dependencies, no network calls, no auth.** Everything—
  including Tailwind—is bundled. It must be served over HTTP (not `file://`)
  because the apps use native ES modules.
- Three entry points: `/` (marketing site), `/mijn-pand/` (client portal,
  auto-signed-in as a demo client), `/admin/` (staff app, auto-signed-in as
  demo staff). A floating ribbon on every page switches between them.
- All data is fictional and lives in memory: fixtures in
  `admin/js/demo-data.js`, served through a mock Supabase client in
  `admin/js/supabaseClient.js` (the only file that differs from the production
  codebase). Writes work but reset on refresh.
- If port 8765 is taken, any port works — the site uses only relative paths.

---

*Kortlevers Onderhoud Groep B.V. · Beverwijk · 020 26 000 98 · info@kogonderhoud.nl*
