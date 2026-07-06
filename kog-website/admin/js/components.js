import { supabase } from './supabaseClient.js';
import { showModal, val } from './properties.js';
import { navigate } from './router.js';

export const COMPONENT_TYPES = [
  { value: 'kozijnen', label: 'Kozijnen' },
  { value: 'gevel', label: 'Gevel' },
  { value: 'balkon', label: 'Balkon / dakterras' },
  { value: 'trappenhuis', label: 'Trappenhuis' },
  { value: 'boeideel', label: 'Boeideel' },
  { value: 'deuren', label: 'Deuren' },
  { value: 'dak', label: 'Dak' },
  { value: 'overig', label: 'Overig' },
];

export function componentTypeLabel(value) {
  return (COMPONENT_TYPES.find(c => c.value === value) || {}).label || value;
}

export function openComponentForm(propertyId) {
  showModal('Nieuw bouwdeel', `
    <label class="fld">Type bouwdeel *
      <select id="f-component_type" required>
        ${COMPONENT_TYPES.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
      </select>
    </label>
    <label class="fld mt-3">Omschrijving (optioneel)<input id="f-label" placeholder="bijv. voorgevel noordzijde" /></label>
  `, async () => {
    const payload = { property_id: propertyId, component_type: val('f-component_type'), label: val('f-label') || null };
    const { data, error } = await supabase.from('building_components').insert(payload).select().single();
    if (error) throw error;
    return data;
  }, () => navigate(`/properties/${propertyId}`));
}
