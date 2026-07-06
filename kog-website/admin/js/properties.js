import { supabase } from './supabaseClient.js';
import { navigate } from './router.js';

const PROPERTY_TYPE_LABEL = { home: 'Woonhuis', business: 'Bedrijfspand', vve: 'VvE-complex' };

export async function renderPropertiesList(root) {
  root.innerHTML = `
    <div class="flex items-center justify-between mb-5">
      <h1 class="text-[22px] font-semibold">Panden</h1>
      <button id="btn-new-property" class="px-4 py-2.5 bg-sienna text-white rounded text-[13.5px] hover:bg-sienna2">+ Nieuw pand</button>
    </div>
    <div id="properties-list" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"></div>
  `;
  root.querySelector('#btn-new-property').addEventListener('click', () => openPropertyForm());

  const list = root.querySelector('#properties-list');
  const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
  if (error) { list.innerHTML = `<p class="text-sienna2">Kon panden niet laden: ${error.message}</p>`; return; }
  if (!data.length) { list.innerHTML = `<p class="text-ink/50">Nog geen panden. Klik op "+ Nieuw pand" of converteer een aanvraag.</p>`; return; }

  data.forEach(p => {
    const card = document.createElement('a');
    card.href = `#/properties/${p.id}`;
    card.className = 'block p-4 border border-rule rounded-lg hover:border-sienna transition-colors bg-white';
    card.innerHTML = `
      <div class="text-[15px] font-semibold">${escapeHtml(p.name)}</div>
      <div class="text-[13px] text-ink/60 mt-1">${escapeHtml([p.address, p.city].filter(Boolean).join(', ') || '—')}</div>
      <div class="mt-2 inline-flex text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-paper2 text-ink/60">${PROPERTY_TYPE_LABEL[p.type] || p.type}</div>
    `;
    list.appendChild(card);
  });
}

