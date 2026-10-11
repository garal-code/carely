// Recuento de proteínas de la semana. Sin dependencias (solo tipos) para poder
// probarlo con `node --test`.
import type { DayPlan, DinnerProposal, Protein, SchoolMeal } from '../types';

export const PROTEINS: readonly Protein[] = ['carne', 'pescado', 'huevo', 'legumbre'];

export type ProteinCounts = Record<Protein, number>;

export interface WeekProteinCounts {
  lunch: ProteinCounts;
  dinner: ProteinCounts;
  total: ProteinCounts;
}

// Palabras clave sin tildes ni mayúsculas. Cada una admite plural (-s / -es).
const KEYWORDS: Record<Protein, string[]> = {
  carne: [
    'pollo', 'pavo', 'ternera', 'cerdo', 'lomo', 'carne', 'albondiga', 'hamburguesa', 'jamon',
    'chorizo', 'salchicha', 'conejo', 'cordero', 'filete', 'pechuga', 'solomillo', 'costilla',
    'morcilla', 'salchichon', 'lacon', 'pato', 'bolonesa', 'bacon', 'beicon',
  ],
  pescado: [
    'pescado', 'pescadilla', 'merluza', 'salmon', 'bacalao', 'atun', 'sardina', 'gallo', 'rape',
    'lenguado', 'calamar', 'gamba', 'marisco', 'emperador', 'boqueron', 'lubina', 'trucha',
    'mejillon', 'almeja', 'langostino', 'sepia', 'pulpo', 'abadejo', 'caballa',
  ],
  huevo: ['huevo', 'tortilla', 'revuelto'],
  legumbre: [
    'lenteja', 'garbanzo', 'alubia', 'judia blanca', 'judia pinta', 'judia roja', 'guisante',
    'soja', 'tofu', 'hummus', 'humus', 'haba', 'frijol', 'edamame',
  ],
};

// Expresiones que se quitan antes de buscar porque darían falsos positivos:
// las judías verdes son verdura, "lomo/filete de merluza" es pescado (la
// carne se detecta igualmente si sigue, p. ej. "lomo de cerdo"), la salsa de
// soja no aporta proteína y las tortillas de trigo o maíz no llevan huevo.
const IGNORED = /\b(?:judias? verdes?|(?:lomos?|filetes?) de|salsa de soja|tortillas? de (?:trigo|maiz))\b/g;

const PATTERNS: Record<Protein, RegExp> = Object.fromEntries(
  PROTEINS.map((protein) => {
    // "judia blanca" -> "judias? blancas?" para admitir el plural de cada palabra.
    const words = KEYWORDS[protein].map((kw) => kw.split(' ').map((w) => `${w}(?:e?s)?`).join(' '));
    return [protein, new RegExp(`\\b(?:${words.join('|')})\\b`)];
  }),
) as Record<Protein, RegExp>;

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Detecta proteínas por palabras clave en español (sin distinguir mayúsculas
 * ni tildes, solo palabras completas o su plural). Es el respaldo para menús
 * guardados sin etiquetas de la IA y tiene límites conocidos: no ve el huevo
 * de rebozados, masas o salsas; "judías" a secas no cuenta (suelen ser
 * verdes); no entiende negaciones ("sin huevo") y depende de que el plato
 * nombre el ingrediente (un "cocido" o una "paella" no se detectan).
 */
export function detectProteins(text: string): Protein[] {
  const clean = normalize(text).replace(IGNORED, ' ');
  return PROTEINS.filter((protein) => PATTERNS[protein].test(clean));
}

/** Etiquetas válidas, sin repetir y en el orden de `PROTEINS`. */
function sanitize(proteins: readonly string[]): Protein[] {
  return PROTEINS.filter((protein) => proteins.includes(protein));
}

/** Proteínas de una comida del cole: las etiquetas de la IA o, si faltan, las palabras clave. */
export function mealProteins(meal: SchoolMeal): Protein[] {
  if (Array.isArray(meal.proteins)) return sanitize(meal.proteins);
  return detectProteins(meal.dishes.join('\n'));
}

/** Proteínas de una cena: las etiquetas de la IA o, si faltan, nombres y descripciones. */
export function dinnerProteins(dinner: DinnerProposal): Protein[] {
  if (Array.isArray(dinner.proteins)) return sanitize(dinner.proteins);
  return detectProteins(dinner.dishes.map((d) => `${d.name}\n${d.description}`).join('\n'));
}

function emptyCounts(): ProteinCounts {
  return { carne: 0, pescado: 0, huevo: 0, legumbre: 0 };
}

/**
 * Cuenta en cuántas comidas aparece cada proteína a lo largo de la semana.
 * - Comida: solo las comidas del cole con `mealType === 'comida'`.
 * - Cena: la cena de cada día; los días sin cena (sin platos) no cuentan.
 * - Cada comida o cena suma como mucho 1 por proteína, aunque la lleven
 *   varios platos.
 * - Total: suma de comida y cena.
 */
export function countWeekProteins(days: DayPlan[]): WeekProteinCounts {
  const lunch = emptyCounts();
  const dinner = emptyCounts();

  for (const day of days) {
    for (const meal of day.schoolMeals) {
      if (meal.mealType !== 'comida') continue;
      for (const protein of mealProteins(meal)) lunch[protein]++;
    }
    if (day.dinner?.dishes?.length) {
      for (const protein of dinnerProteins(day.dinner)) dinner[protein]++;
    }
  }

  const total = emptyCounts();
  for (const protein of PROTEINS) total[protein] = lunch[protein] + dinner[protein];
  return { lunch, dinner, total };
}
