// Tipos compartidos con la app (src/types.ts). Si cambias el formato del
// menú, actualiza ambos.

export type Diet = 'omnivora' | 'vegetariana' | 'vegana' | 'sin_cerdo';

export const DIET_LABELS: Record<Diet, string> = {
  omnivora: 'Omnívora',
  vegetariana: 'Vegetariana',
  vegana: 'Vegana',
  sin_cerdo: 'Sin cerdo',
};

export const WEEKDAYS = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
] as const;

export interface ChildProfile {
  name: string;
  /** Fecha de nacimiento en formato AAAA-MM-DD. */
  birthDate: string;
  allergies: string[];
  otherAllergies: string;
  diet: Diet;
  likes: string;
  dislikes: string;
  notes: string;
}

export interface MenuFile {
  kind: 'image' | 'pdf';
  name: string;
  mimeType: string;
  base64: string;
}

export interface DayPlan {
  day: (typeof WEEKDAYS)[number];
  date: string;
  schoolMeals: { mealType: 'desayuno' | 'media_manana' | 'comida' | 'merienda'; dishes: string[] }[];
  allergenAlerts: string[];
  dinner: {
    dishes: { name: string; description: string }[];
    rationale: string;
    nutrientFocus: string[];
    tips: string;
  };
}

/** Lo que devuelve el modelo de IA. */
export interface AIMenuResult {
  weekLabel: string;
  days: DayPlan[];
  generalNotes: string;
}
