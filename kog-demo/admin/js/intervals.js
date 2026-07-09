// component_type -> maintenance interval (years) + advice sentence.
// Keep in sync with the KOG_INTERVALS table inline in kog-website/index.html.
export const INTERVALS = {
  kozijnen:    { years: 6,  label: 'Kozijnen' },
  gevel:       { years: 6,  label: 'Gevel' },
  balkon:      { years: 8,  label: 'Balkon / dakterras' },
  trappenhuis: { years: 8,  label: 'Trappenhuis' },
  boeideel:    { years: 4,  label: 'Boeideel' },
  deuren:      { years: 6,  label: 'Deuren' },
  dak:         { years: 10, label: 'Dak' },
  overig:      { years: 5,  label: 'Overig' },
};

// Computes the next inspection date + advice sentence from a component type and the
// date the work was carried out (defaults to today if not given). Staff can override
// the resulting date in the entry form.
export function computeNextInspection(componentType, dateCarriedOut) {
  const interval = INTERVALS[componentType] || INTERVALS.overig;
  const base = dateCarriedOut ? new Date(dateCarriedOut) : new Date();
  const next = new Date(base);
  next.setFullYear(next.getFullYear() + interval.years);
  const iso = next.toISOString().slice(0, 10);
  return {
    date: iso,
    advice: `Volgende inspectie geadviseerd na ongeveer ${interval.years} jaar (${interval.label}).`,
  };
}
