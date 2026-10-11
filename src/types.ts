export type Diet = 'omnivora' | 'vegetariana' | 'vegana' | 'sin_cerdo';

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

export type AIProvider = 'claude' | 'openai';

export type MealType = 'desayuno' | 'media_manana' | 'comida' | 'merienda';

export type Weekday =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

/** Grupo de proteína principal de un plato (ver `PROTEINS` en lib/proteins). */
export type Protein = 'carne' | 'pescado' | 'huevo' | 'legumbre';

export interface SchoolMeal {
  mealType: MealType;
  dishes: string[];
  /** Etiquetas de la IA; los menús guardados antes de añadirlas no las tienen. */
  proteins?: Protein[];
}

export interface DinnerDish {
  name: string;
  description: string;
}

export interface DinnerProposal {
  dishes: DinnerDish[];
  rationale: string;
  nutrientFocus: string[];
  tips: string;
  /** Etiquetas de la IA; los menús guardados antes de añadirlas no las tienen. */
  proteins?: Protein[];
}

export interface DayPlan {
  day: Weekday;
  /**
   * Fecha del día en formato AAAA-MM-DD. Los menús antiguos guardados pueden
   * tenerla vacía.
   */
  date: string;
  schoolMeals: SchoolMeal[];
  allergenAlerts: string[];
  dinner: DinnerProposal;
}

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

/** Cuerpo de `POST /v1/dinners/alternative`. */
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
  provider: AIProvider;
  model: string;
}

/** Semana natural (de lunes a domingo) con sus días en orden cronológico. */
export interface WeekPlan {
  label: string;
  days: DayPlan[];
}

/** Lo que devuelve el modelo de IA. Puede cubrir una semana o un mes. */
export interface AIMenuResult {
  title: string;
  weeks: WeekPlan[];
  generalNotes: string;
}

/** Menú guardado (semanal o mensual); se mantiene el nombre por compatibilidad. */
export interface WeeklyMenu extends AIMenuResult {
  id: string;
  createdAt: string;
  source: { kind: 'image' | 'pdf'; name: string };
  provider: AIProvider;
  model: string;
}
