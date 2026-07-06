import { supabase } from './supabaseClient.js';
import { showModal, val, escapeHtml, escapeAttr } from './properties.js';
import { t, formatDate } from './i18n.js';

// "Toegang klantportaal" — staff manages which client logins can see a property.
// Account creation/reset goes through the create-client-account edge function
// (service role); revoking is a direct property_users delete (instant, staff RLS).

function tempPasswordModal(password, note) {
  showModal(t('access.temp_pw_title'), `
    <p class="text-[13.5px] text-ink/70">${escapeHtml(note)}</p>
    <div class="mt-4 flex items-center gap-2">
      <code id="temp-pw" class="flex-1 px-4 py-3 bg-paper2 rounded text-[15px] tracking-wide">${escapeHtml(password)}</code>
      <button type="button" id="copy-pw" class="px-3 py-3 border border-rule rounded text-[13px] hover:border-sienna">${t('common.copy')}</button>
    </div>
    <p class="mt-4 text-[12.5px]" style="color:#A3141B;">${t('access.temp_pw_warning')}</p>
  `, async () => {});
  // Repurpose the modal buttons: no save action needed, hide "Opslaan".
  const modal = document.getElementById('admin-modal');
  modal.querySelector('#admin-modal-save').classList.add('hidden');
  modal.querySelector('#copy-pw').addEventListener('click', async (e) => {
    await navigator.clipboard.writeText(password);
    e.target.textContent = t('common.copied');
  });
}

export async function renderAccessSection(box, property) {
  box.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-[11px] uppercase tracking-[.18em] text-ink/50">${t('access.title')}</h2>
      <button id="btn-new-access" class="text-[13px] text-sienna hover:text-sienna2">${t('access.new_btn')}</button>
    </div>
    <div id="access-list" class="space-y-2"></div>
  `;
  const list = box.querySelector('#access-list');

  const { data: users, error } = await supabase.from('property_users')
    .select('user_id, email, created_at').eq('property_id', property.id).order('created_at');
  if (error) { list.innerHTML = `<p class="text-[13px] text-sienna2">${t('access.load_error', { msg: error.message })}</p>`; return; }

  if (!users.length) {
    list.innerHTML = `<p class="text-[13px] text-ink/50">${t('access.empty')}</p>`;
  }

  users.forEach(u => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-3.5 border border-rule rounded-lg bg-white flex-wrap gap-2';
    row.innerHTML = `
      <div class="min-w-0">
        <div class="text-[14px]">${escapeHtml(u.email)}</div>
        <div class="text-[12px] text-ink/45">${t('access.since', { date: formatDate(u.created_at) })}</div>
      </div>
      <div class="flex gap-3 text-[13px]">
        <button data-reset class="text-ink/60 hover:text-sienna">${t('access.reset_btn')}</button>
        <button data-revoke class="hover:underline" style="color:#A3141B;">${t('access.revoke_btn')}</button>
      </div>
    `;
    row.querySelector('[data-reset]').addEventListener('click', async (e) => {
      e.target.disabled = true;
      const { data, error: fnError } = await supabase.functions.invoke('create-client-account', {
        body: { action: 'reset_password', user_id: u.user_id },
      });
      e.target.disabled = false;
      if (fnError || data?.error) { alertError(fnError?.message || data.error); return; }
      tempPasswordModal(data.temp_password, t('access.temp_pw_reset', { email: u.email }));
    });
    row.querySelector('[data-revoke]').addEventListener('click', () => {
      showModal(t('access.revoke_title'), `
        <p class="text-[13.5px] text-ink/70">${t('access.revoke_confirm', { email: escapeHtml(u.email) })}</p>
      `, async () => {
        const { error: delError } = await supabase.from('property_users')
          .delete().eq('property_id', property.id).eq('user_id', u.user_id);
        if (delError) throw delError;
      }, () => renderAccessSection(box, property));
    });
    list.appendChild(row);
  });

  box.querySelector('#btn-new-access').addEventListener('click', () => {
    showModal(t('access.create_title'), `
      <p class="text-[13.5px] text-ink/70 mb-4">${t('access.create_body')}</p>
      <label class="fld">${t('access.email_label')}<input id="f-access-email" type="email" value="${escapeAttr(property.owner_email || '')}" required /></label>
    `, async () => {
      const email = val('f-access-email');
      if (!email) throw new Error(t('access.email_required'));
      const { data, error: fnError } = await supabase.functions.invoke('create-client-account', {
        body: { action: 'create', property_id: property.id, email },
      });
      if (fnError) throw new Error(fnError.message || t('access.create_failed'));
      if (data?.error === 'is_staff_account') throw new Error(t('access.err_staff_email'));
      if (data?.error) throw new Error(data.error);
      return data;
    }, (result) => {
      if (result.status === 'created') {
        tempPasswordModal(result.temp_password, t('access.temp_pw_new'));
        // Refresh the list underneath the password modal.
        renderAccessSection(box, property);
      } else if (result.status === 'linked_existing') {
        renderAccessSection(box, property);
        showModal(t('access.linked_existing_title'), `
          <p class="text-[13.5px] text-ink/70">${t('access.linked_existing_body')}</p>
        `, async () => {});
        document.getElementById('admin-modal').querySelector('#admin-modal-save').classList.add('hidden');
      }
    });
  });
}

function alertError(message) {
  showModal(t('access.error_title'), `<p class="text-[13.5px]" style="color:#A3141B;">${escapeHtml(message)}</p>`, async () => {});
  document.getElementById('admin-modal').querySelector('#admin-modal-save').classList.add('hidden');
}
