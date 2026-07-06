// Shared NL/EN dictionary + language picker for admin/ and mijn-pand/.
// Shared with mijn-pand/ (imported cross-folder) — keep free of admin-specific behavior.
//
// Usage: t('some.key') or t('some.key', { name: 'X' }) for {placeholder} interpolation.
// Call onLangChange(fn) to re-render whatever the caller owns when the language changes
// (the router's refresh() covers routed views; static shell text uses applyStaticI18n()).

const STORAGE_KEY = 'kog_lang';

const DICT = {
  nl: {
    'common.loading': 'Laden…',
    'common.cancel': 'Annuleren',
    'common.save': 'Opslaan',
    'common.close': 'Sluiten',
    'common.copy': 'Kopiëren',
    'common.copied': 'Gekopieerd ✓',
    'common.save_failed': 'Opslaan mislukt.',
    'common.findings': 'Bevindingen:',
    'common.materials': 'Materialen:',
    'common.handover': 'Oplevering:',
    'common.next_inspection': 'Volgende inspectie:',

    'status.planned': 'Gepland',
    'status.quoted': 'Offerte uitgebracht',
    'status.in_progress': 'In uitvoering',
    'status.completed': 'Afgerond',
    'status.inspection_needed': 'Inspectie nodig',
    'status.none': 'Nog geen werk gelogd',
    'status.none_short': 'Nog geen werk',

    'ptype.home': 'Woonhuis',
    'ptype.business': 'Bedrijfspand',
    'ptype.vve': 'VvE-complex',

    'comp.kozijnen': 'Kozijnen',
    'comp.gevel': 'Gevel',
    'comp.balkon': 'Balkon / dakterras',
    'comp.trappenhuis': 'Trappenhuis',
    'comp.boeideel': 'Boeideel',
    'comp.deuren': 'Deuren',
    'comp.dak': 'Dak',
    'comp.overig': 'Overig',

    'phase.before': 'Vóór',
    'phase.during': 'Tijdens',
    'phase.after': 'Ná',

    'admin.brand': 'KOG Beheer',
    'nav.quotes': 'Aanvragen',
    'nav.properties': 'Panden',
    'nav.agenda': 'Agenda',
    'nav.logout': 'Uitloggen',

    'quotes.title': 'Aanvragen',
    'quotes.load_error': 'Kon aanvragen niet laden: {msg}',
    'quotes.empty': 'Nog geen aanvragen binnengekomen.',
    'quotes.status.new': 'Nieuw',
    'quotes.status.reviewed': 'Bekeken',
    'quotes.status.converted': 'Omgezet',
    'quotes.status.archived': 'Gearchiveerd',
    'quotes.back': '← Alle aanvragen',
    'quotes.not_found': 'Aanvraag niet gevonden.',
    'quotes.already_converted': 'Al omgezet naar pand',
    'quotes.convert_btn': 'Omzetten naar pand',
    'quotes.field.property_type': 'Type pand:',
    'quotes.field.components': 'Bouwdelen:',
    'quotes.field.work_type': 'Type werkzaamheid:',
    'quotes.field.location': 'Locatie:',
    'quotes.field.scope': 'Omvang:',
    'quotes.field.timing': 'Planning:',
    'quotes.field.message': 'Toelichting:',

    'properties.title': 'Panden',
    'properties.new_btn': '+ Nieuw pand',
    'properties.load_error': 'Kon panden niet laden: {msg}',
    'properties.empty': 'Nog geen panden. Klik op "+ Nieuw pand" of converteer een aanvraag.',
    'properties.back': '← Alle panden',
    'properties.not_found': 'Pand niet gevonden.',
    'properties.new_component_btn': '+ Bouwdeel',
    'properties.no_components': 'Nog geen bouwdelen voor dit pand.',
    'properties.form.title_new': 'Nieuw pand',
    'properties.form.name': 'Naam *',
    'properties.form.type': 'Type *',
    'properties.form.address': 'Adres',
    'properties.form.postcode': 'Postcode',
    'properties.form.city': 'Plaats',
    'properties.form.owner_name': 'Eigenaar / contact',
    'properties.form.owner_email': 'E-mail',
    'properties.form.owner_phone': 'Telefoon',
    'properties.form.notes': 'Notities',
    'properties.form.name_required': 'Naam is verplicht.',

    'components.form.title': 'Nieuw bouwdeel',
    'components.form.type': 'Type bouwdeel *',
    'components.form.label': 'Omschrijving (optioneel)',
    'components.form.label_placeholder': 'bijv. voorgevel noordzijde',

    'entries.new_btn': '+ Werk loggen',
    'entries.not_found': 'Bouwdeel niet gevonden.',
    'entries.empty': 'Nog geen werk gelogd voor dit bouwdeel.',
    'entries.no_date': 'Nog geen datum',
    'entries.no_description': '(geen omschrijving)',
    'entries.form.title': 'Werk loggen',
    'entries.form.date': 'Datum uitgevoerd',
    'entries.form.status': 'Status *',
    'entries.form.work_done': 'Uitgevoerd werk',
    'entries.form.findings': 'Bevindingen (houtrot, scheuren, vocht, etc.)',
    'entries.form.materials': 'Gebruikte materialen',
    'entries.form.materials_placeholder': 'merk verf, systeem, coating',
    'entries.form.handover': 'Overdrachtsnotities',
    'entries.form.next_inspection': 'Volgende inspectiedatum (automatisch berekend, aan te passen)',
    'entries.form.photos': 'Foto\'s',

    'agenda.title': 'Agenda',
    'agenda.subtitle': 'Komende inspecties, op basis van het laatst gelogde werk per bouwdeel.',
    'agenda.load_error': 'Kon agenda niet laden: {msg}',
    'agenda.empty': 'Nog geen geplande inspecties. Die verschijnen hier zodra werk wordt gelogd met een volgende inspectiedatum.',
    'agenda.section.overdue': 'Verlopen',
    'agenda.section.soon': 'Komende 3 maanden',
    'agenda.section.later': 'Later',

    'access.title': 'Toegang klantportaal',
    'access.new_btn': '+ Client-login aanmaken',
    'access.load_error': 'Kon toegang niet laden: {msg}',
    'access.empty': 'Nog geen klant-logins voor dit pand. Maak er één aan zodat de klant zijn dossier kan bekijken op Mijn Pand.',
    'access.since': 'Toegang sinds {date}',
    'access.reset_btn': 'Reset wachtwoord',
    'access.revoke_btn': 'Intrekken',
    'access.revoke_title': 'Toegang intrekken',
    'access.revoke_confirm': 'Weet u zeker dat u de toegang van <strong>{email}</strong> tot dit pand wilt intrekken? Dit werkt direct.',
    'access.create_title': 'Client-login aanmaken',
    'access.create_body': 'De klant krijgt een eigen inlog voor Mijn Pand en ziet daar alleen dit pand — alles alleen-lezen.',
    'access.email_label': 'E-mail van de klant *',
    'access.email_required': 'E-mail is verplicht.',
    'access.err_staff_email': 'Dit e-mailadres hoort bij een medewerker-account en kan geen klant-login worden.',
    'access.create_failed': 'Aanmaken mislukt.',
    'access.temp_pw_title': 'Inloggegevens klant',
    'access.temp_pw_new': 'De klant-login is aangemaakt. Tijdelijk wachtwoord:',
    'access.temp_pw_reset': 'Nieuw tijdelijk wachtwoord voor {email}:',
    'access.temp_pw_warning': 'Dit wachtwoord wordt maar één keer getoond. Geef het persoonlijk door — de klant stelt bij de eerste inlog een eigen wachtwoord in.',
    'access.linked_existing_title': 'Bestaand account gekoppeld',
    'access.linked_existing_body': 'Dit e-mailadres had al een klant-login; die is nu aan dit pand gekoppeld. Het wachtwoord is ongewijzigd.',
    'access.error_title': 'Er ging iets mis',

    'portal.load_error': 'Er ging iets mis bij het laden. Probeer het later opnieuw.',
    'portal.no_property_title': 'Nog geen pand gekoppeld',
    'portal.no_property_body': 'Uw account is nog niet aan een pand gekoppeld. Neem contact op met KOG.',
    'portal.your_properties': 'Uw panden',
    'portal.choose_property': 'Kies een pand om het onderhoudsdossier te bekijken.',
    'portal.hero.title': 'Volgende onderhoud',
    'portal.hero.none_title': 'Geen onderhoud gepland',
    'portal.hero.none_body': 'Zodra KOG werk logt met een volgende inspectiedatum, ziet u die hier.',
    'portal.hero.overdue_note': 'Deze datum is verstreken — KOG neemt contact met u op.',
    'portal.hero.soon_note': 'Binnenkort — KOG neemt tegen die tijd contact met u op.',
    'portal.upcoming.title': 'Al het geplande onderhoud',
    'portal.rapport_btn': 'Bestuursrapport bekijken',
    'portal.components_title': 'Bouwdelen',
    'portal.no_components': 'Nog geen bouwdelen vastgelegd voor dit pand.',
    'portal.next_inspection': 'Volgende inspectie: {date}',
    'portal.registrations_one': '{n} registratie',
    'portal.registrations_other': '{n} registraties',
    'portal.property_not_found': 'Pand niet gevonden.',
    'portal.component_not_found': 'Bouwdeel niet gevonden.',
    'portal.no_entries': 'Nog geen werk gelogd voor dit bouwdeel.',
    'portal.photo_alt': 'Foto {phase}',

    'vve.back': '← Terug naar overzicht',
    'vve.title': 'Bestuursrapport · {date}',
    'vve.print_btn': 'Afdrukken / PDF',
    'vve.subtitle': 'Opgesteld door Kortlevers Onderhoud Groep — overzicht van uitgevoerd en gepland onderhoud per bouwdeel.',
    'vve.status_overview': 'Stand van zaken',
    'vve.no_components': 'Nog geen bouwdelen vastgelegd.',
    'vve.per_component': 'Per bouwdeel',
    'vve.table.component': 'Bouwdeel',
    'vve.table.status': 'Status',
    'vve.table.last_work': 'Laatste werk',
    'vve.table.next_inspection': 'Volgende inspectie',
    'vve.no_components_row': 'Nog geen bouwdelen.',
    'vve.done_this_year': 'Uitgevoerd in {year}',
    'vve.no_work_this_year': 'Geen afgerond werk geregistreerd in {year}.',
    'vve.upcoming': 'Komend onderhoud',
    'vve.no_upcoming': 'Nog geen gepland onderhoud.',

    'auth.no_access': 'Dit account heeft geen toegang tot Mijn Pand.',
    'auth.login_failed': 'Inloggen mislukt: controleer uw e-mail en wachtwoord.',
    'auth.pw_mismatch': 'De wachtwoorden komen niet overeen.',
    'auth.pw_same_as_temp': 'Kies een ander wachtwoord dan uw tijdelijke wachtwoord.',
    'auth.save_failed': 'Opslaan mislukt: {msg}',

    'login.title': 'Mijn Pand',
    'login.subtitle': 'Uw onderhoudsdossier, altijd inzichtelijk.',
    'login.email': 'E-mail',
    'login.password': 'Wachtwoord',
    'login.submit': 'Inloggen',
    'login.help': 'U heeft uw inloggegevens van KOG ontvangen. Wachtwoord vergeten? Neem contact op met KOG via 020 26 000 98.',
    'pwchange.title': 'Kies uw eigen wachtwoord',
    'pwchange.subtitle': 'U bent ingelogd met een tijdelijk wachtwoord. Stel eerst een eigen wachtwoord in (minimaal 8 tekens).',
    'pwchange.new': 'Nieuw wachtwoord',
    'pwchange.confirm': 'Herhaal wachtwoord',
    'pwchange.submit': 'Opslaan en doorgaan',
    'header.brand': 'Mijn Pand',
    'footer.contact': 'Vragen over uw onderhoud? Bel 020 26 000 98 of mail info@kogonderhoud.nl',
  },
  en: {
    'common.loading': 'Loading…',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.close': 'Close',
    'common.copy': 'Copy',
    'common.copied': 'Copied ✓',
    'common.save_failed': 'Save failed.',
    'common.findings': 'Findings:',
    'common.materials': 'Materials:',
    'common.handover': 'Handover:',
    'common.next_inspection': 'Next inspection:',

    'status.planned': 'Planned',
    'status.quoted': 'Quoted',
    'status.in_progress': 'In progress',
    'status.completed': 'Completed',
    'status.inspection_needed': 'Inspection needed',
    'status.none': 'No work logged yet',
    'status.none_short': 'No work yet',

    'ptype.home': 'Home',
    'ptype.business': 'Business premises',
    'ptype.vve': 'HOA complex',

    'comp.kozijnen': 'Window frames',
    'comp.gevel': 'Façade',
    'comp.balkon': 'Balcony / roof terrace',
    'comp.trappenhuis': 'Stairwell',
    'comp.boeideel': 'Fascia board',
    'comp.deuren': 'Doors',
    'comp.dak': 'Roof',
    'comp.overig': 'Other',

    'phase.before': 'Before',
    'phase.during': 'During',
    'phase.after': 'After',

    'admin.brand': 'KOG Admin',
    'nav.quotes': 'Requests',
    'nav.properties': 'Properties',
    'nav.agenda': 'Calendar',
    'nav.logout': 'Log out',

    'quotes.title': 'Requests',
    'quotes.load_error': 'Could not load requests: {msg}',
    'quotes.empty': 'No requests received yet.',
    'quotes.status.new': 'New',
    'quotes.status.reviewed': 'Reviewed',
    'quotes.status.converted': 'Converted',
    'quotes.status.archived': 'Archived',
    'quotes.back': '← All requests',
    'quotes.not_found': 'Request not found.',
    'quotes.already_converted': 'Already converted to property',
    'quotes.convert_btn': 'Convert to property',
    'quotes.field.property_type': 'Property type:',
    'quotes.field.components': 'Building components:',
    'quotes.field.work_type': 'Type of work:',
    'quotes.field.location': 'Location:',
    'quotes.field.scope': 'Scope:',
    'quotes.field.timing': 'Timing:',
    'quotes.field.message': 'Notes:',

    'properties.title': 'Properties',
    'properties.new_btn': '+ New property',
    'properties.load_error': 'Could not load properties: {msg}',
    'properties.empty': 'No properties yet. Click "+ New property" or convert a request.',
    'properties.back': '← All properties',
    'properties.not_found': 'Property not found.',
    'properties.new_component_btn': '+ Component',
    'properties.no_components': 'No components for this property yet.',
    'properties.form.title_new': 'New property',
    'properties.form.name': 'Name *',
    'properties.form.type': 'Type *',
    'properties.form.address': 'Address',
    'properties.form.postcode': 'Postal code',
    'properties.form.city': 'City',
    'properties.form.owner_name': 'Owner / contact',
    'properties.form.owner_email': 'Email',
    'properties.form.owner_phone': 'Phone',
    'properties.form.notes': 'Notes',
    'properties.form.name_required': 'Name is required.',

    'components.form.title': 'New component',
    'components.form.type': 'Component type *',
    'components.form.label': 'Description (optional)',
    'components.form.label_placeholder': 'e.g. north facade',

    'entries.new_btn': '+ Log work',
    'entries.not_found': 'Component not found.',
    'entries.empty': 'No work logged for this component yet.',
    'entries.no_date': 'No date yet',
    'entries.no_description': '(no description)',
    'entries.form.title': 'Log work',
    'entries.form.date': 'Date carried out',
    'entries.form.status': 'Status *',
    'entries.form.work_done': 'Work done',
    'entries.form.findings': 'Findings (wood rot, cracks, moisture, etc.)',
    'entries.form.materials': 'Materials used',
    'entries.form.materials_placeholder': 'paint brand, system, coating',
    'entries.form.handover': 'Handover notes',
    'entries.form.next_inspection': 'Next inspection date (auto-calculated, can be adjusted)',
    'entries.form.photos': 'Photos',

    'agenda.title': 'Calendar',
    'agenda.subtitle': 'Upcoming inspections, based on the most recently logged work per component.',
    'agenda.load_error': 'Could not load calendar: {msg}',
    'agenda.empty': 'No inspections scheduled yet. They will appear here once work is logged with a next inspection date.',
    'agenda.section.overdue': 'Overdue',
    'agenda.section.soon': 'Next 3 months',
    'agenda.section.later': 'Later',

    'access.title': 'Client portal access',
    'access.new_btn': '+ Create client login',
    'access.load_error': 'Could not load access: {msg}',
    'access.empty': 'No client logins for this property yet. Create one so the client can view their file on My Property.',
    'access.since': 'Access since {date}',
    'access.reset_btn': 'Reset password',
    'access.revoke_btn': 'Revoke',
    'access.revoke_title': 'Revoke access',
    'access.revoke_confirm': 'Are you sure you want to revoke <strong>{email}</strong>\'s access to this property? This takes effect immediately.',
    'access.create_title': 'Create client login',
    'access.create_body': 'The client gets their own login for My Property and will see only this property there — read-only.',
    'access.email_label': 'Client email *',
    'access.email_required': 'Email is required.',
    'access.err_staff_email': 'This email belongs to a staff account and cannot become a client login.',
    'access.create_failed': 'Creation failed.',
    'access.temp_pw_title': 'Client login details',
    'access.temp_pw_new': 'The client login has been created. Temporary password:',
    'access.temp_pw_reset': 'New temporary password for {email}:',
    'access.temp_pw_warning': 'This password is shown only once. Hand it over personally — the client will set their own password on first login.',
    'access.linked_existing_title': 'Existing account linked',
    'access.linked_existing_body': 'This email already had a client login; it is now linked to this property. The password is unchanged.',
    'access.error_title': 'Something went wrong',

    'portal.load_error': 'Something went wrong loading this. Please try again later.',
    'portal.no_property_title': 'No property linked yet',
    'portal.no_property_body': 'Your account is not yet linked to a property. Please contact KOG.',
    'portal.your_properties': 'Your properties',
    'portal.choose_property': 'Choose a property to view its maintenance file.',
    'portal.hero.title': 'Next maintenance',
    'portal.hero.none_title': 'No maintenance planned',
    'portal.hero.none_body': 'Once KOG logs work with a next inspection date, you will see it here.',
    'portal.hero.overdue_note': 'This date has passed — KOG will contact you.',
    'portal.hero.soon_note': 'Coming soon — KOG will contact you by then.',
    'portal.upcoming.title': 'All upcoming maintenance',
    'portal.rapport_btn': 'View board report',
    'portal.components_title': 'Building components',
    'portal.no_components': 'No components recorded for this property yet.',
    'portal.next_inspection': 'Next inspection: {date}',
    'portal.registrations_one': '{n} record',
    'portal.registrations_other': '{n} records',
    'portal.property_not_found': 'Property not found.',
    'portal.component_not_found': 'Component not found.',
    'portal.no_entries': 'No work logged for this component yet.',
    'portal.photo_alt': 'Photo {phase}',

    'vve.back': '← Back to overview',
    'vve.title': 'Board report · {date}',
    'vve.print_btn': 'Print / PDF',
    'vve.subtitle': 'Prepared by Kortlevers Onderhoud Groep — overview of completed and planned maintenance per component.',
    'vve.status_overview': 'Status overview',
    'vve.no_components': 'No components recorded yet.',
    'vve.per_component': 'By component',
    'vve.table.component': 'Component',
    'vve.table.status': 'Status',
    'vve.table.last_work': 'Last work',
    'vve.table.next_inspection': 'Next inspection',
    'vve.no_components_row': 'No components yet.',
    'vve.done_this_year': 'Completed in {year}',
    'vve.no_work_this_year': 'No completed work recorded in {year}.',
    'vve.upcoming': 'Upcoming maintenance',
    'vve.no_upcoming': 'No maintenance planned yet.',

    'auth.no_access': 'This account does not have access to My Property.',
    'auth.login_failed': 'Login failed: check your email and password.',
    'auth.pw_mismatch': 'The passwords do not match.',
    'auth.pw_same_as_temp': 'Choose a different password than your temporary one.',
    'auth.save_failed': 'Save failed: {msg}',

    'login.title': 'My Property',
    'login.subtitle': 'Your maintenance file, always at hand.',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.submit': 'Log in',
    'login.help': 'You received your login details from KOG. Forgot your password? Contact KOG at 020 26 000 98.',
    'pwchange.title': 'Choose your own password',
    'pwchange.subtitle': 'You are logged in with a temporary password. Please set your own password first (at least 8 characters).',
    'pwchange.new': 'New password',
    'pwchange.confirm': 'Repeat password',
    'pwchange.submit': 'Save and continue',
    'header.brand': 'My Property',
    'footer.contact': 'Questions about your maintenance? Call 020 26 000 98 or email info@kogonderhoud.nl',
  },
};

