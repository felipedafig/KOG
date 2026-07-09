import { supabase } from './supabaseClient.js';
import { escapeHtml, openPropertyForm } from './properties.js';
import { componentTypeLabel } from './components.js';
import { navigate } from './router.js';
import { t, formatDate } from './i18n.js';

function quoteStatusLabel(status) {
  return ({ new: t('quotes.status.new'), reviewed: t('quotes.status.reviewed'), converted: t('quotes.status.converted'), archived: t('quotes.status.archived') })[status] || status;
}
function propertyTypeLabel(type) {
  return ({ home: t('ptype.home'), business: t('ptype.business'), vve: t('ptype.vve') })[type] || type;
}

export async function renderQuotesList(root) {
  root.innerHTML = `
    <h1 class="text-[22px] font-semibold mb-5">${t('quotes.title')}</h1>
    <div id="quotes-list" class="space-y-2"></div>
  `;
  const list = root.querySelector('#quotes-list');
  const { data, error } = await supabase.from('quote_requests').select('*').order('created_at', { ascending: false });
  if (error) { list.innerHTML = `<p class="text-sienna2">${t('quotes.load_error', { msg: error.message })}</p>`; return; }
  if (!data.length) { list.innerHTML = `<p class="text-ink/50">${t('quotes.empty')}</p>`; return; }

  data.forEach(q => {
    const row = document.createElement('a');
    row.href = `#/quotes/${q.id}`;
    row.className = 'flex items-center justify-between p-4 border border-rule rounded-lg hover:border-sienna transition-colors bg-white';
    row.innerHTML = `
      <div>
        <div class="text-[14.5px] font-semibold">${escapeHtml(q.name)}${q.company ? ' — ' + escapeHtml(q.company) : ''}</div>
        <div class="text-[12.5px] text-ink/55 mt-0.5">${escapeHtml((q.component_types || []).map(componentTypeLabel).join(', ') || q.work_type || '—')} · ${formatDate(q.created_at)}</div>
      </div>
      <span class="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-paper2 text-ink/60 whitespace-nowrap">${quoteStatusLabel(q.status)}</span>
    `;
    list.appendChild(row);
  });
}

export async function renderQuoteDetail(root, id) {
  root.innerHTML = `<p class="text-ink/50">${t('common.loading')}</p>`;
  const { data: q, error } = await supabase.from('quote_requests').select('*').eq('id', id).single();
  if (error || !q) { root.innerHTML = `<p class="text-sienna2">${t('quotes.not_found')}</p>`; return; }
  const { data: photos } = await supabase.from('quote_photos').select('*').eq('quote_id', id);

  root.innerHTML = `
    <a href="#/quotes" class="text-[13px] text-ink/50 hover:text-sienna">${t('quotes.back')}</a>
    <div class="flex items-start justify-between mt-3 mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-[22px] font-semibold">${escapeHtml(q.name)}${q.company ? ' — ' + escapeHtml(q.company) : ''}</h1>
        <p class="text-[13.5px] text-ink/60 mt-1">${escapeHtml(q.email)}${q.phone ? ' · ' + escapeHtml(q.phone) : ''}</p>
      </div>
      ${q.status === 'converted'
        ? `<span class="text-[12px] px-3 py-1.5 rounded bg-paper2 text-ink/60">${t('quotes.already_converted')}</span>`
        : `<button id="btn-convert" class="px-4 py-2.5 bg-sienna text-white rounded text-[13.5px] hover:bg-sienna2 whitespace-nowrap">${t('quotes.convert_btn')}</button>`}
    </div>
    <div class="grid gap-2 text-[13.5px] max-w-xl">
      <div><span class="text-ink/50">${t('quotes.field.property_type')}</span> ${escapeHtml(propertyTypeLabel(q.property_type) || q.property_type || '—')}</div>
      <div><span class="text-ink/50">${t('quotes.field.components')}</span> ${escapeHtml((q.component_types || []).map(componentTypeLabel).join(', ') || '—')}</div>
      <div><span class="text-ink/50">${t('quotes.field.work_type')}</span> ${escapeHtml(q.work_type || '—')}</div>
      <div><span class="text-ink/50">${t('quotes.field.location')}</span> ${escapeHtml(q.location || '—')}</div>
      <div><span class="text-ink/50">${t('quotes.field.scope')}</span> ${escapeHtml(q.scope || '—')}</div>
      <div><span class="text-ink/50">${t('quotes.field.timing')}</span> ${escapeHtml(q.preferred_timing || '—')}</div>
      <div><span class="text-ink/50">${t('quotes.field.message')}</span> ${escapeHtml(q.message || '—')}</div>
    </div>
    <div id="quote-photos" class="mt-4 flex flex-wrap gap-2"></div>
  `;

  const photosBox = root.querySelector('#quote-photos');
  for (const photo of photos || []) {
    const { data } = await supabase.storage.from('quote-photos').createSignedUrl(photo.storage_path, 3600);
    if (data) {
      const img = document.createElement('img');
      img.src = data.signedUrl;
      img.className = 'w-20 h-20 object-cover rounded border border-rule';
      photosBox.appendChild(img);
    }
  }

  const convertBtn = root.querySelector('#btn-convert');
  if (convertBtn) {
    convertBtn.addEventListener('click', () => {
      openPropertyForm({
        name: q.company || q.name,
        type: q.property_type || 'home',
        address: q.location || '',
        owner_name: q.name,
        owner_email: q.email,
        owner_phone: q.phone || '',
        componentTypes: q.component_types || [],
        // Only runs after the property (+ its components) actually saved successfully.
        afterSave: (savedProperty) => supabase.from('quote_requests').update({
          status: 'converted', converted_at: new Date().toISOString(), converted_property_id: savedProperty.id,
        }).eq('id', id),
      });
    });
  }
}
