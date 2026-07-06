import { supabase } from '../../admin/js/supabaseClient.js';
import { navigate } from '../../admin/js/router.js';
import { STATUS_META, statusLabel } from '../../admin/js/status.js';
import { componentTypeLabel } from '../../admin/js/components.js';
import { t, tPlural, formatDate, getLang } from '../../admin/js/i18n.js';

// Client-facing views: strictly read-only, progressive disclosure
// (property -> components -> history), status always shown as a color.

const DAY = 24 * 60 * 60 * 1000;
const STACK_STEP = 11; // px of top/right peek per wallet-stack layer, shared with the calendar's alignment offset

// How far the stack's outermost layer pokes above the front card's own top edge —
// used both to build the layers and to align the calendar column beside it.
function stackPeek(total) {
  return Math.min(Math.max(total - 1, 0), 2) * STACK_STEP;
}

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
  return `<span class="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap" style="background:${bg};color:${fg}">${label}</span>`;
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

// Every component's latest dated entry, soonest-first. The hero shows the front one;
// the rest render as receding "wallet" layers behind it and populate the "see all" modal.
export function upcomingMaintenanceList(components) {
  const items = [];
  for (const c of components) {
    const latestDated = (c.maintenance_entries || []).filter(e => e.next_inspection_date).slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    if (latestDated) items.push({ component: c, entry: latestDated });
  }
  return items.sort((a, b) => a.entry.next_inspection_date.localeCompare(b.entry.next_inspection_date));
}

export function nextMaintenance(components) {
  return upcomingMaintenanceList(components)[0] || null;
}

// Backgrounds are OPAQUE (the same tints composited over the paper background), so
// stacked cards never show the page or each other through them.
function urgencyAccent(dateStr, today) {
  const days = Math.round((new Date(dateStr) - today) / DAY);
  if (days < 0) return { bg: '#F7EAEA', border: 'rgba(206,27,36,.35)', fg: '#A3141B', noteKey: 'portal.hero.overdue_note' };
  if (days <= 90) return { bg: '#FDF3D8', border: '#EAD9A0', fg: '#8A6D1D', noteKey: 'portal.hero.soon_note' };
  return { bg: '#ECF3E5', border: 'rgba(95,168,60,.35)', fg: '#4C8B30', noteKey: null };
}

// Renders the hero as a "wallet" of cards: the soonest item on top, up to two more
// peeking out behind it (scaled down, offset down-right), and a count badge. Clicking
// the stack opens a modal listing every upcoming item. Collapses to a single plain
// card (no stack, no badge, not clickable) when there is nothing — or only one thing —
// to show behind it.
function heroCard(list) {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  if (!list.length) {
    return `
      <div class="rounded-2xl p-7 border border-rule bg-white w-full h-full">
        <div class="text-[11px] uppercase tracking-[.18em] text-ink/45 mb-2">${t('portal.hero.title')}</div>
        <div class="text-[19px] font-semibold" style="color:#4C8B30;">${t('portal.hero.none_title')}</div>
        <p class="mt-1.5 text-[13.5px] text-ink/55">${t('portal.hero.none_body')}</p>
      </div>`;
  }

  const front = list[0];
  const behind = list.slice(1);
  const total = list.length;
  const accent = urgencyAccent(front.entry.next_inspection_date, today);
  const note = accent.noteKey ? t(accent.noteKey) : '';

  // Each layer behind the front card is offset purely up-and-right (no scale), so it
  // peeks out ONLY along the top and right edges — the left and bottom stay tucked
  // behind the front card for a clean "wallet"/deck look.
  const behindLayers = behind.slice(0, 2).map((item, i) => {
    const a = urgencyAccent(item.entry.next_inspection_date, today);
    const depth = i + 1; // 1 = nearest behind layer, 2 = most recessed
    const off = depth * STACK_STEP;
    return `<div class="absolute inset-0 rounded-2xl border" style="background:${a.bg};border-color:${a.border};box-shadow:0 6px 16px -10px rgba(26,26,26,.22);transform:translate(${off}px,-${off}px);z-index:${10 - depth};"></div>`;
  }).join('');

  // Count badge sits on the outermost layer's top-right corner, pulsing to invite a click.
  const maxOff = stackPeek(total);
  const badge = total > 1
    ? `<div class="kog-count-badge absolute z-30 flex items-center justify-center text-white text-[13px] font-bold"
            style="top:-${maxOff}px;right:-${maxOff}px;transform:translate(50%,-50%);width:30px;height:30px;border-radius:9999px;background:#CE1B24;border:2px solid #FAFAF8;">
         <span>${total}</span>
       </div>`
    : '';

  return `
    <div id="hero-stack" class="relative w-full ${total > 1 ? 'cursor-pointer' : ''}">
      ${behindLayers}
      <div class="relative z-20 rounded-2xl p-7 border" style="background:${accent.bg};border-color:${accent.border};${total > 1 ? 'box-shadow:0 14px 30px -16px rgba(26,26,26,.25);' : ''}">
        <div class="text-[11px] uppercase tracking-[.18em] text-ink/45 mb-2">${t('portal.hero.title')}</div>
        <div class="text-[24px] font-semibold" style="color:${accent.fg};">${fmtDate(front.entry.next_inspection_date)}</div>
        <div class="mt-1 text-[14.5px]">${escapeHtml(componentTypeLabel(front.component.component_type))}${front.component.label ? ' — ' + escapeHtml(front.component.label) : ''}</div>
        ${front.entry.next_maintenance_advice ? `<p class="mt-2 text-[13.5px] text-ink/60">${escapeHtml(front.entry.next_maintenance_advice)}</p>` : ''}
        ${note ? `<p class="mt-2 text-[12.5px] text-ink/50">${note}</p>` : ''}
      </div>
      ${badge}
    </div>`;
}

