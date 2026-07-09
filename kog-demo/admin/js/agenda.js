import { supabase } from './supabaseClient.js';
import { escapeHtml } from './properties.js';
import { componentTypeLabel } from './components.js';
import { statusBadge } from './status.js';
import { t, formatDate } from './i18n.js';
import { urgencyAccent, parseYmd, mountWeekCalendar } from './calendar.js';

// Module 4: the maintenance calendar. One row per component = its most recent
// scheduling decision (latest entry among entries that carry a next_inspection_date).
// No reminders/emails yet — that needs SMTP + a scheduled function (future phase).

const DAY = 24 * 60 * 60 * 1000;

function dateChip(dateStr, today) {
  const d = new Date(dateStr);
  const days = Math.round((d - today) / DAY);
  let bg = '#F1F0EA', fg = '#6B6862'; // later: neutral
  if (days < 0) { bg = 'rgba(206,27,36,.12)'; fg = '#A3141B'; } // overdue
  else if (days <= 90) { bg = '#FDF3D8'; fg = '#8A6D1D'; } // soon
  return `<span class="inline-flex px-2.5 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap" style="background:${bg};color:${fg}">${formatDate(dateStr)}</span>`;
}

export async function renderAgenda(root) {
  root.innerHTML = `
    <h1 class="text-[22px] font-semibold mb-1">${t('agenda.title')}</h1>
    <p class="text-[13.5px] text-ink/55 mb-6">${t('agenda.subtitle')}</p>
    <div id="agenda-week" class="max-w-3xl mb-8"></div>
    <div id="agenda-list"></div>
  `;
  const list = root.querySelector('#agenda-list');

  const { data, error } = await supabase.from('maintenance_entries')
    .select('id, component_id, status, next_inspection_date, created_at, building_components(id, component_type, label, properties(id, name))')
    .not('next_inspection_date', 'is', null)
    .order('next_inspection_date');
  if (error) { list.innerHTML = `<p class="text-sienna2">${t('agenda.load_error', { msg: error.message })}</p>`; return; }

  // Latest scheduling decision per component wins.
  const perComponent = new Map();
  for (const e of data) {
    const prev = perComponent.get(e.component_id);
    if (!prev || new Date(e.created_at) > new Date(prev.created_at)) perComponent.set(e.component_id, e);
  }
  const items = [...perComponent.values()].sort((a, b) => a.next_inspection_date.localeCompare(b.next_inspection_date));

  if (!items.length) {
    root.querySelector('#agenda-week').remove();
    list.innerHTML = `<p class="text-ink/50">${t('agenda.empty')}</p>`;
    return;
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Same week-strip + month-modal calendar as the client portal, but across ALL
  // properties: line1 = property, line2 = component, links to the admin component view.
  const events = items.map(e => ({
    dateStr: e.next_inspection_date,
    date: parseYmd(e.next_inspection_date),
    accent: urgencyAccent(e.next_inspection_date, today),
    line1: e.building_components.properties.name,
    line2: componentTypeLabel(e.building_components.component_type) + (e.building_components.label ? ' — ' + e.building_components.label : ''),
    href: `#/components/${e.building_components.id}`,
  }));
  mountWeekCalendar(root.querySelector('#agenda-week'), events, today);
  const sections = [
    { title: t('agenda.section.overdue'), match: d => d < today },
    { title: t('agenda.section.soon'), match: d => d >= today && d <= new Date(today.getTime() + 90 * DAY) },
    { title: t('agenda.section.later'), match: d => d > new Date(today.getTime() + 90 * DAY) },
  ];

  for (const section of sections) {
    const rows = items.filter(e => section.match(new Date(e.next_inspection_date)));
    if (!rows.length) continue;
    const box = document.createElement('div');
    box.className = 'mb-7';
    box.innerHTML = `<h2 class="text-[11px] uppercase tracking-[.18em] text-ink/50 mb-3">${section.title}</h2><div class="space-y-2"></div>`;
    const rowsBox = box.querySelector('div');
    for (const e of rows) {
      const bc = e.building_components;
      const row = document.createElement('a');
      row.href = `#/components/${bc.id}`;
      row.className = 'flex items-center gap-4 p-4 border border-rule rounded-lg hover:border-sienna transition-colors bg-white';
      row.innerHTML = `
        ${dateChip(e.next_inspection_date, today)}
        <div class="min-w-0 flex-1">
          <div class="text-[14px] font-semibold truncate">${escapeHtml(bc.properties.name)}</div>
          <div class="text-[12.5px] text-ink/55 truncate">${escapeHtml(componentTypeLabel(bc.component_type))}${bc.label ? ' — ' + escapeHtml(bc.label) : ''}</div>
        </div>
      `;
      row.appendChild(statusBadge(e.status));
      rowsBox.appendChild(row);
    }
    list.appendChild(box);
  }
}
