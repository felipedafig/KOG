import { supabase } from '../../admin/js/supabaseClient.js';
import { navigate } from '../../admin/js/router.js';
import { STATUS_META, statusLabel } from '../../admin/js/status.js';
import { componentTypeLabel } from '../../admin/js/components.js';
import { t, tPlural, formatDate } from '../../admin/js/i18n.js';

// Client-facing views: strictly read-only, progressive disclosure
// (property -> components -> history), status always shown as a color.

const DAY = 24 * 60 * 60 * 1000;

function propertyTypeLabel(type) {
  return ({ home: t('ptype.home'), business: t('ptype.business'), vve: t('ptype.vve') })[type] || '';
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function fmtDate(d) {
  return formatDate(d, { long: true });
}

function statusPill(status, fallbackKey) {
  const meta = status ? STATUS_META[status] : null;
  const label = meta ? statusLabel(status) : (fallbackKey ? t(fallbackKey) : '—');
  const bg = meta ? meta.bg : '#F1F0EA';
  const fg = meta ? meta.fg : '#6B6862';
  return `<span class="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold" style="background:${bg};color:${fg}">${label}</span>`;
}

// Latest entry per component (by created_at), from an embedded select.
export function latestEntry(component) {
  return (component.maintenance_entries || []).slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;
}

export async function fetchPropertyWithComponents(id) {
  const [{ data: property }, { data: components }] = await Promise.all([
    supabase.from('properties').select('*').eq('id', id).single(),
    supabase.from('building_components')
      .select('*, maintenance_entries(id, status, date_carried_out, next_inspection_date, next_maintenance_advice, created_at)')
      .eq('property_id', id).order('created_at'),
  ]);
  return { property, components: components || [] };
}

/* ---------- home: property picker (skipped when there is only one) ---------- */

export async function renderHome(root) {
  root.innerHTML = `<p class="text-ink/40">${t('common.loading')}</p>`;
  const { data: properties, error } = await supabase.from('properties').select('*').order('name');
  if (error) { root.innerHTML = `<p class="text-sienna2">${t('portal.load_error')}</p>`; return; }

  if (!properties || !properties.length) {
    root.innerHTML = `
      <div class="bg-white border border-rule rounded-2xl p-10 text-center">
        <h1 class="text-[20px] font-semibold">${t('portal.no_property_title')}</h1>
        <p class="mt-2 text-[14px] text-ink/55">${t('portal.no_property_body')}</p>
      </div>`;
    return;
  }
  if (properties.length === 1) { navigate(`/property/${properties[0].id}`); return; }

  root.innerHTML = `
    <h1 class="text-[24px] font-semibold mb-1">${t('portal.your_properties')}</h1>
    <p class="text-[14px] text-ink/55 mb-6">${t('portal.choose_property')}</p>
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"></div>
  `;
  const grid = root.querySelector('.grid');
  properties.forEach(p => {
    const card = document.createElement('a');
    card.href = `#/property/${p.id}`;
    card.className = 'block bg-white border border-rule rounded-2xl p-6 hover:border-sienna hover:shadow-sm transition-all';
    card.innerHTML = `
      <div class="text-[11px] uppercase tracking-[.18em] text-leaf2 mb-2">${propertyTypeLabel(p.type)}</div>
      <div class="text-[17px] font-semibold">${escapeHtml(p.name)}</div>
      <div class="mt-1 text-[13.5px] text-ink/55">${escapeHtml([p.address, p.city].filter(Boolean).join(', ') || '')}</div>
    `;
    grid.appendChild(card);
  });
}

/* ---------- property overview: hero "next maintenance" + component cards ---------- */

export function nextMaintenance(components) {
  // Nearest upcoming/overdue next_inspection_date across each component's latest dated entry.
  let best = null;
  for (const c of components) {
    const latestDated = (c.maintenance_entries || []).filter(e => e.next_inspection_date).slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    if (!latestDated) continue;
    if (!best || latestDated.next_inspection_date < best.entry.next_inspection_date) {
      best = { component: c, entry: latestDated };
    }
  }
  return best;
}

function heroCard(components) {
  const next = nextMaintenance(components);
  if (!next) {
    return `
      <div class="rounded-2xl p-7 border border-rule bg-white">
        <div class="text-[11px] uppercase tracking-[.18em] text-ink/45 mb-2">${t('portal.hero.title')}</div>
        <div class="text-[19px] font-semibold" style="color:#4C8B30;">${t('portal.hero.none_title')}</div>
        <p class="mt-1.5 text-[13.5px] text-ink/55">${t('portal.hero.none_body')}</p>
      </div>`;
  }
  const d = new Date(next.entry.next_inspection_date);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((d - today) / DAY);
  let accentBg = 'rgba(95,168,60,.10)', accentBorder = 'rgba(95,168,60,.35)', accentFg = '#4C8B30', note = '';
  if (days < 0) { accentBg = 'rgba(206,27,36,.07)'; accentBorder = 'rgba(206,27,36,.35)'; accentFg = '#A3141B'; note = t('portal.hero.overdue_note'); }
  else if (days <= 90) { accentBg = '#FDF3D8'; accentBorder = '#EAD9A0'; accentFg = '#8A6D1D'; note = t('portal.hero.soon_note'); }
  return `
    <div class="rounded-2xl p-7 border" style="background:${accentBg};border-color:${accentBorder};">
      <div class="text-[11px] uppercase tracking-[.18em] text-ink/45 mb-2">${t('portal.hero.title')}</div>
      <div class="text-[24px] font-semibold" style="color:${accentFg};">${fmtDate(d)}</div>
      <div class="mt-1 text-[14.5px]">${escapeHtml(componentTypeLabel(next.component.component_type))}${next.component.label ? ' — ' + escapeHtml(next.component.label) : ''}</div>
      ${next.entry.next_maintenance_advice ? `<p class="mt-2 text-[13.5px] text-ink/60">${escapeHtml(next.entry.next_maintenance_advice)}</p>` : ''}
      ${note ? `<p class="mt-2 text-[12.5px] text-ink/50">${note}</p>` : ''}
    </div>`;
}

export async function renderProperty(root, id) {
  root.innerHTML = `<p class="text-ink/40">${t('common.loading')}</p>`;
  const { property, components } = await fetchPropertyWithComponents(id);
  if (!property) { root.innerHTML = `<p class="text-sienna2">${t('portal.property_not_found')}</p>`; return; }

  const isVve = property.type === 'vve';
  root.innerHTML = `
    <div class="mb-7">
      <div class="text-[11px] uppercase tracking-[.18em] text-leaf2 mb-2">${propertyTypeLabel(property.type)}</div>
      <h1 class="text-[26px] font-semibold leading-tight">${escapeHtml(property.name)}</h1>
      <p class="mt-1 text-[14px] text-ink/55">${escapeHtml([property.address, property.postcode, property.city].filter(Boolean).join(', ') || '')}</p>
      ${isVve ? `<a href="#/property/${id}/rapport" class="no-print inline-flex items-center gap-2 mt-4 px-4 py-2.5 border border-rule rounded-lg text-[13.5px] hover:border-sienna transition-colors bg-white">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
        ${t('portal.rapport_btn')}
      </a>` : ''}
    </div>
    ${heroCard(components)}
    <h2 class="mt-9 mb-4 text-[11px] uppercase tracking-[.18em] text-ink/50">${t('portal.components_title')}</h2>
    <div id="components-grid" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"></div>
  `;

  const grid = root.querySelector('#components-grid');
  if (!components.length) {
    grid.innerHTML = `<p class="text-[14px] text-ink/50">${t('portal.no_components')}</p>`;
    return;
  }
  components.forEach(c => {
    const latest = latestEntry(c);
    const nextDate = (c.maintenance_entries || []).filter(e => e.next_inspection_date).slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]?.next_inspection_date;
    const entryCount = (c.maintenance_entries || []).length;
    const card = document.createElement('a');
    card.href = `#/property/${id}/component/${c.id}`;
    card.className = 'block bg-white border border-rule rounded-2xl p-5 hover:border-sienna hover:shadow-sm transition-all';
    card.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="text-[15.5px] font-semibold">${escapeHtml(componentTypeLabel(c.component_type))}${c.label ? '<span class="font-normal text-ink/55"> — ' + escapeHtml(c.label) + '</span>' : ''}</div>
        ${statusPill(latest?.status, 'status.none')}
      </div>
      ${nextDate ? `<div class="mt-3 text-[13px] text-ink/55">${t('portal.next_inspection', { date: fmtDate(nextDate) })}</div>` : ''}
      <div class="mt-1 text-[13px] text-ink/40">${tPlural('portal.registrations', entryCount)} →</div>
    `;
    grid.appendChild(card);
  });
}

/* ---------- component history: read-only timeline with photos ---------- */

export async function renderComponent(root, pid, cid) {
  root.innerHTML = `<p class="text-ink/40">${t('common.loading')}</p>`;
  const [{ data: component }, { data: entries }] = await Promise.all([
    supabase.from('building_components').select('*, properties(id, name)').eq('id', cid).single(),
    supabase.from('maintenance_entries')
      .select('*, maintenance_photos(id, storage_path, phase)')
      .eq('component_id', cid).order('created_at', { ascending: false }),
  ]);
  if (!component) { root.innerHTML = `<p class="text-sienna2">${t('portal.component_not_found')}</p>`; return; }

  root.innerHTML = `
    <a href="#/property/${pid}" class="text-[13px] text-ink/50 hover:text-sienna">&larr; ${escapeHtml(component.properties.name)}</a>
    <h1 class="mt-3 mb-6 text-[24px] font-semibold">${escapeHtml(componentTypeLabel(component.component_type))}${component.label ? '<span class="font-normal text-ink/55"> — ' + escapeHtml(component.label) + '</span>' : ''}</h1>
    <div id="timeline" class="space-y-4"></div>
  `;
  const timeline = root.querySelector('#timeline');
  if (!entries || !entries.length) {
    timeline.innerHTML = `<p class="text-[14px] text-ink/50">${t('portal.no_entries')}</p>`;
    return;
  }

  for (const e of entries) {
    const card = document.createElement('div');
    card.className = 'bg-white border border-rule rounded-2xl p-6';
    card.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="text-[15px] font-semibold">${e.date_carried_out ? fmtDate(e.date_carried_out) : t('status.planned')}</div>
        ${statusPill(e.status)}
      </div>
      ${e.work_done ? `<p class="mt-3 text-[14.5px] leading-relaxed">${escapeHtml(e.work_done)}</p>` : ''}
      <dl class="mt-3 space-y-1.5 text-[13.5px]">
        ${e.findings ? `<div><dt class="inline text-ink/45">${t('common.findings')} </dt><dd class="inline">${escapeHtml(e.findings)}</dd></div>` : ''}
        ${e.materials_used ? `<div><dt class="inline text-ink/45">${t('common.materials')} </dt><dd class="inline">${escapeHtml(e.materials_used)}</dd></div>` : ''}
        ${e.handover_notes ? `<div><dt class="inline text-ink/45">${t('common.handover')} </dt><dd class="inline">${escapeHtml(e.handover_notes)}</dd></div>` : ''}
        ${e.next_inspection_date ? `<div><dt class="inline text-ink/45">${t('common.next_inspection')} </dt><dd class="inline font-semibold">${fmtDate(e.next_inspection_date)}</dd></div>` : ''}
      </dl>
      <div class="photo-groups mt-4 space-y-3"></div>
    `;
    timeline.appendChild(card);

    const photos = e.maintenance_photos || [];
    if (photos.length) {
      const groupsBox = card.querySelector('.photo-groups');
      // Sign all URLs in parallel; group by phase in before/during/after order.
      const signed = await Promise.all(photos.map(async p => {
        const { data } = await supabase.storage.from('maintenance-photos').createSignedUrl(p.storage_path, 3600);
        return data ? { ...p, url: data.signedUrl } : null;
      }));
      for (const phase of ['before', 'during', 'after']) {
        const group = signed.filter(p => p && p.phase === phase);
        if (!group.length) continue;
        const groupEl = document.createElement('div');
        groupEl.innerHTML = `<div class="text-[11px] uppercase tracking-[.15em] text-ink/45 mb-1.5">${t(`phase.${phase}`)}</div><div class="flex flex-wrap gap-2"></div>`;
        const thumbs = groupEl.querySelector('.flex');
        group.forEach(p => {
          const a = document.createElement('a');
          a.href = p.url; a.target = '_blank'; a.rel = 'noopener';
          a.innerHTML = `<img src="${p.url}" class="w-24 h-24 object-cover rounded-lg border border-rule hover:opacity-90" alt="${t('portal.photo_alt', { phase: t(`phase.${phase}`) })}" />`;
          thumbs.appendChild(a);
        });
        groupsBox.appendChild(groupEl);
      }
    }
  }
}
