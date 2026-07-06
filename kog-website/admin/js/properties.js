import { supabase } from './supabaseClient.js';
import { navigate } from './router.js';
import { t } from './i18n.js';

function propertyTypeLabel(type) {
  return ({ home: t('ptype.home'), business: t('ptype.business'), vve: t('ptype.vve') })[type] || type;
}

export async function renderPropertiesList(root) {
  root.innerHTML = `
    <div class="flex items-center justify-between mb-5">
      <h1 class="text-[22px] font-semibold">${t('properties.title')}</h1>
      <button id="btn-new-property" class="px-4 py-2.5 bg-sienna text-white rounded text-[13.5px] hover:bg-sienna2">${t('properties.new_btn')}</button>
    </div>
    <div id="properties-list" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"></div>
  `;
  root.querySelector('#btn-new-property').addEventListener('click', () => openPropertyForm());

  const list = root.querySelector('#properties-list');
  const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
  if (error) { list.innerHTML = `<p class="text-sienna2">${t('properties.load_error', { msg: error.message })}</p>`; return; }
  if (!data.length) { list.innerHTML = `<p class="text-ink/50">${t('properties.empty')}</p>`; return; }

  data.forEach(p => {
    const card = document.createElement('a');
    card.href = `#/properties/${p.id}`;
    card.className = 'block p-4 border border-rule rounded-lg hover:border-sienna transition-colors bg-white';
    card.innerHTML = `
      <div class="text-[15px] font-semibold">${escapeHtml(p.name)}</div>
      <div class="text-[13px] text-ink/60 mt-1">${escapeHtml([p.address, p.city].filter(Boolean).join(', ') || '—')}</div>
      <div class="mt-2 inline-flex text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-paper2 text-ink/60">${propertyTypeLabel(p.type)}</div>
    `;
    list.appendChild(card);
  });
}

export async function renderPropertyDetail(root, id) {
  root.innerHTML = `<p class="text-ink/50">${t('common.loading')}</p>`;
  const { data: property, error } = await supabase.from('properties').select('*').eq('id', id).single();
  if (error || !property) { root.innerHTML = `<p class="text-sienna2">${t('properties.not_found')}</p>`; return; }

  const { data: components } = await supabase.from('building_components').select('*, maintenance_entries(status, created_at)').eq('property_id', id).order('created_at');

  root.innerHTML = `
    <a href="#/properties" class="text-[13px] text-ink/50 hover:text-sienna">${t('properties.back')}</a>
    <div class="flex items-start justify-between mt-3 mb-5">
      <div>
        <h1 class="text-[22px] font-semibold">${escapeHtml(property.name)}</h1>
        <p class="text-[13.5px] text-ink/60 mt-1">${escapeHtml([property.address, property.postcode, property.city].filter(Boolean).join(', ') || '—')}</p>
        <p class="text-[13px] text-ink/50 mt-1">${escapeHtml(property.owner_name || '')} ${property.owner_email ? '· ' + escapeHtml(property.owner_email) : ''} ${property.owner_phone ? '· ' + escapeHtml(property.owner_phone) : ''}</p>
      </div>
      <button id="btn-new-component" class="px-4 py-2.5 bg-sienna text-white rounded text-[13.5px] hover:bg-sienna2 whitespace-nowrap">${t('properties.new_component_btn')}</button>
    </div>
    <div id="components-list" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"></div>
    <div id="access-section" class="mt-10"></div>
  `;
  root.querySelector('#btn-new-component').addEventListener('click', () => openComponentForm(id));

  const list = root.querySelector('#components-list');
  if (!components || !components.length) {
    list.innerHTML = `<p class="text-ink/50">${t('properties.no_components')}</p>`;
  } else {
    const { componentTypeLabel } = await import('./components.js');
    const { STATUS_META, statusLabel } = await import('./status.js');
    components.forEach(c => {
      const latest = (c.maintenance_entries || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      const meta = latest ? (STATUS_META[latest.status] || null) : null;
      const card = document.createElement('a');
      card.href = `#/components/${c.id}`;
      card.className = 'block p-4 border border-rule rounded-lg hover:border-sienna transition-colors bg-white';
      card.innerHTML = `
        <div class="text-[15px] font-semibold">${escapeHtml(componentTypeLabel(c.component_type))}${c.label ? ' — ' + escapeHtml(c.label) : ''}</div>
        <div class="mt-2 inline-flex text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full" style="background:${meta ? meta.bg : '#F1F0EA'};color:${meta ? meta.fg : '#6B6862'}">${latest ? statusLabel(latest.status) : t('status.none')}</div>
      `;
      list.appendChild(card);
    });
  }

  const { renderAccessSection } = await import('./access.js');
  renderAccessSection(root.querySelector('#access-section'), property);
}

export function openPropertyForm(prefill) {
  const p = prefill || {};
  showModal(t('properties.form.title_new'), `
    <div class="form-grid">
      <label class="fld">${t('properties.form.name')}<input id="f-name" value="${escapeAttr(p.name || '')}" required /></label>
      <label class="fld">${t('properties.form.type')}
        <select id="f-type" required>
          <option value="home" ${p.type === 'home' ? 'selected' : ''}>${t('ptype.home')}</option>
          <option value="business" ${p.type === 'business' ? 'selected' : ''}>${t('ptype.business')}</option>
          <option value="vve" ${p.type === 'vve' ? 'selected' : ''}>${t('ptype.vve')}</option>
        </select>
      </label>
      <label class="fld">${t('properties.form.address')}<input id="f-address" value="${escapeAttr(p.address || '')}" /></label>
      <label class="fld">${t('properties.form.postcode')}<input id="f-postcode" value="${escapeAttr(p.postcode || '')}" /></label>
      <label class="fld">${t('properties.form.city')}<input id="f-city" value="${escapeAttr(p.city || '')}" /></label>
      <label class="fld">${t('properties.form.owner_name')}<input id="f-owner_name" value="${escapeAttr(p.owner_name || '')}" /></label>
      <label class="fld">${t('properties.form.owner_email')}<input id="f-owner_email" value="${escapeAttr(p.owner_email || '')}" /></label>
      <label class="fld">${t('properties.form.owner_phone')}<input id="f-owner_phone" value="${escapeAttr(p.owner_phone || '')}" /></label>
    </div>
    <label class="fld mt-3">${t('properties.form.notes')}<textarea id="f-notes" rows="3">${escapeHtml(p.notes || '')}</textarea></label>
  `, async () => {
    const payload = {
      name: val('f-name'), type: val('f-type'), address: val('f-address') || null,
      postcode: val('f-postcode') || null, city: val('f-city') || null,
      owner_name: val('f-owner_name') || null, owner_email: val('f-owner_email') || null,
      owner_phone: val('f-owner_phone') || null, notes: val('f-notes') || null,
    };
    if (!payload.name) throw new Error(t('properties.form.name_required'));
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
        <button data-close class="px-4 py-2 rounded text-[13.5px] border border-rule">${t('common.cancel')}</button>
        <button id="admin-modal-save" class="px-4 py-2 rounded text-[13.5px] bg-sienna text-white hover:bg-sienna2">${t('common.save')}</button>
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
      errBox.textContent = err.message || t('common.save_failed');
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
