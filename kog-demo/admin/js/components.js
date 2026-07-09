import { supabase } from './supabaseClient.js';
import { showModal, val } from './properties.js';
import { navigate } from './router.js';
import { t } from './i18n.js';

export const COMPONENT_TYPE_VALUES = ['kozijnen', 'gevel', 'balkon', 'trappenhuis', 'boeideel', 'deuren', 'dak', 'overig'];

export function componentTypeLabel(value) {
  return COMPONENT_TYPE_VALUES.includes(value) ? t(`comp.${value}`) : value;
}

export function openComponentForm(propertyId) {
  showModal(t('components.form.title'), `
    <label class="fld">${t('components.form.type')}
      <select id="f-component_type" required>
        ${COMPONENT_TYPE_VALUES.map(v => `<option value="${v}">${componentTypeLabel(v)}</option>`).join('')}
      </select>
    </label>
    <label class="fld mt-3">${t('components.form.label')}<input id="f-label" placeholder="${t('components.form.label_placeholder')}" /></label>
  `, async () => {
    const payload = { property_id: propertyId, component_type: val('f-component_type'), label: val('f-label') || null };
    const { data, error } = await supabase.from('building_components').insert(payload).select().single();
    if (error) throw error;
    return data;
  }, () => navigate(`/properties/${propertyId}`));
}
