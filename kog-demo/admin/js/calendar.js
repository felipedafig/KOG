// Shared maintenance calendar: inline week strip + full month modal.
// Used by mijn-pand/ (one property's events) and the admin Agenda (all properties) —
// keep free of app-specific behavior; events carry their own labels and links.
//
// Event shape: { date: Date, dateStr: 'YYYY-MM-DD', accent, line1, line2, href }
//   line1 — main label (portal: component; admin: property name)
//   line2 — secondary label (portal: advice sentence; admin: component)
//   href  — hash route to navigate to from the month modal's event list
import { t, formatDate, getLang } from './i18n.js';

const DAY = 24 * 60 * 60 * 1000;

// Backgrounds are OPAQUE (tints composited over the paper background), so stacked
// cards and chips never show the page through them.
export function urgencyAccent(dateStr, today) {
  const days = Math.round((new Date(dateStr) - today) / DAY);
  if (days < 0) return { bg: '#F7EAEA', border: 'rgba(206,27,36,.35)', fg: '#A3141B', noteKey: 'portal.hero.overdue_note' };
  if (days <= 90) return { bg: '#FDF3D8', border: '#EAD9A0', fg: '#8A6D1D', noteKey: 'portal.hero.soon_note' };
  return { bg: '#ECF3E5', border: 'rgba(95,168,60,.35)', fg: '#4C8B30', noteKey: null };
}

// Date-only helpers that work in the browser's local timezone (event dates are stored
// as 'YYYY-MM-DD' strings; parsing them as local avoids the UTC-midnight day shift).
export function parseYmd(s) { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function startOfWeek(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, -((x.getDay() + 6) % 7)); } // Monday-first
function calLocale() { return getLang() === 'en' ? 'en-GB' : 'nl-NL'; }
function weekdayShort(d) { return new Intl.DateTimeFormat(calLocale(), { weekday: 'short' }).format(d).replace('.', ''); }
function monthYear(d) { return new Intl.DateTimeFormat(calLocale(), { month: 'long', year: 'numeric' }).format(d); }
function fmtLong(d) { return formatDate(d, { long: true }); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// Inline week strip: shows one week at a time (current week by default), event dots on
// days, prev/next-week arrows, a "full calendar" button, and a prominent "next event"
// jump that walks forward through the events, wrapping around at the end.
export function mountWeekCalendar(container, events, today) {
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
        <div class="flex flex-col items-center flex-1 py-1 rounded-lg ${isToday ? 'bg-paper2' : ''}">
          <div class="text-[10px] uppercase tracking-wide text-ink/40">${weekdayShort(day)}</div>
          <div class="mt-0.5 text-[14px] ${isToday ? 'font-bold text-sienna' : 'text-ink/80'}">${day.getDate()}</div>
          ${dot}
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="h-full flex flex-col bg-white border border-rule rounded-2xl p-4">
        <div class="flex items-center justify-between mb-2.5">
          <div class="flex items-center gap-1.5">
            <button data-prev aria-label="&lt;" class="w-7 h-7 rounded-full hover:bg-paper2 flex items-center justify-center text-ink/50 text-[16px] leading-none">&lsaquo;</button>
            <span class="text-[13px] font-semibold capitalize">${monthYear(weekStart)}</span>
            <button data-next aria-label="&gt;" class="w-7 h-7 rounded-full hover:bg-paper2 flex items-center justify-center text-ink/50 text-[16px] leading-none">&rsaquo;</button>
          </div>
          <button data-full class="text-[12.5px] text-sienna hover:text-sienna2 whitespace-nowrap">${t('cal.full_button')}</button>
        </div>
        <div class="flex gap-1">${dayCells}</div>
        <div class="mt-auto pt-3">
          ${next ? `
            <button data-jump class="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-left hover:shadow-sm transition-all" style="border-color:${next.accent.border};background:${next.accent.bg}">
              <div class="min-w-0">
                <div class="text-[10px] uppercase tracking-[.14em] text-ink/45">${t('cal.next')}</div>
                <div class="text-[15px] font-semibold truncate" style="color:${next.accent.fg}">${fmtLong(next.dateStr)}</div>
                <div class="text-[12px] text-ink/55 truncate">${esc(next.line1)}</div>
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
// (each links to its event's href), and a "jump to next maintenance" button.
export function openMonthCalendar(events, today, focusDate) {
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
          <a href="${e.href}" data-nav class="flex items-center justify-between gap-3 p-3 rounded-xl border hover:shadow-sm transition-all" style="border-color:${e.accent.border};background:${e.accent.bg}">
            <div class="min-w-0">
              <div class="text-[14px] font-semibold" style="color:${e.accent.fg}">${fmtLong(e.dateStr)}</div>
              <div class="text-[13px] font-semibold truncate">${esc(e.line1)}</div>
              ${e.line2 ? `<div class="text-[12.5px] text-ink/60 truncate">${esc(e.line2)}</div>` : ''}
            </div>
            <span class="text-[16px]" style="color:${e.accent.fg}">&rarr;</span>
          </a>`).join('') : `<p class="text-[13px] text-ink/45 text-center py-3">${t('cal.no_month')}</p>`}
      </div>
      ${nextAfter ? `<button data-jumpnext class="w-full mt-3 py-2.5 rounded-xl bg-ink text-white text-[13px] hover:opacity-90 transition-opacity">${t('cal.jump_next')} &rarr;</button>` : ''}
    `;

    body.querySelector('[data-pm]').addEventListener('click', () => { cur = new Date(y, m - 1, 1); renderMonth(); });
    body.querySelector('[data-nm]').addEventListener('click', () => { cur = new Date(y, m + 1, 1); renderMonth(); });
    body.querySelector('[data-jumpnext]')?.addEventListener('click', () => { cur = new Date(nextAfter.date.getFullYear(), nextAfter.date.getMonth(), 1); renderMonth(); });
    body.querySelectorAll('a[data-nav]').forEach(a => a.addEventListener('click', close)); // close after routing
  };
  renderMonth();
}
