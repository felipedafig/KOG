import { STATUS_META, statusLabel } from '../../admin/js/status.js';
import { componentTypeLabel } from '../../admin/js/components.js';
import { t, formatDate } from '../../admin/js/i18n.js';
import { escapeHtml, fmtDate, fetchPropertyWithComponents, latestEntry } from './portal.js';

// Module 6: the VvE "bestuursrapport" — a printable status/planning overview a board
// can show its members: what was done this year, what's coming, per building component.
// Read-only; print via the browser (print stylesheet lives in mijn-pand/index.html).

function countByStatus(components) {
  const counts = {};
  for (const c of components) {
    const latest = latestEntry(c);
    const key = latest ? latest.status : 'none';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function statusPill(status) {
  const meta = STATUS_META[status];
  if (!meta) return `<span class="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style="background:#F1F0EA;color:#6B6862">${t('status.none_short')}</span>`;
  return `<span class="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style="background:${meta.bg};color:${meta.fg}">${statusLabel(status)}</span>`;
}

export async function renderRapport(root, id) {
  root.innerHTML = `<p class="text-ink/40">${t('common.loading')}</p>`;
  const { property, components } = await fetchPropertyWithComponents(id);
  if (!property) { root.innerHTML = `<p class="text-sienna2">${t('portal.property_not_found')}</p>`; return; }

  const now = new Date();
  const thisYear = now.getFullYear();
  const counts = countByStatus(components);

  // Work done this calendar year, newest first, across all components.
  const doneThisYear = [];
  const upcoming = [];
  for (const c of components) {
    for (const e of (c.maintenance_entries || [])) {
      if (e.date_carried_out && new Date(e.date_carried_out).getFullYear() === thisYear && (e.status === 'completed' || e.status === 'in_progress')) {
        doneThisYear.push({ c, e });
      }
    }
    const latestDated = (c.maintenance_entries || []).filter(e => e.next_inspection_date).slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    if (latestDated) upcoming.push({ c, e: latestDated });
  }
  doneThisYear.sort((a, b) => new Date(b.e.date_carried_out) - new Date(a.e.date_carried_out));
  upcoming.sort((a, b) => a.e.next_inspection_date.localeCompare(b.e.next_inspection_date));

  const statusOrder = ['inspection_needed', 'in_progress', 'planned', 'quoted', 'completed', 'none'];
  const summaryTiles = statusOrder.filter(s => counts[s]).map(s => {
    const meta = STATUS_META[s] || { fg: '#6B6862' };
    const label = STATUS_META[s] ? statusLabel(s) : t('status.none_short');
    return `<div class="rapport-card rounded-xl p-4 border border-rule bg-white text-center">
      <div class="text-[26px] font-bold" style="color:${meta.fg}">${counts[s]}</div>
      <div class="text-[11.5px] uppercase tracking-wide text-ink/50 mt-0.5">${label}</div>
    </div>`;
  }).join('');

  root.innerHTML = `
    <a href="#/property/${id}" class="no-print text-[13px] text-ink/50 hover:text-sienna">${t('vve.back')}</a>

    <div class="flex items-start justify-between mt-3 mb-2 flex-wrap gap-3">
      <div>
        <div class="text-[11px] uppercase tracking-[.18em] text-leaf2 mb-1">${t('vve.title', { date: fmtDate(now) })}</div>
        <h1 class="text-[26px] font-semibold leading-tight">${escapeHtml(property.name)}</h1>
        <p class="mt-1 text-[14px] text-ink/55">${escapeHtml([property.address, property.postcode, property.city].filter(Boolean).join(', ') || '')}</p>
      </div>
      <button onclick="window.print()" class="no-print inline-flex items-center gap-2 px-4 py-2.5 bg-sienna text-white rounded-lg text-[13.5px] hover:bg-sienna2 transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
        ${t('vve.print_btn')}
      </button>
    </div>
    <p class="text-[13px] text-ink/45 mb-7">${t('vve.subtitle')}</p>

    <h2 class="text-[11px] uppercase tracking-[.18em] text-ink/50 mb-3">${t('vve.status_overview')}</h2>
    <div class="grid gap-3 mb-9" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr));">${summaryTiles || `<p class="text-[14px] text-ink/50">${t('vve.no_components')}</p>`}</div>

    <h2 class="text-[11px] uppercase tracking-[.18em] text-ink/50 mb-3">${t('vve.per_component')}</h2>
    <div class="rapport-card bg-white border border-rule rounded-2xl overflow-hidden mb-9">
      <table class="w-full text-[13.5px]">
        <thead>
          <tr class="border-b border-rule text-left">
            <th class="px-5 py-3 font-semibold">${t('vve.table.component')}</th>
            <th class="px-5 py-3 font-semibold">${t('vve.table.status')}</th>
            <th class="px-5 py-3 font-semibold">${t('vve.table.last_work')}</th>
            <th class="px-5 py-3 font-semibold">${t('vve.table.next_inspection')}</th>
          </tr>
        </thead>
        <tbody>
          ${components.map(c => {
            const latest = latestEntry(c);
            const nextDated = (c.maintenance_entries || []).filter(e => e.next_inspection_date).slice()
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
            return `<tr class="border-b border-rule/60 last:border-0">
              <td class="px-5 py-3">${escapeHtml(componentTypeLabel(c.component_type))}${c.label ? '<span class="text-ink/50"> — ' + escapeHtml(c.label) + '</span>' : ''}</td>
              <td class="px-5 py-3">${statusPill(latest?.status)}</td>
              <td class="px-5 py-3 text-ink/60">${latest?.date_carried_out ? fmtDate(latest.date_carried_out) : '—'}</td>
              <td class="px-5 py-3 text-ink/60">${nextDated ? fmtDate(nextDated.next_inspection_date) : '—'}</td>
            </tr>`;
          }).join('') || `<tr><td class="px-5 py-4 text-ink/50" colspan="4">${t('vve.no_components_row')}</td></tr>`}
        </tbody>
      </table>
    </div>

    <h2 class="text-[11px] uppercase tracking-[.18em] text-ink/50 mb-3">${t('vve.done_this_year', { year: thisYear })}</h2>
    <div class="space-y-2.5 mb-9">
      ${doneThisYear.map(({ c, e }) => `
        <div class="rapport-card bg-white border border-rule rounded-xl p-4">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="text-[14px] font-semibold">${escapeHtml(componentTypeLabel(c.component_type))}${c.label ? '<span class="font-normal text-ink/55"> — ' + escapeHtml(c.label) + '</span>' : ''}</div>
            <div class="text-[13px] text-ink/50">${fmtDate(e.date_carried_out)}</div>
          </div>
          ${e.work_done ? `<p class="mt-1.5 text-[13.5px] text-ink/70">${escapeHtml(e.work_done)}</p>` : ''}
        </div>`).join('') || `<p class="text-[14px] text-ink/50">${t('vve.no_work_this_year', { year: thisYear })}</p>`}
    </div>

    <h2 class="text-[11px] uppercase tracking-[.18em] text-ink/50 mb-3">${t('vve.upcoming')}</h2>
    <div class="space-y-2.5">
      ${upcoming.map(({ c, e }) => `
        <div class="rapport-card bg-white border border-rule rounded-xl p-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <div class="text-[14px] font-semibold">${escapeHtml(componentTypeLabel(c.component_type))}${c.label ? '<span class="font-normal text-ink/55"> — ' + escapeHtml(c.label) + '</span>' : ''}</div>
            ${e.next_maintenance_advice ? `<p class="mt-0.5 text-[12.5px] text-ink/50">${escapeHtml(e.next_maintenance_advice)}</p>` : ''}
          </div>
          <div class="text-[14px] font-semibold">${fmtDate(e.next_inspection_date)}</div>
        </div>`).join('') || `<p class="text-[14px] text-ink/50">${t('vve.no_upcoming')}</p>`}
    </div>
  `;
}
