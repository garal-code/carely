import type { AISettings, ChildProfile, Diet, MealType, Weekday } from './types';

/** Los 14 alérgenos de declaración obligatoria en la UE (Reglamento 1169/2011). */
export const EU_ALLERGENS = [
  'Gluten',
  'Crustáceos',
  'Huevo',
  'Pescado',
  'Cacahuete',
  'Soja',
  'Leche',
  'Frutos de cáscara',
  'Apio',
  'Mostaza',
  'Sésamo',
  'Sulfitos',
  'Altramuces',
  'Moluscos',
];

export const DIET_LABELS: Record<Diet, string> = {
  omnivora: 'Omnívora',
  vegetariana: 'Vegetariana',
  vegana: 'Vegana',
  sin_cerdo: 'Sin cerdo',
};

export const MEAL_LABELS: Record<MealType, string> = {
  desayuno: 'Desayuno',
  media_manana: 'Media mañana',
  comida: 'Comida',
  merienda: 'Merienda',
};

export const WEEKDAYS: Weekday[] = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

export const CLAUDE_MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (recomendado)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (más económico)' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (el más barato)' },
];

export const OPENAI_MODEL_SUGGESTIONS = ['gpt-6.1-sol', 'gpt-5.5', 'gpt-5.4-mini'];

export const DEFAULT_PROFILE: ChildProfile = {
  name: '',
  birthDate: '',
  allergies: [],
  otherAllergies: '',
  diet: 'omnivora',
  likes: '',
  dislikes: '',
  notes: '',
};

export const DEFAULT_SETTINGS: AISettings = {
  provider: 'claude',
  claudeModel: 'claude-opus-5-5',
  openaiModel: 'gpt-6.1-sol',
};