let currentLang = (localStorage.getItem(STORAGE_KEY) === 'en') ? 'en' : 'nl';
document.documentElement.lang = currentLang;

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (lang !== 'nl' && lang !== 'en') return;
  if (lang === currentLang) return;
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  window.dispatchEvent(new CustomEvent('kog-langchange'));
}

export function onLangChange(fn) {
  window.addEventListener('kog-langchange', fn);
}

export function t(key, vars) {
  const dict = DICT[currentLang] || DICT.nl;
  let str = dict[key] ?? DICT.nl[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) str = str.split(`{${k}}`).join(v);
  }
  return str;
}

// Pluralization helper: t.plural('portal.registrations', n) picks the _one/_other key.
export function tPlural(baseKey, n) {
  return t(n === 1 ? `${baseKey}_one` : `${baseKey}_other`, { n });
}

// Locale-aware date formatting, matching each app's previous nl-NL formatting but
// switching to en-GB (day/month/year order, English month names) in English.
export function formatDate(d, { long = false } = {}) {
  const locale = currentLang === 'en' ? 'en-GB' : 'nl-NL';
  return long
    ? new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date(d).toLocaleDateString(locale);
}

// Applies t() to every element with data-i18n (textContent) or data-i18n-html
// (innerHTML, for strings with inline markup) in the given root. Used for static
// shell chrome (nav, header, login form) that isn't rebuilt by the router.
export function applyStaticI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
}

