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

export interface SchoolMeal {
  mealType: MealType;
  dishes: string[];
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
