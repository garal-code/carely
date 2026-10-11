import { describeAge } from './age.js';
import { DIET_LABELS, PROTEINS, WEEKDAYS } from './types.js';
import type { ChildProfile } from './types.js';

/** Grupos de proteína principales de una comida (vacío si no hay ninguno). */
const PROTEINS_SCHEMA = {
  type: 'array',
  items: { type: 'string', enum: PROTEINS },
  description:
    'Grupos de proteína principales de la comida: carne (incluye aves y embutidos), pescado (incluye marisco), huevo (solo si es componente principal), legumbre (lentejas, garbanzos, alubias, guisantes, soja, tofu). Vacío si no hay ninguno.',
} as const;

/** Esquema de un día del menú. */
const DAY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['day', 'date', 'schoolMeals', 'allergenAlerts', 'dinner'],
  properties: {
    day: { type: 'string', enum: WEEKDAYS },
    date: {
      type: 'string',
      description:
        'Fecha del día en formato AAAA-MM-DD. Si el documento no indica el año, usa el año actual o el de la fecha próxima más plausible respecto a la fecha de hoy.',
    },
    schoolMeals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['mealType', 'dishes', 'proteins'],
        properties: {
          mealType: {
            type: 'string',
            enum: ['desayuno', 'media_manana', 'comida', 'merienda'],
          },
          dishes: { type: 'array', items: { type: 'string' } },
          proteins: PROTEINS_SCHEMA,
        },
      },
    },
    allergenAlerts: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Avisos si algún plato de la guardería puede contener alérgenos del perfil del niño.',
    },
    dinner: {
      type: 'object',
      additionalProperties: false,
      required: ['dishes', 'rationale', 'nutrientFocus', 'tips', 'proteins'],
      properties: {
        dishes: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'description'],
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
        rationale: { type: 'string' },
        nutrientFocus: { type: 'array', items: { type: 'string' } },
        tips: { type: 'string' },
        proteins: PROTEINS_SCHEMA,
      },
    },
  },
} as const;

/**
 * Esquema JSON de la respuesta. Es compatible con las salidas estructuradas de
 * Claude y con el modo `strict` de OpenAI: todos los campos son obligatorios y
 * no se permiten propiedades adicionales.
 */
export const MENU_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'weeks', 'generalNotes'],
  properties: {
    title: {
      type: 'string',
      description:
        'Título corto del documento completo, p. ej. "Menú de octubre 2026" o "Semana del 6 al 10 de octubre".',
    },
    weeks: {
      type: 'array',
      description: 'Semanas naturales (de lunes a domingo) del menú, en orden cronológico.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'days'],
        properties: {
          label: {
            type: 'string',
            description: 'Título corto de la semana, p. ej. "Semana del 6 al 10 de octubre".',
          },
          days: {
            type: 'array',
            description: 'Días de la semana con menú, en orden cronológico.',
            items: DAY_SCHEMA,
          },
        },
      },
    },
    generalNotes: { type: 'string' },
  },
} as const;

export const SYSTEM_PROMPT = `Eres un asistente experto en nutrición infantil que ayuda a familias en España a planificar las cenas de sus hijos.

Recibirás el menú de una guardería (como foto o PDF), que puede ser semanal o mensual, y el perfil del niño. Tu trabajo:

1. Extrae fielmente lo que la guardería sirve cada día de cada semana del menú, sin saltarte ninguno (desayuno, media mañana, comida, merienda: solo las comidas que aparezcan). Copia los platos tal como están escritos; no inventes platos. Si algo es ilegible, indícalo con "(ilegible)".
2. Indica la fecha concreta de cada día (AAAA-MM-DD). Si el documento no muestra el año, dedúcelo de la fecha de hoy que te indico (el año actual o la fecha próxima más plausible). Agrupa los días en semanas naturales de lunes a domingo, en orden cronológico, y ordena los días de cada semana también cronológicamente.
3. Para cada día con menú, propón una única cena que complemente lo que el niño ha comido ese día, siguiendo las recomendaciones de la Asociación Española de Pediatría:
   - Si a mediodía hubo carne, prioriza pescado o huevo por la noche (y viceversa); si hubo legumbre o pasta, cena con verdura y proteína ligera.
   - Incluye verdura u hortaliza en la cena y fruta o lácteo de postre cuando encaje.
   - Raciones, texturas y preparaciones adecuadas a la edad del niño. Evita sal añadida, azúcares añadidos y alimentos con riesgo de atragantamiento para su edad (frutos secos enteros, uvas enteras, etc.).
   - Platos sencillos de preparar en casa entre semana.
4. NUNCA propongas alimentos que contengan los alérgenos del perfil ni que contradigan su tipo de dieta. Si algún plato de la guardería parece contener un alérgeno del perfil, añádelo en "allergenAlerts" con una explicación breve.
5. Ten en cuenta los gustos y rechazos del niño cuando sea posible, sin sacrificar el equilibrio.
6. Etiqueta cada comida de la guardería y cada cena en "proteins" con los grupos de proteína principales que contiene:
   - "carne": incluye aves y embutidos.
   - "pescado": incluye marisco.
   - "huevo": solo cuando el huevo es un componente principal del plato, no un ingrediente menor (rebozados, masas, salsas).
   - "legumbre": lentejas, garbanzos, alubias, guisantes, soja y tofu.
   Usa una lista vacía si la comida no contiene ninguno (por ejemplo, una merienda de fruta).

En "rationale" explica en una o dos frases por qué esa cena equilibra el día. En "nutrientFocus" pon los nutrientes clave que aporta (p. ej. "proteína", "hierro", "fibra", "calcio", "omega-3"). En "tips" da un consejo práctico breve (preparación, cómo presentarlo, alternativa).
Usa "generalNotes" para observaciones de todo el periodo del menú (variedad, algo a vigilar) en dos o tres frases.

Responde siempre en español.`;

/** Fecha de hoy (AAAA-MM-DD) en hora de España, para que el modelo deduzca el año del menú. */
function todayInMadrid(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function buildUserPrompt(profile: ChildProfile): string {
  const allergies = [...profile.allergies, profile.otherAllergies.trim()].filter(Boolean);
  const lines = [
    'Perfil del niño:',
    `- Nombre: ${profile.name.trim() || 'sin indicar'}`,
    `- Edad: ${describeAge(profile.birthDate) ?? 'sin indicar'}`,
    `- Alergias e intolerancias: ${allergies.length ? allergies.join(', ') : 'ninguna conocida'}`,
    `- Tipo de dieta: ${DIET_LABELS[profile.diet]}`,
    `- Le gusta: ${profile.likes.trim() || 'sin indicar'}`,
    `- No le gusta: ${profile.dislikes.trim() || 'sin indicar'}`,
    `- Otras notas: ${profile.notes.trim() || 'ninguna'}`,
    '',
    `Fecha de hoy: ${todayInMadrid()}`,
    '',
    'Analiza el menú de la guardería adjunto y devuelve el plan de todo el periodo que cubre.',
  ];
  return lines.join('\n');
}