const FLAGS = {
  nl: '<svg viewBox="0 0 60 45"><rect width="60" height="45" fill="#fff"/><rect width="60" height="15" fill="#AE1C28"/><rect y="30" width="60" height="15" fill="#21468B"/></svg>',
  en: '<svg viewBox="0 0 60 45"><clipPath id="gbAdm"><path d="M0,0 v45 h60 v-45 z"/></clipPath><clipPath id="gbBdm"><path d="M30,22.5 h30 v22.5 z v22.5 h-30 z h-30 v-22.5 z v-22.5 h30 z"/></clipPath><g clip-path="url(#gbAdm)"><path d="M0,0 v45 h60 v-45 z" fill="#012169"/><path d="M0,0 L60,45 M60,0 L0,45" stroke="#fff" stroke-width="9"/><path d="M0,0 L60,45 M60,0 L0,45" clip-path="url(#gbBdm)" stroke="#C8102E" stroke-width="6"/><path d="M30,0 v45 M0,22.5 h60" stroke="#fff" stroke-width="15"/><path d="M30,0 v45 M0,22.5 h60" stroke="#C8102E" stroke-width="9"/></g></svg>',
};

// Mounts a small flag dropdown (same visual language as the public site's picker,
// via the shared .kog-lang* CSS classes) into `container`, and keeps it in sync
// across tabs/reloads. `onSwitch` fires after setLang(), for callers that want to
// re-render immediately rather than wait for the kog-langchange listener.
export function mountLangPicker(container, onSwitch) {
  container.innerHTML = `
    <div class="kog-lang" id="kog-lang-picker">
      <button type="button" class="kog-lang__trigger" aria-haspopup="listbox" aria-expanded="false" aria-label="Taal / Language">
        <span class="kog-flag" id="kog-lang-flag" aria-hidden="true"></span>
        <svg class="kog-lang__caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <ul class="kog-lang__menu" role="listbox" aria-label="Taal / Language">
        <li><button type="button" class="kog-lang__item" data-lang="nl" role="option">
          <span class="kog-flag" aria-hidden="true">${FLAGS.nl}</span><span>Nederlands</span>
        </button></li>
        <li><button type="button" class="kog-lang__item" data-lang="en" role="option">
          <span class="kog-flag" aria-hidden="true">${FLAGS.en}</span><span>English</span>
        </button></li>
      </ul>
    </div>
  `;
  const picker = container.querySelector('#kog-lang-picker');
  const trigger = picker.querySelector('.kog-lang__trigger');
  const flagSlot = picker.querySelector('#kog-lang-flag');

  function syncSelected() {
    flagSlot.innerHTML = FLAGS[getLang()];
    picker.querySelectorAll('.kog-lang__item').forEach(it => {
      it.setAttribute('aria-selected', String(it.dataset.lang === getLang()));
    });
  }
  syncSelected();
  onLangChange(syncSelected);

  const closeMenu = () => { picker.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); };
  trigger.addEventListener('click', e => {
    e.stopPropagation();
    const open = picker.classList.toggle('open');
    trigger.setAttribute('aria-expanded', String(open));
  });
  picker.querySelectorAll('.kog-lang__item').forEach(it => {
    it.addEventListener('click', () => {
      setLang(it.dataset.lang);
      closeMenu();
      if (onSwitch) onSwitch();
    });
  });
  document.addEventListener('click', e => { if (!picker.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
}