// "See all" popup — every upcoming item rendered as its own compact card, soonest first.
function openUpcomingModal(list) {
  document.getElementById('upcoming-modal')?.remove();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const modal = document.createElement('div');
  modal.id = 'upcoming-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/50" data-close></div>
    <div class="relative bg-paper rounded-2xl max-w-lg w-full max-h-[85vh] overflow-auto p-6 shadow-xl">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-[18px] font-semibold">${t('portal.upcoming.title')}</h2>
        <button data-close class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-paper2" aria-label="${t('common.close')}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6l-12 12"/></svg>
        </button>
      </div>
      <div id="upcoming-modal-list" class="space-y-3"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => { modal.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  document.addEventListener('keydown', onKey);

  const listBox = modal.querySelector('#upcoming-modal-list');
  list.forEach(({ component, entry }) => {
    const a = urgencyAccent(entry.next_inspection_date, today);
    const item = document.createElement('div');
    item.className = 'rounded-xl p-4 border';
    item.style.background = a.bg;
    item.style.borderColor = a.border;
    item.innerHTML = `
      <div class="text-[16px] font-semibold" style="color:${a.fg}">${fmtDate(entry.next_inspection_date)}</div>
      <div class="mt-0.5 text-[13.5px]">${escapeHtml(componentTypeLabel(component.component_type))}${component.label ? ' — ' + escapeHtml(component.label) : ''}</div>
      ${entry.next_maintenance_advice ? `<p class="mt-1.5 text-[12.5px] text-ink/60">${escapeHtml(entry.next_maintenance_advice)}</p>` : ''}
    `;
    listBox.appendChild(item);
  });
}

/* ---------- maintenance calendar: inline week strip + full month modal ---------- */

// Date-only helpers that work in the browser's local timezone (event dates are stored
// as 'YYYY-MM-DD' strings; parsing them as local avoids the UTC-midnight day shift).
function parseYmd(s) { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function startOfWeek(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, -((x.getDay() + 6) % 7)); } // Monday-first
function calLocale() { return getLang() === 'en' ? 'en-GB' : 'nl-NL'; }
function weekdayShort(d) { return new Intl.DateTimeFormat(calLocale(), { weekday: 'short' }).format(d).replace('.', ''); }
function monthYear(d) { return new Intl.DateTimeFormat(calLocale(), { month: 'long', year: 'numeric' }).format(d); }

// Flattens the upcoming list into sorted calendar events carrying their urgency accent.
function toCalendarEvents(pid, upcoming, today) {
  return upcoming.map(({ component, entry }) => ({
    pid,
    component,
    entry,
    dateStr: entry.next_inspection_date,
    date: parseYmd(entry.next_inspection_date),
    accent: urgencyAccent(entry.next_inspection_date, today),
  })).sort((a, b) => a.date - b.date);
}

// Inline week strip: shows one week at a time (current week by default), event dots on
// days, prev/next-week arrows, a "full calendar" button, and a prominent "next event"
// jump that walks forward through the events. Fills its column and matches the card height.
function mountWeekCalendar(container, events, today) {
  let weekStart = startOfWeek(today);

  const render = () => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weekEnd = days[6];
    // Soonest event strictly after the shown week; wrap to the first upcoming one so
    // repeated clicks cycle through everything.
    let next = events.find(e => e.date > weekEnd);
    if (!next && events.length) next = events.find(e => e.date >= startOfWeek(today)) || events[0];

    const dayCells = days.map(day => {
      const dayEvents = events.filter(e => sameDay(e.date, day));
      const isToday = sameDay(day, today);
      const dot = dayEvents.length
        ? `<span class="mt-1 w-1.5 h-1.5 rounded-full" style="background:${dayEvents[0].accent.fg}"></span>`
        : `<span class="mt-1 w-1.5 h-1.5"></span>`;
      return `
        <div class="flex flex-col items-center flex-1 py-1.5 rounded-lg ${isToday ? 'bg-paper2' : ''}">
          <div class="text-[10px] uppercase tracking-wide text-ink/40">${weekdayShort(day)}</div>
          <div class="mt-0.5 text-[14px] ${isToday ? 'font-bold text-sienna' : 'text-ink/80'}">${day.getDate()}</div>
          ${dot}
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="h-full flex flex-col bg-white border border-rule rounded-2xl p-5">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-1.5">
            <button data-prev aria-label="&lt;" class="w-7 h-7 rounded-full hover:bg-paper2 flex items-center justify-center text-ink/50 text-[16px] leading-none">&lsaquo;</button>
            <span class="text-[13px] font-semibold capitalize">${monthYear(weekStart)}</span>
            <button data-next aria-label="&gt;" class="w-7 h-7 rounded-full hover:bg-paper2 flex items-center justify-center text-ink/50 text-[16px] leading-none">&rsaquo;</button>
          </div>
          <button data-full class="text-[12.5px] text-sienna hover:text-sienna2 whitespace-nowrap">${t('cal.full_button')}</button>
        </div>
        <div class="flex gap-1">${dayCells}</div>
        <div class="mt-auto pt-4">
          ${next ? `
            <button data-jump class="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left hover:shadow-sm transition-all" style="border-color:${next.accent.border};background:${next.accent.bg}">
              <div class="min-w-0">
                <div class="text-[10px] uppercase tracking-[.14em] text-ink/45">${t('cal.next')}</div>
                <div class="text-[15px] font-semibold truncate" style="color:${next.accent.fg}">${fmtDate(next.dateStr)}</div>
                <div class="text-[12px] text-ink/55 truncate">${escapeHtml(componentTypeLabel(next.component.component_type))}${next.component.label ? ' — ' + escapeHtml(next.component.label) : ''}</div>
              </div>
              <span class="text-[18px]" style="color:${next.accent.fg}">&rarr;</span>
            </button>`
            : `<div class="text-[13px] text-ink/45 text-center py-3">${t('cal.none')}</div>`}
        </div>
      </div>`;

    container.querySelector('[data-prev]').addEventListener('click', () => { weekStart = addDays(weekStart, -7); render(); });
    container.querySelector('[data-next]').addEventListener('click', () => { weekStart = addDays(weekStart, 7); render(); });
    container.querySelector('[data-full]').addEventListener('click', () => openMonthCalendar(events, today, weekStart));
    const jump = container.querySelector('[data-jump]');
    if (jump) jump.addEventListener('click', () => { weekStart = startOfWeek(next.date); render(); });
  };
  render();
}

// Full month grid in a modal: prev/next month, event dots, this-month event list
// (each links to its component), and a "jump to next maintenance" button.
function openMonthCalendar(events, today, focusDate) {
  document.getElementById('cal-modal')?.remove();
  let cur = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);

  const modal = document.createElement('div');
  modal.id = 'cal-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/50" data-close></div>
    <div class="relative bg-paper rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto p-6 shadow-xl">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-[18px] font-semibold">${t('cal.title')}</h2>
        <button data-close class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-paper2" aria-label="${t('common.close')}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6l-12 12"/></svg>
        </button>
      </div>
      <div id="cal-body"></div>
    </div>`;
  document.body.appendChild(modal);

  const close = () => { modal.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  document.addEventListener('keydown', onKey);
  const body = modal.querySelector('#cal-body');

  const renderMonth = () => {
    const y = cur.getFullYear(), m = cur.getMonth();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const headers = Array.from({ length: 7 }, (_, i) => weekdayShort(addDays(startOfWeek(new Date(2024, 0, 1)), i)));

    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<div></div>');
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(y, m, d);
      const dayEvents = events.filter(e => sameDay(e.date, day));
      const isToday = sameDay(day, today);
      const dot = dayEvents.length ? `<span class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style="background:${dayEvents[0].accent.fg}"></span>` : '';
      const bg = isToday ? 'bg-sienna text-white font-bold' : (dayEvents.length ? 'bg-paper2' : '');
      cells.push(`<div class="relative aspect-square flex items-center justify-center text-[13px] rounded-lg ${bg}">${d}${dot}</div>`);
    }

    const monthEvents = events.filter(e => e.date.getFullYear() === y && e.date.getMonth() === m);
    const nextAfter = events.find(e => e.date.getFullYear() > y || (e.date.getFullYear() === y && e.date.getMonth() > m));

    body.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <button data-pm class="w-8 h-8 rounded-full hover:bg-paper2 flex items-center justify-center text-[18px] leading-none">&lsaquo;</button>
        <span class="text-[15px] font-semibold capitalize">${monthYear(cur)}</span>
        <button data-nm class="w-8 h-8 rounded-full hover:bg-paper2 flex items-center justify-center text-[18px] leading-none">&rsaquo;</button>
      </div>
      <div class="grid grid-cols-7 gap-1 mb-1 text-center text-[10px] uppercase tracking-wide text-ink/40">
        ${headers.map(w => `<div>${w}</div>`).join('')}
      </div>
      <div class="grid grid-cols-7 gap-1">${cells.join('')}</div>
      <div class="mt-5 space-y-2">
        ${monthEvents.length ? monthEvents.map(e => `
          <a href="#/property/${e.pid}/component/${e.component.id}" data-nav class="flex items-center justify-between gap-3 p-3 rounded-xl border hover:shadow-sm transition-all" style="border-color:${e.accent.border};background:${e.accent.bg}">
            <div class="min-w-0">
              <div class="text-[14px] font-semibold" style="color:${e.accent.fg}">${fmtDate(e.dateStr)}</div>
              <div class="text-[12.5px] text-ink/60 truncate">${escapeHtml(componentTypeLabel(e.component.component_type))}${e.component.label ? ' — ' + escapeHtml(e.component.label) : ''}</div>
            </div>
            <span class="text-[16px]" style="color:${e.accent.fg}">&rarr;</span>
          </a>`).join('') : `<p class="text-[13px] text-ink/45 text-center py-3">${t('cal.no_month')}</p>`}
      </div>
      ${nextAfter ? `<button data-jumpnext class="w-full mt-3 py-2.5 rounded-xl bg-ink text-white text-[13px] hover:opacity-90 transition-opacity">${t('cal.jump_next')} &rarr;</button>` : ''}
    `;

    body.querySelector('[data-pm]').addEventListener('click', () => { cur = new Date(y, m - 1, 1); renderMonth(); });
    body.querySelector('[data-nm]').addEventListener('click', () => { cur = new Date(y, m + 1, 1); renderMonth(); });
    body.querySelector('[data-jumpnext]')?.addEventListener('click', () => { cur = new Date(nextAfter.date.getFullYear(), nextAfter.date.getMonth(), 1); renderMonth(); });
    body.querySelectorAll('a[data-nav]').forEach(a => a.addEventListener('click', close)); // close after routing to a component
  };
  renderMonth();
}