export async function renderPropertyDetail(root, id) {
  root.innerHTML = `<p class="text-ink/50">Laden…</p>`;
  const { data: property, error } = await supabase.from('properties').select('*').eq('id', id).single();
  if (error || !property) { root.innerHTML = `<p class="text-sienna2">Pand niet gevonden.</p>`; return; }

  const { data: components } = await supabase.from('building_components').select('*, maintenance_entries(status, created_at)').eq('property_id', id).order('created_at');

  root.innerHTML = `
    <a href="#/properties" class="text-[13px] text-ink/50 hover:text-sienna">&larr; Alle panden</a>
    <div class="flex items-start justify-between mt-3 mb-5">
      <div>
        <h1 class="text-[22px] font-semibold">${escapeHtml(property.name)}</h1>
        <p class="text-[13.5px] text-ink/60 mt-1">${escapeHtml([property.address, property.postcode, property.city].filter(Boolean).join(', ') || '—')}</p>
        <p class="text-[13px] text-ink/50 mt-1">${escapeHtml(property.owner_name || '')} ${property.owner_email ? '· ' + escapeHtml(property.owner_email) : ''} ${property.owner_phone ? '· ' + escapeHtml(property.owner_phone) : ''}</p>
      </div>
      <button id="btn-new-component" class="px-4 py-2.5 bg-sienna text-white rounded text-[13.5px] hover:bg-sienna2 whitespace-nowrap">+ Bouwdeel</button>
    </div>
    <div id="components-list" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"></div>
    <div id="access-section" class="mt-10"></div>
  `;
  root.querySelector('#btn-new-component').addEventListener('click', () => openComponentForm(id));

  const list = root.querySelector('#components-list');
  if (!components || !components.length) {
    list.innerHTML = `<p class="text-ink/50">Nog geen bouwdelen voor dit pand.</p>`;
  } else {
    const { componentTypeLabel } = await import('./components.js');
    const { STATUS_META } = await import('./status.js');
    components.forEach(c => {
      const latest = (c.maintenance_entries || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      const meta = latest ? (STATUS_META[latest.status] || null) : null;
      const card = document.createElement('a');
      card.href = `#/components/${c.id}`;
      card.className = 'block p-4 border border-rule rounded-lg hover:border-sienna transition-colors bg-white';
      card.innerHTML = `
        <div class="text-[15px] font-semibold">${escapeHtml(componentTypeLabel(c.component_type))}${c.label ? ' — ' + escapeHtml(c.label) : ''}</div>
        <div class="mt-2 inline-flex text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full" style="background:${meta ? meta.bg : '#F1F0EA'};color:${meta ? meta.fg : '#6B6862'}">${meta ? meta.label : 'Nog geen werk gelogd'}</div>
      `;
      list.appendChild(card);
    });
  }

  const { renderAccessSection } = await import('./access.js');
  renderAccessSection(root.querySelector('#access-section'), property);
}

export function openPropertyForm(prefill) {
  const p = prefill || {};
  showModal('Nieuw pand', `
    <div class="form-grid">
      <label class="fld">Naam *<input id="f-name" value="${escapeAttr(p.name || '')}" required /></label>
      <label class="fld">Type *
        <select id="f-type" required>
          <option value="home" ${p.type === 'home' ? 'selected' : ''}>Woonhuis</option>
          <option value="business" ${p.type === 'business' ? 'selected' : ''}>Bedrijfspand</option>
          <option value="vve" ${p.type === 'vve' ? 'selected' : ''}>VvE-complex</option>
        </select>
      </label>
      <label class="fld">Adres<input id="f-address" value="${escapeAttr(p.address || '')}" /></label>
      <label class="fld">Postcode<input id="f-postcode" value="${escapeAttr(p.postcode || '')}" /></label>
      <label class="fld">Plaats<input id="f-city" value="${escapeAttr(p.city || '')}" /></label>
      <label class="fld">Eigenaar / contact<input id="f-owner_name" value="${escapeAttr(p.owner_name || '')}" /></label>
      <label class="fld">E-mail<input id="f-owner_email" value="${escapeAttr(p.owner_email || '')}" /></label>
      <label class="fld">Telefoon<input id="f-owner_phone" value="${escapeAttr(p.owner_phone || '')}" /></label>
    </div>
    <label class="fld mt-3">Notities<textarea id="f-notes" rows="3">${escapeHtml(p.notes || '')}</textarea></label>
  `, async () => {
    const payload = {
      name: val('f-name'), type: val('f-type'), address: val('f-address') || null,
      postcode: val('f-postcode') || null, city: val('f-city') || null,
      owner_name: val('f-owner_name') || null, owner_email: val('f-owner_email') || null,
      owner_phone: val('f-owner_phone') || null, notes: val('f-notes') || null,
    };
    if (!payload.name) throw new Error('Naam is verplicht.');
    const { data, error } = await supabase.from('properties').insert(payload).select().single();
    if (error) throw error;
    return data;
  }, async (savedProperty) => {
    if (prefill && prefill.componentTypes && prefill.componentTypes.length) {
      await Promise.all(prefill.componentTypes.map(ct =>
        supabase.from('building_components').insert({ property_id: savedProperty.id, component_type: ct })
      ));
    }
    if (prefill && typeof prefill.afterSave === 'function') {
      await prefill.afterSave(savedProperty);
    }
    navigate(`/properties/${savedProperty.id}`);
  });
}

// --- shared tiny modal + form helpers, used by properties/components/entries views ---
export function showModal(title, bodyHtml, onSave, onSaved) {
  let modal = document.getElementById('admin-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'admin-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/50" data-close></div>
    <div class="relative bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto p-6">
      <h2 class="text-[18px] font-semibold mb-4">${escapeHtml(title)}</h2>
      <div id="admin-modal-body">${bodyHtml}</div>
      <p id="admin-modal-error" class="hidden mt-3 text-[13px] text-sienna2"></p>
      <div class="mt-5 flex justify-end gap-2">
        <button data-close class="px-4 py-2 rounded text-[13.5px] border border-rule">Annuleren</button>
        <button id="admin-modal-save" class="px-4 py-2 rounded text-[13.5px] bg-sienna text-white hover:bg-sienna2">Opslaan</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => modal.remove()));
  modal.querySelector('#admin-modal-save').addEventListener('click', async () => {
    const btn = modal.querySelector('#admin-modal-save');
    const errBox = modal.querySelector('#admin-modal-error');
    errBox.classList.add('hidden');
    btn.disabled = true;
    try {
      const result = await onSave();
      modal.remove();
      if (onSaved) await onSaved(result);
    } catch (err) {
      console.error(err);
      errBox.textContent = err.message || 'Opslaan mislukt.';
      errBox.classList.remove('hidden');
      btn.disabled = false;
    }
  });
}

export function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function escapeAttr(s) { return escapeHtml(s); }
