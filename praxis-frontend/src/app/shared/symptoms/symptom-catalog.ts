export type SymptomConfig = {
  key: string;
  label: string;
  icon: string;
  options?: string[];
};

export const SYMPTOM_DURATION_OPTIONS = [
  'Seit heute',
  '2-3 Tage',
  '1 Woche',
  'Laenger als 2 Wochen',
];

export const SYMPTOM_CATALOG: SymptomConfig[] = [
  { key: 'fever', label: 'Fieber', icon: 'thermostat' },
  { key: 'cough', label: 'Husten', icon: 'masks', options: ['Mit Schleim', 'Ohne Schleim'] },
  { key: 'breath', label: 'Atemnot', icon: 'air', options: ['In Ruhe', 'Bei Belastung'] },
  { key: 'headache', label: 'Kopfschmerzen', icon: 'psychology', options: ['Druck', 'Stechend'] },
  { key: 'throat', label: 'Halsschmerzen', icon: 'record_voice_over' },
  { key: 'dizzy', label: 'Schwindel', icon: 'sync', options: ['Drehschwindel', 'Schwankschwindel'] },
  { key: 'nausea', label: 'Uebelkeit', icon: 'sick' },
  { key: 'chest', label: 'Brustschmerzen', icon: 'favorite', options: ['Links', 'Rechts', 'Mittig'] },
  { key: 'back', label: 'Rueckenschmerzen', icon: 'back_hand', options: ['Oben', 'Mitte', 'Unten'] },
  { key: 'rash', label: 'Ausschlag', icon: 'healing', options: ['Juckend', 'Nicht juckend'] },
];
