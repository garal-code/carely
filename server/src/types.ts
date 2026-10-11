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

export type Weekday = (typeof WEEKDAYS)[number];

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

/** Grupos de proteína principales con los que se etiqueta cada comida. */
export const PROTEINS = ['carne', 'pescado', 'huevo', 'legumbre'] as const;

export type Protein = (typeof PROTEINS)[number];

export interface SchoolMeal {
  mealType: 'desayuno' | 'media_manana' | 'comida' | 'merienda';
  dishes: string[];
  proteins: Protein[];
}

export interface DinnerProposal {
  dishes: { name: string; description: string }[];
  rationale: string;
  nutrientFocus: string[];
  tips: string;
  proteins: Protein[];
}

export interface DayPlan {
  day: (typeof WEEKDAYS)[number];
  /** Fecha del día en formato AAAA-MM-DD. */
  date: string;
  schoolMeals: SchoolMeal[];
  allergenAlerts: string[];
  dinner: DinnerProposal;
}

/** Semana natural (de lunes a domingo) con sus días en orden cronológico. */
export interface WeekPlan {
  label: string;
  days: DayPlan[];
}

// --- Cena alternativa (POST /v1/dinners/alternative) -----------------------

/** 'another': otra receta distinta; 'pantry': cocinar con lo que hay en casa. */
export type DinnerMode = 'another' | 'pantry';

/** Día del menú de la guardería para el que se pide la cena. */
export interface DinnerDayInput {
  /** Fecha del día en formato AAAA-MM-DD. */
  date: string;
  day: Weekday;
  schoolMeals: SchoolMeal[];
}

/** Día de la semana con la cena elegida, si la hay. */
export interface DinnerWeekDayInput extends DinnerDayInput {
  dinner?: { dishes: { name: string }[] };
}

export interface DinnerAlternativeRequest {
  profile: ChildProfile;
  mode: DinnerMode;
  /** Ingredientes disponibles; obligatorio con mode 'pantry' (máx. 1000 caracteres). */
  pantry?: string;
  day: DinnerDayInput;
  /** Días de la semana del menú (máx. 7). */
  week: DinnerWeekDayInput[];
  currentDinner: DinnerProposal;
}

export interface DinnerAlternativeResponse {
  dinner: DinnerProposal;
  provider: 'claude' | 'openai';
  model: string;
}

/** Lo que devuelve el modelo de IA. Puede cubrir una semana o un mes. */
export interface AIMenuResult {
  title: string;
  weeks: WeekPlan[];
  generalNotes: string;
}