export async function renderProperty(root, id) {
  root.innerHTML = `<p class="text-ink/40">${t('common.loading')}</p>`;
  const { property, components } = await fetchPropertyWithComponents(id);
  if (!property) { root.innerHTML = `<p class="text-sienna2">${t('portal.property_not_found')}</p>`; return; }

  const isVve = property.type === 'vve';
  const upcoming = upcomingMaintenanceList(components);
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
    <div class="flex flex-col lg:flex-row gap-5 lg:items-stretch mt-10 mb-9">
      <div class="relative w-full lg:w-[560px] lg:flex-none pr-10">${heroCard(upcoming)}</div>
      <div id="week-cal" class="w-full lg:flex-1 min-w-0 ${stackPeek(upcoming.length) ? `lg:relative lg:top-[-${stackPeek(upcoming.length)}px]` : ''}"></div>
    </div>
    <h2 class="mt-2 mb-4 text-[11px] uppercase tracking-[.18em] text-ink/50">${t('portal.components_title')}</h2>
    <div id="components-grid" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"></div>
  `;

  if (upcoming.length > 1) {
    root.querySelector('#hero-stack')?.addEventListener('click', () => openUpcomingModal(upcoming));
  }

  const calToday = new Date(); calToday.setHours(0, 0, 0, 0);
  mountWeekCalendar(root.querySelector('#week-cal'), toCalendarEvents(id, upcoming, calToday), calToday);

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
