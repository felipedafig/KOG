// Single source of truth for "status is a color, not a paragraph" (requirements §4.4).
// Every view renders a maintenance-entry status through statusBadge(), never ad hoc.
// Shared with mijn-pand/ (imported cross-folder) — keep free of admin-specific behavior.
import { t } from './i18n.js';

// Colors only — labels come from t('status.*') so they follow the language switch.
export const STATUS_META = {
  planned:            { bg: '#F1F0EA', fg: '#6B6862' },
  quoted:             { bg: '#FDF3D8', fg: '#8A6D1D' },
  in_progress:        { bg: '#E3EEFB', fg: '#2A5C9A' },
  completed:          { bg: 'rgba(95,168,60,.16)', fg: '#4C8B30' },
  inspection_needed:  { bg: 'rgba(206,27,36,.12)', fg: '#A3141B' },
};

export function statusLabel(status) {
  return STATUS_META[status] ? t(`status.${status}`) : status;
}

export function statusBadge(status) {
  const meta = STATUS_META[status] || { bg: '#F1F0EA', fg: '#6B6862' };
  const span = document.createElement('span');
  span.className = 'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide';
  span.style.background = meta.bg;
  span.style.color = meta.fg;
  span.textContent = statusLabel(status);
  return span;
}
