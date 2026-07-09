import { supabase } from './supabaseClient.js';
import { showModal, val, escapeHtml } from './properties.js';
import { componentTypeLabel } from './components.js';
import { statusBadge } from './status.js';
import { computeNextInspection } from './intervals.js';
import { navigate } from './router.js';
import { t, formatDate } from './i18n.js';

const STATUS_OPTIONS = ['planned', 'quoted', 'in_progress', 'completed', 'inspection_needed'];
const PHASES = ['before', 'during', 'after'];

export async function renderComponentDetail(root, id) {
  root.innerHTML = `<p class="text-ink/50">${t('common.loading')}</p>`;
  const { data: component, error } = await supabase.from('building_components').select('*, properties(id, name)').eq('id', id).single();
  if (error || !component) { root.innerHTML = `<p class="text-sienna2">${t('entries.not_found')}</p>`; return; }

  const { data: entries } = await supabase.from('maintenance_entries')
    .select('*, maintenance_photos(id, storage_path, phase)')
    .eq('component_id', id).order('created_at', { ascending: false });

  root.innerHTML = `
    <a href="#/properties/${component.properties.id}" class="text-[13px] text-ink/50 hover:text-sienna">&larr; ${escapeHtml(component.properties.name)}</a>
    <div class="flex items-center justify-between mt-3 mb-5">
      <h1 class="text-[22px] font-semibold">${escapeHtml(componentTypeLabel(component.component_type))}${component.label ? ' — ' + escapeHtml(component.label) : ''}</h1>
      <button id="btn-new-entry" class="px-4 py-2.5 bg-sienna text-white rounded text-[13.5px] hover:bg-sienna2 whitespace-nowrap">${t('entries.new_btn')}</button>
    </div>
    <div id="entries-list" class="space-y-3"></div>
  `;
  root.querySelector('#btn-new-entry').addEventListener('click', () => openEntryForm(component));

  const list = root.querySelector('#entries-list');
  if (!entries || !entries.length) { list.innerHTML = `<p class="text-ink/50">${t('entries.empty')}</p>`; return; }

  for (const e of entries) {
    const card = document.createElement('div');
    card.className = 'p-4 border border-rule rounded-lg bg-white';
    const dateStr = e.date_carried_out ? formatDate(e.date_carried_out) : t('entries.no_date');
    const nextStr = e.next_inspection_date ? formatDate(e.next_inspection_date) : '—';
    card.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-2">
        <span class="text-[13px] text-ink/60">${dateStr}</span>
      </div>
      <p class="mt-2 text-[14px]">${escapeHtml(e.work_done || t('entries.no_description'))}</p>
      ${e.findings ? `<p class="mt-1 text-[13px] text-ink/60">${t('common.findings')} ${escapeHtml(e.findings)}</p>` : ''}
      ${e.materials_used ? `<p class="mt-1 text-[13px] text-ink/60">${t('common.materials')} ${escapeHtml(e.materials_used)}</p>` : ''}
      <p class="mt-2 text-[12px] text-ink/50">${t('common.next_inspection')} ${nextStr}</p>
      <div class="photos mt-2 flex flex-wrap gap-2"></div>
    `;
    card.querySelector('.flex.items-center').appendChild(statusBadge(e.status));
    list.appendChild(card);

    const photosBox = card.querySelector('.photos');
    for (const photo of e.maintenance_photos || []) {
      const { data } = await supabase.storage.from('maintenance-photos').createSignedUrl(photo.storage_path, 3600);
      if (data) {
        const img = document.createElement('img');
        img.src = data.signedUrl;
        img.title = photo.phase;
        img.className = 'w-16 h-16 object-cover rounded border border-rule';
        photosBox.appendChild(img);
      }
    }
  }
}

export function openEntryForm(component) {
  const today = new Date().toISOString().slice(0, 10);
  const initialNext = computeNextInspection(component.component_type, today);
  showModal(t('entries.form.title'), `
    <div class="form-grid">
      <label class="fld">${t('entries.form.date')}<input id="f-date" type="date" value="${today}" /></label>
      <label class="fld">${t('entries.form.status')}
        <select id="f-status" required>
          ${STATUS_OPTIONS.map(v => `<option value="${v}" ${v === 'completed' ? 'selected' : ''}>${t(`status.${v}`)}</option>`).join('')}
        </select>
      </label>
    </div>
    <label class="fld mt-3">${t('entries.form.work_done')}<textarea id="f-work_done" rows="2"></textarea></label>
    <label class="fld mt-3">${t('entries.form.findings')}<textarea id="f-findings" rows="2"></textarea></label>
    <label class="fld mt-3">${t('entries.form.materials')}<input id="f-materials_used" placeholder="${t('entries.form.materials_placeholder')}" /></label>
    <label class="fld mt-3">${t('entries.form.handover')}<textarea id="f-handover_notes" rows="2"></textarea></label>
    <label class="fld mt-3">${t('entries.form.next_inspection')}
      <input id="f-next_inspection_date" type="date" value="${initialNext.date}" />
    </label>
    <div class="mt-4">
      <p class="text-[11px] uppercase tracking-wide text-ink/50 mb-2">${t('entries.form.photos')}</p>
      <div class="grid grid-cols-3 gap-2">
        ${PHASES.map(v => `
          <label class="fld text-center">
            ${t(`phase.${v}`)}
            <input id="f-photos-${v}" type="file" accept="image/*" capture="environment" multiple />
          </label>
        `).join('')}
      </div>
    </div>
  `, async () => {
    const payload = {
      component_id: component.id,
      date_carried_out: val('f-date') || null,
      status: val('f-status'),
      work_done: val('f-work_done') || null,
      findings: val('f-findings') || null,
      materials_used: val('f-materials_used') || null,
      handover_notes: val('f-handover_notes') || null,
      next_inspection_date: val('f-next_inspection_date') || null,
      next_maintenance_advice: computeNextInspection(component.component_type, val('f-date')).advice,
    };
    const { data: entry, error } = await supabase.from('maintenance_entries').insert(payload).select().single();
    if (error) throw error;

    for (const phase of PHASES) {
      const input = document.getElementById(`f-photos-${phase}`);
      for (const file of Array.from(input.files || [])) {
        const path = `${entry.id}/${phase}-${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from('maintenance-photos').upload(path, file);
        if (upErr) throw upErr;
        const { error: rowErr } = await supabase.from('maintenance_photos').insert({ entry_id: entry.id, storage_path: path, phase });
        if (rowErr) throw rowErr;
      }
    }
    return entry;
  }, () => navigate(`/components/${component.id}`));
}
