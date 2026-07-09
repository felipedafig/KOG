// ============================================================================
// DEMO FIXTURES — fictional data, lives only in browser memory.
// Everything resets on refresh. No backend, no network.
//
// The client portal (mijn-pand) is scoped to CLIENT_PROPERTY_IDS, exactly like
// RLS scopes a real client account; the admin sees everything.
// ============================================================================

export const DEMO_STAFF = {
  email: 'demo.medewerker@kogonderhoud.nl',
  full_name: 'Demo Medewerker',
};
export const DEMO_CLIENT = {
  email: 'bestuur@havenmeester-vve.nl',
  full_name: 'VvE De Havenmeester',
};

// The portal user is linked to these two properties (VvE + private home),
// so the client view shows a different slice than the admin view.
export const CLIENT_PROPERTY_IDS = ['prop-havenmeester', 'prop-vanduin'];

const now = new Date();
const iso = (y, m, d, hh = 10) => new Date(y, m - 1, d, hh).toISOString();
const isoDate = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
// Dates relative to "today" so the agenda/hero card always look alive,
// whenever the demo is opened.
const inDays = (n) => { const d = new Date(now); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const inMonths = (n) => { const d = new Date(now); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };

export const DB = {

  /* ---------------- properties ---------------- */
  properties: [
    {
      id: 'prop-havenmeester', name: 'VvE De Havenmeester', type: 'vve',
      address: 'Havenstraat 10–24', postcode: '1948 RC', city: 'Beverwijk',
      owner_name: 'Bestuur VvE De Havenmeester', owner_email: 'bestuur@havenmeester-vve.nl', owner_phone: '06 12 34 56 78',
      notes: 'Complex uit 1962, 24 appartementen over drie portieken. Kuststrook: extra aandacht voor houtwerk zeezijde.',
      created_at: iso(2024, 3, 12),
    },
    {
      id: 'prop-vanduin', name: 'Woonhuis Van Duin', type: 'home',
      address: 'Duinroosstraat 8', postcode: '1969 AB', city: 'Heemskerk',
      owner_name: 'Fam. Van Duin', owner_email: 'vanduin@example.nl', owner_phone: '06 98 76 54 32',
      notes: 'Vrijstaand woonhuis, jaren-30. Vaste klant sinds 2019.',
      created_at: iso(2024, 6, 3),
    },
    {
      id: 'prop-stationsplein', name: 'Kantoorpand Stationsplein', type: 'business',
      address: 'Stationsplein 41', postcode: '2011 LR', city: 'Haarlem',
      owner_name: 'Meerwaarde Vastgoed BV', owner_email: 'beheer@meerwaardevastgoed.nl', owner_phone: '023 555 01 20',
      notes: 'Kantoorverzamelgebouw, 4 verdiepingen. Entreepui vervangen in 2023.',
      created_at: iso(2025, 1, 20),
    },
    {
      id: 'prop-zeewind', name: 'VvE Zeewind', type: 'vve',
      address: 'Boulevard 102–130', postcode: '1976 EC', city: 'IJmuiden',
      owner_name: 'Bestuur VvE Zeewind', owner_email: 'info@vvezeewind.nl', owner_phone: '06 44 55 66 77',
      notes: 'Appartementencomplex direct aan zee — verkorte onderhoudscyclus houtwerk (zoutbelasting).',
      created_at: iso(2025, 9, 8),
    },
  ],

  /* ---------------- building components ---------------- */
  building_components: [
    // VvE De Havenmeester
    { id: 'c-hm-kozijnen', property_id: 'prop-havenmeester', component_type: 'kozijnen', label: 'Kozijnen zuidgevel', created_at: iso(2024, 3, 12, 11) },
    { id: 'c-hm-gevel', property_id: 'prop-havenmeester', component_type: 'gevel', label: 'Voorgevel portiek A–C', created_at: iso(2024, 3, 12, 12) },
    { id: 'c-hm-trap', property_id: 'prop-havenmeester', component_type: 'trappenhuis', label: 'Trappenhuis portiek B', created_at: iso(2024, 3, 12, 13) },
    { id: 'c-hm-balkon', property_id: 'prop-havenmeester', component_type: 'balkon', label: 'Balkons westzijde', created_at: iso(2024, 3, 12, 14) },
    { id: 'c-hm-dak', property_id: 'prop-havenmeester', component_type: 'dak', label: 'Plat dak + dakranden', created_at: iso(2024, 5, 2) },

    // Woonhuis Van Duin
    { id: 'c-vd-kozijnen', property_id: 'prop-vanduin', component_type: 'kozijnen', label: 'Kozijnen voor- en achterzijde', created_at: iso(2024, 6, 3, 11) },
    { id: 'c-vd-deuren', property_id: 'prop-vanduin', component_type: 'deuren', label: 'Voordeur + garagedeur', created_at: iso(2024, 6, 3, 12) },
    { id: 'c-vd-boeideel', property_id: 'prop-vanduin', component_type: 'boeideel', label: 'Boeidelen dakkapel', created_at: iso(2024, 6, 3, 13) },

    // Kantoorpand Stationsplein
    { id: 'c-sp-gevel', property_id: 'prop-stationsplein', component_type: 'gevel', label: 'Natuursteen plint + gevelbanden', created_at: iso(2025, 1, 20, 11) },
    { id: 'c-sp-deuren', property_id: 'prop-stationsplein', component_type: 'deuren', label: 'Entreepui', created_at: iso(2025, 1, 20, 12) },
    { id: 'c-sp-dak', property_id: 'prop-stationsplein', component_type: 'dak', label: 'Dakopstand + lichtstraten', created_at: iso(2025, 1, 20, 13) },

    // VvE Zeewind
    { id: 'c-zw-kozijnen', property_id: 'prop-zeewind', component_type: 'kozijnen', label: 'Kozijnen zeezijde', created_at: iso(2025, 9, 8, 11) },
    { id: 'c-zw-balkon', property_id: 'prop-zeewind', component_type: 'balkon', label: 'Balkonhekken + vloeren', created_at: iso(2025, 9, 8, 12) },
    { id: 'c-zw-boeideel', property_id: 'prop-zeewind', component_type: 'boeideel', label: 'Boeidelen boulevard-zijde', created_at: iso(2025, 9, 8, 13) },
    { id: 'c-zw-gevel', property_id: 'prop-zeewind', component_type: 'gevel', label: 'Achtergevel parkeerzijde', created_at: iso(2025, 9, 8, 14) },
  ],

  /* ---------------- maintenance entries (the Property File) ---------------- */
  maintenance_entries: [
    // — Havenmeester · kozijnen: full history incl. photos, next inspection scheduled
    {
      id: 'e-hm-koz-1', component_id: 'c-hm-kozijnen', status: 'completed',
      date_carried_out: isoDate(2024, 5, 28),
      work_done: 'Houtrot hersteld (7 kozijnen), volledig geschuurd en geschilderd in RAL 9001. Kitvoegen vernieuwd.',
      findings: 'Houtrot geconcentreerd op onderdorpels zuidzijde; overige delen in goede staat.',
      materials_used: 'Sigma Allure Gloss RAL 9001, Repair Care Dry Flex 4, Zwaluw Hybrifix',
      handover_notes: 'Bewoners portiek A geïnformeerd; ramen 48 uur niet in de verf zetten.',
      next_inspection_date: inMonths(11),
      next_maintenance_advice: 'Volgende inspectie geadviseerd na ongeveer 6 jaar (Kozijnen).',
      created_at: iso(2024, 5, 28, 16),
    },
    {
      id: 'e-hm-koz-2', component_id: 'c-hm-kozijnen', status: 'planned',
      date_carried_out: null,
      work_done: null,
      findings: 'Tussentijdse conditiemeting: verfwerk nog dekkend, lichte krijtvorming zuidzijde.',
      materials_used: null,
      handover_notes: null,
      next_inspection_date: inDays(38),
      next_maintenance_advice: 'Onderhoudsbeurt ingepland; krijtvorming zuidzijde bijwerken.',
      created_at: iso(2025, 11, 14),
    },

    // — Havenmeester · gevel: completed with before/during/after photos
    {
      id: 'e-hm-gevel-1', component_id: 'c-hm-gevel', status: 'completed',
      date_carried_out: isoDate(2025, 4, 17),
      work_done: 'Gevelreiniging, voegwerk plaatselijk hersteld (± 14 m²), hydrofobeerbehandeling aangebracht.',
      findings: 'Voegwerk portiek B plaatselijk verzand; metselwerk verder in goede conditie.',
      materials_used: 'Remmers Funcosil SNL, voegmortel M5',
      handover_notes: 'Steiger 3 werkdagen; doorgang portieken bleef vrij.',
      next_inspection_date: inMonths(21),
      next_maintenance_advice: 'Volgende inspectie geadviseerd na ongeveer 6 jaar (Gevel).',
      created_at: iso(2025, 4, 17, 15),
    },

    // — Havenmeester · trappenhuis: overdue inspection (red state in portal hero)
    {
      id: 'e-hm-trap-1', component_id: 'c-hm-trap', status: 'inspection_needed',
      date_carried_out: isoDate(2018, 6, 12),
      work_done: 'Wanden en plafonds gesausd, lambrisering gelakt, leuningen behandeld.',
      findings: null,
      materials_used: 'Sigma Sprint Eco, Sikkens Rubbol BL Satura',
      handover_notes: null,
      next_inspection_date: inDays(-40),
      next_maintenance_advice: 'Volgende inspectie geadviseerd na ongeveer 8 jaar (Trappenhuis).',
      created_at: iso(2018, 6, 12, 15),
    },

    // — Havenmeester · balkons: quote stage
    {
      id: 'e-hm-balkon-1', component_id: 'c-hm-balkon', status: 'quoted',
      date_carried_out: null,
      work_done: null,
      findings: 'Betonrot geconstateerd aan 3 balkonranden westzijde; hekwerkbevestiging 2× licht gecorrodeerd.',
      materials_used: null,
      handover_notes: 'Offerte betonherstel + conserveren hekwerk verstuurd aan bestuur (11-06).',
      next_inspection_date: inDays(12),
      next_maintenance_advice: 'Herstel op korte termijn geadviseerd; daarna cyclus van 8 jaar (Balkon / dakterras).',
      created_at: iso(2026, 6, 11),
    },

    // — Havenmeester · dak: in progress right now
    {
      id: 'e-hm-dak-1', component_id: 'c-hm-dak', status: 'in_progress',
      date_carried_out: null,
      work_done: 'Dakranden worden voorzien van nieuwe aluminium daktrim; bitumen plaatselijk overlaagd.',
      findings: 'Blaasvorming in bitumen rond hemelwaterafvoeren.',
      materials_used: 'APP 470K14, aluminium daktrim',
      handover_notes: null,
      next_inspection_date: inMonths(4),
      next_maintenance_advice: 'Na oplevering: volgende inspectie na ongeveer 10 jaar (Dak).',
      created_at: iso(2026, 7, 1),
    },

    // — Van Duin · kozijnen: completed last year
    {
      id: 'e-vd-koz-1', component_id: 'c-vd-kozijnen', status: 'completed',
      date_carried_out: isoDate(2025, 9, 3),
      work_done: 'Buitenschilderwerk alle kozijnen, kleur RAL 7016 op verzoek bewoner (was crème).',
      findings: 'Enkel kaal gestoten plekken; geen houtrot.',
      materials_used: 'Sikkens Rubbol XD Gloss RAL 7016',
      handover_notes: 'Kleurwijziging vastgelegd in dossier voor volgende beurt.',
      next_inspection_date: inMonths(26),
      next_maintenance_advice: 'Volgende inspectie geadviseerd na ongeveer 6 jaar (Kozijnen).',
      created_at: iso(2025, 9, 3, 16),
    },

    // — Van Duin · deuren: planned soon (shows in portal hero + agenda)
    {
      id: 'e-vd-deur-1', component_id: 'c-vd-deuren', status: 'planned',
      date_carried_out: null,
      work_done: null,
      findings: 'Lak voordeur dof en gecraqueleerd aan zonzijde; garagedeur onderrand kaal.',
      materials_used: null,
      handover_notes: 'Ingepland in combinatie met boeidelen dakkapel.',
      next_inspection_date: inDays(21),
      next_maintenance_advice: 'Schilderbeurt ingepland; daarna cyclus van 6 jaar (Deuren).',
      created_at: iso(2026, 5, 20),
    },

    // — Van Duin · boeidelen
    {
      id: 'e-vd-boei-1', component_id: 'c-vd-boeideel', status: 'planned',
      date_carried_out: null,
      work_done: null,
      findings: 'Boeidelen dakkapel verweerd; verflaag laat plaatselijk los.',
      materials_used: null,
      handover_notes: null,
      next_inspection_date: inDays(21),
      next_maintenance_advice: 'Volgende inspectie geadviseerd na ongeveer 4 jaar (Boeideel).',
      created_at: iso(2026, 5, 20, 11),
    },

    // — Stationsplein · entreepui: completed with photos
    {
      id: 'e-sp-deur-1', component_id: 'c-sp-deuren', status: 'completed',
      date_carried_out: isoDate(2026, 3, 10),
      work_done: 'Entreepui nagelopen: hang- en sluitwerk afgesteld, aluminium gereinigd en behandeld, tochtprofielen vervangen.',
      findings: 'Dranger hoofddeur versleten — vervangen.',
      materials_used: 'GEZE TS 4000 dranger, aluminiumreiniger',
      handover_notes: 'Sleutelplan ongewijzigd.',
      next_inspection_date: inMonths(34),
      next_maintenance_advice: 'Volgende inspectie geadviseerd na ongeveer 6 jaar (Deuren).',
      created_at: iso(2026, 3, 10, 14),
    },

    // — Stationsplein · gevel
    {
      id: 'e-sp-gevel-1', component_id: 'c-sp-gevel', status: 'completed',
      date_carried_out: isoDate(2025, 10, 22),
      work_done: 'Natuursteen plint gereinigd (stoom, geen chemie), gevelbanden geschilderd.',
      findings: 'Graffiti verwijderd zijgevel; anti-graffiticoating aangebracht.',
      materials_used: 'Sigma Facade Topcoat Matt, AGS-3 coating',
      handover_notes: null,
      next_inspection_date: inMonths(29),
      next_maintenance_advice: 'Volgende inspectie geadviseerd na ongeveer 6 jaar (Gevel).',
      created_at: iso(2025, 10, 22, 15),
    },

    // — Stationsplein · dak: inspection due soon (agenda)
    {
      id: 'e-sp-dak-1', component_id: 'c-sp-dak', status: 'planned',
      date_carried_out: null,
      work_done: null,
      findings: 'Jaarlijkse dakcontrole: lichtstraatkit einde levensduur binnen 2 jaar.',
      materials_used: null,
      handover_notes: null,
      next_inspection_date: inDays(60),
      next_maintenance_advice: 'Kitranden lichtstraten vervangen bij volgende beurt.',
      created_at: iso(2026, 6, 2),
    },

    // — Zeewind · kozijnen zeezijde: shortened cycle, in progress
    {
      id: 'e-zw-koz-1', component_id: 'c-zw-kozijnen', status: 'in_progress',
      date_carried_out: null,
      work_done: 'Zeezijde: kozijnen worden geschuurd en in 2 lagen afgelakt (verkorte cyclus wegens zoutbelasting).',
      findings: 'UV- en zoutschade bovenverdiepingen duidelijk zichtbaar.',
      materials_used: 'Sikkens Rubbol XD Gloss',
      handover_notes: 'Hoogwerker via boulevard; parkeervakken 104–110 tijdelijk afgezet.',
      next_inspection_date: inMonths(2),
      next_maintenance_advice: 'Zeezijde: inspectiecyclus 3 jaar i.p.v. 6 (zoutbelasting).',
      created_at: iso(2026, 6, 24),
    },

    // — Zeewind · balkons: completed with photos
    {
      id: 'e-zw-balkon-1', component_id: 'c-zw-balkon', status: 'completed',
      date_carried_out: isoDate(2025, 8, 14),
      work_done: 'Balkonhekken gestraald en gepoedercoat, balkonvloeren voorzien van slijtlaag.',
      findings: 'Corrosie bij 6 hekken; ankers vervangen bij nr. 118.',
      materials_used: 'Poedercoating RAL 7021, Triflex balkonsysteem',
      handover_notes: 'Balkons 1 week niet belasten na aanbrengen slijtlaag.',
      next_inspection_date: inMonths(25),
      next_maintenance_advice: 'Volgende inspectie geadviseerd na ongeveer 8 jaar (Balkon / dakterras).',
      created_at: iso(2025, 8, 14, 16),
    },

    // — Zeewind · boeidelen: needs inspection (red, agenda)
    {
      id: 'e-zw-boei-1', component_id: 'c-zw-boeideel', status: 'inspection_needed',
      date_carried_out: isoDate(2022, 5, 30),
      work_done: 'Boeidelen geschilderd.',
      findings: null,
      materials_used: 'Sigma Allure Gloss',
      handover_notes: null,
      next_inspection_date: inDays(5),
      next_maintenance_advice: 'Volgende inspectie geadviseerd na ongeveer 4 jaar (Boeideel).',
      created_at: iso(2022, 5, 30, 15),
    },

    // — Zeewind · achtergevel
    {
      id: 'e-zw-gevel-1', component_id: 'c-zw-gevel', status: 'planned',
      date_carried_out: null,
      work_done: null,
      findings: 'Conditiemeting: scheurvorming boven kelderingang, monitoren.',
      materials_used: null,
      handover_notes: null,
      next_inspection_date: inMonths(8),
      next_maintenance_advice: 'Scheur boven kelderingang opnieuw inmeten bij volgende inspectie.',
      created_at: iso(2026, 4, 9),
    },
  ],

  /* ---------------- photos (resolved to local demo images) ---------------- */
  maintenance_photos: [
    { id: 'ph-1', entry_id: 'e-hm-koz-1', phase: 'before', storage_path: 'hero-hinge.jpg' },
    { id: 'ph-2', entry_id: 'e-hm-koz-1', phase: 'during', storage_path: 'hero-sanding.jpg' },
    { id: 'ph-3', entry_id: 'e-hm-koz-1', phase: 'after', storage_path: 'hero-brush.jpg' },
    { id: 'ph-4', entry_id: 'e-hm-gevel-1', phase: 'before', storage_path: 'hero-scaffold.jpg' },
    { id: 'ph-5', entry_id: 'e-hm-gevel-1', phase: 'after', storage_path: 'hero-balcony.jpg' },
    { id: 'ph-6', entry_id: 'e-sp-deur-1', phase: 'after', storage_path: 'hero-blueprint.jpg' },
    { id: 'ph-7', entry_id: 'e-zw-balkon-1', phase: 'before', storage_path: 'hero-hoogwerker.jpg' },
    { id: 'ph-8', entry_id: 'e-zw-balkon-1', phase: 'after', storage_path: 'hero-balcony.jpg' },
    { id: 'ph-9', entry_id: 'e-zw-koz-1', phase: 'during', storage_path: 'hero-hoogwerker.jpg' },
  ],

  /* ---------------- quote inbox ---------------- */
  quote_requests: [
    {
      id: 'q-1', name: 'M. Jansen', company: 'VvE Parkzicht', email: 'bestuur@vveparkzicht.nl', phone: '06 11 22 33 44',
      requester_type: 'vve', property_type: 'vve',
      component_types: ['kozijnen', 'trappenhuis'],
      work_type: 'Schilderwerk buiten + binnen', location: 'Velsen-Zuid',
      scope: '18 appartementen, 2 portieken', preferred_timing: 'Binnen 3–6 maanden',
      message: 'Wij zoeken een vaste onderhoudspartner. Graag een meerjarenvoorstel voor het schilderwerk, te beginnen met de kozijnen.',
      indicative_advice: null, status: 'new', converted_property_id: null, converted_at: null,
      created_at: iso(2026, 7, 8, 9),
    },
    {
      id: 'q-2', name: 'R. de Boer', company: null, email: 'r.deboer@example.nl', phone: '06 55 44 33 22',
      requester_type: 'particulier', property_type: 'home',
      component_types: ['dak', 'boeideel'],
      work_type: 'Dakinspectie + herstel', location: 'Castricum',
      scope: 'Hoekwoning, dakkapel aan voorzijde', preferred_timing: 'Zo snel mogelijk',
      message: 'Na de laatste storm ligt er een stuk boeideel in de tuin. Kunnen jullie snel komen kijken?',
      indicative_advice: null, status: 'new', converted_property_id: null, converted_at: null,
      created_at: iso(2026, 7, 9, 14),
    },
    {
      id: 'q-3', name: 'S. Willems', company: 'Woningstichting Kennemerduin', email: 's.willems@kennemerduin.nl', phone: '0251 22 44 66',
      requester_type: 'woningcorporatie', property_type: 'business',
      component_types: ['gevel', 'kozijnen', 'deuren'],
      work_type: 'Planmatig onderhoud', location: 'Beverwijk — wijk Oosterwijk',
      scope: '3 flats, 96 woningen', preferred_timing: 'Geen haast, oriënterend',
      message: 'Aanbesteding planmatig onderhoud 2027. Graag kennismaken en referenties VvE/corporatiewerk.',
      indicative_advice: null, status: 'reviewed', converted_property_id: null, converted_at: null,
      created_at: iso(2026, 6, 30, 11),
    },
    {
      id: 'q-4', name: 'P. Meerwaarde', company: 'Meerwaarde Vastgoed BV', email: 'beheer@meerwaardevastgoed.nl', phone: '023 555 01 20',
      requester_type: 'vastgoedbeheerder', property_type: 'business',
      component_types: ['gevel', 'dak', 'deuren'],
      work_type: 'Onderhoudscontract', location: 'Haarlem',
      scope: 'Kantoorpand 4 verdiepingen', preferred_timing: 'Binnen 1 maand',
      message: 'Wij willen het pand Stationsplein 41 in vast onderhoud onderbrengen.',
      indicative_advice: null, status: 'converted', converted_property_id: 'prop-stationsplein', converted_at: iso(2025, 1, 20, 10),
      created_at: iso(2025, 1, 12, 9),
    },
    {
      id: 'q-5', name: 'T. Bakker', company: null, email: 't.bakker@example.nl', phone: null,
      requester_type: 'particulier', property_type: 'home',
      component_types: ['overig'],
      work_type: 'Binnen schilderwerk', location: 'Uitgeest',
      scope: 'Woonkamer + hal', preferred_timing: 'Zo snel mogelijk',
      message: 'Alleen binnenwerk.',
      indicative_advice: null, status: 'archived', converted_property_id: null, converted_at: null,
      created_at: iso(2026, 5, 4, 16),
    },
  ],

  quote_photos: [
    { id: 'qp-1', quote_id: 'q-2', storage_path: 'hero-van.jpg' },
    { id: 'qp-2', quote_id: 'q-2', storage_path: 'hero-hoogwerker.jpg' },
  ],

  /* ---------------- portal access (admin "Toegang klantportaal") ---------------- */
  property_users: [
    { property_id: 'prop-havenmeester', user_id: 'demo-client-user', email: 'bestuur@havenmeester-vve.nl', created_at: iso(2025, 2, 10) },
    { property_id: 'prop-vanduin', user_id: 'demo-client-user-2', email: 'vanduin@example.nl', created_at: iso(2025, 3, 2) },
    { property_id: 'prop-zeewind', user_id: 'demo-client-user-3', email: 'info@vvezeewind.nl', created_at: iso(2025, 10, 1) },
  ],
};
