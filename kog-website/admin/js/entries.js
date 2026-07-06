import { supabase } from './supabaseClient.js';
import { showModal, val, escapeHtml } from './properties.js';
import { componentTypeLabel } from './components.js';
import { statusBadge } from './status.js';
import { computeNextInspection } from './intervals.js';
import { navigate } from './router.js';

const STATUS_OPTIONS = [
  ['planned', 'Gepland'], ['quoted', 'Offerte uitgebracht'], ['in_progress', 'In uitvoering'],
  ['completed', 'Afgerond'], ['inspection_needed', 'Inspectie nodig'],
];
const PHASES = [['before', 'Vóór'], ['during', 'Tijdens'], ['after', 'Ná']];

export async function renderComponentDetail(root, id) {
  root.innerHTML = `<p class="text-ink/50">Laden…</p>`;
  const { data: component, error } = await supabase.from('building_components').select('*, properties(id, name)').eq('id', id).single();
  if (error || !component) { root.innerHTML = `<p class="text-sienna2">Bouwdeel niet gevonden.</p>`; return; }

  const { data: entries } = await supabase.from('maintenance_entries')
    .select('*, maintenance_photos(id, storage_path, phase)')
    .eq('component_id', id).order('created_at', { ascending: false });

  root.innerHTML = `
    <a href="#/properties/${component.properties.id}" class="text-[13px] text-ink/50 hover:text-sienna">&larr; ${escapeHtml(component.properties.name)}</a>
    <div class="flex items-center justify-between mt-3 mb-5">
      <h1 class="text-[22px] font-semibold">${escapeHtml(componentTypeLabel(component.component_type))}${component.label ? ' — ' + escapeHtml(component.label) : ''}</h1>
      <button id="btn-new-entry" class="px-4 py-2.5 bg-sienna text-white rounded text-[13.5px] hover:bg-sienna2 whitespace-nowrap">+ Werk loggen</button>
    </div>
    <div id="entries-list" class="space-y-3"></div>
  `;
  root.querySelector('#btn-new-entry').addEventListener('click', () => openEntryForm(component));

  const list = root.querySelector('#entries-list');
  if (!entries || !entries.length) { list.innerHTML = `<p class="text-ink/50">Nog geen werk gelogd voor dit bouwdeel.</p>`; return; }

  for (const e of entries) {
    const card = document.createElement('div');
    card.className = 'p-4 border border-rule rounded-lg bg-white';
    const dateStr = e.date_carried_out ? new Date(e.date_carried_out).toLocaleDateString('nl-NL') : 'Nog geen datum';
    const nextStr = e.next_inspection_date ? new Date(e.next_inspection_date).toLocaleDateString('nl-NL') : '—';
    card.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-2">
        <span class="text-[13px] text-ink/60">${dateStr}</span>
      </div>
      <p class="mt-2 text-[14px]">${escapeHtml(e.work_done || '(geen omschrijving)')}</p>
      ${e.findings ? `<p class="mt-1 text-[13px] text-ink/60">Bevindingen: ${escapeHtml(e.findings)}</p>` : ''}
      ${e.materials_used ? `<p class="mt-1 text-[13px] text-ink/60">Materialen: ${escapeHtml(e.materials_used)}</p>` : ''}
      <p class="mt-2 text-[12px] text-ink/50">Volgende inspectie: ${nextStr}</p>
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
  showModal('Werk loggen', `
    <div class="form-grid">
      <label class="fld">Datum uitgevoerd<input id="f-date" type="date" value="${today}" /></label>
      <label class="fld">Status *
        <select id="f-status" required>
          ${STATUS_OPTIONS.map(([v, l]) => `<option value="${v}" ${v === 'completed' ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </label>
    </div>
    <label class="fld mt-3">Uitgevoerd werk<textarea id="f-work_done" rows="2"></textarea></label>
    <label class="fld mt-3">Bevindingen (houtrot, scheuren, vocht, etc.)<textarea id="f-findings" rows="2"></textarea></label>
    <label class="fld mt-3">Gebruikte materialen<input id="f-materials_used" placeholder="merk verf, systeem, coating" /></label>
    <label class="fld mt-3">Overdrachtsnotities<textarea id="f-handover_notes" rows="2"></textarea></label>
    <label class="fld mt-3">Volgende inspectiedatum (automatisch berekend, aan te passen)
      <input id="f-next_inspection_date" type="date" value="${initialNext.date}" />
    </label>
    <div class="mt-4">
      <p class="text-[11px] uppercase tracking-wide text-ink/50 mb-2">Foto's</p>
      <div class="grid grid-cols-3 gap-2">
        ${PHASES.map(([v, l]) => `
          <label class="fld text-center">
            ${l}
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

    for (const [phase] of PHASES) {
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
