// Single source of truth for "status is a color, not a paragraph" (requirements §4.4).
// Every view renders a maintenance-entry status through statusBadge(), never ad hoc.
export const STATUS_META = {
  planned:            { label: 'Gepland',            bg: '#F1F0EA', fg: '#6B6862' },
  quoted:             { label: 'Offerte uitgebracht', bg: '#FDF3D8', fg: '#8A6D1D' },
  in_progress:        { label: 'In uitvoering',       bg: '#E3EEFB', fg: '#2A5C9A' },
  completed:          { label: 'Afgerond',            bg: 'rgba(95,168,60,.16)', fg: '#4C8B30' },
  inspection_needed:  { label: 'Inspectie nodig',     bg: 'rgba(206,27,36,.12)', fg: '#A3141B' },
};

export function statusBadge(status) {
  const meta = STATUS_META[status] || { label: status, bg: '#F1F0EA', fg: '#6B6862' };
  const span = document.createElement('span');
  span.className = 'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide';
  span.style.background = meta.bg;
  span.style.color = meta.fg;
  span.textContent = meta.label;
  return span;
}
