import type { ChildProfile, Diet, MealType, Weekday } from './types';

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
