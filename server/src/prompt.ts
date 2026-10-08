import { describeAge } from './age.js';
import { DIET_LABELS, WEEKDAYS } from './types.js';
import type { ChildProfile } from './types.js';

/**
 * Esquema JSON de la respuesta. Es compatible con las salidas estructuradas de
 * Claude y con el modo `strict` de OpenAI: todos los campos son obligatorios y
 * no se permiten propiedades adicionales.
 */
export const MENU_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['weekLabel', 'days', 'generalNotes'],
  properties: {
    weekLabel: {
      type: 'string',
      description: 'Título corto de la semana, p. ej. "Semana del 6 al 10 de octubre".',
    },
    days: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['day', 'date', 'schoolMeals', 'allergenAlerts', 'dinner'],
        properties: {
          day: { type: 'string', enum: WEEKDAYS },
          date: {
            type: 'string',
            description: 'Fecha AAAA-MM-DD si aparece en el menú; cadena vacía si no.',
          },
          schoolMeals: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['mealType', 'dishes'],
              properties: {
                mealType: {
                  type: 'string',
                  enum: ['desayuno', 'media_manana', 'comida', 'merienda'],
                },
                dishes: { type: 'array', items: { type: 'string' } },
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
            required: ['dishes', 'rationale', 'nutrientFocus', 'tips'],
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
            },
          },
        },
      },
    },
    generalNotes: { type: 'string' },
  },
} as const;

export const SYSTEM_PROMPT = `Eres un asistente experto en nutrición infantil que ayuda a familias en España a planificar las cenas de sus hijos.

Recibirás el menú semanal de una guardería (como foto o PDF) y el perfil del niño. Tu trabajo:

1. Extrae fielmente lo que la guardería sirve cada día (desayuno, media mañana, comida, merienda: solo las comidas que aparezcan). Copia los platos tal como están escritos; no inventes platos. Si algo es ilegible, indícalo con "(ilegible)".
2. Para cada día con menú, propón una cena que complemente lo que el niño ha comido ese día, siguiendo las recomendaciones de la Asociación Española de Pediatría:
   - Si a mediodía hubo carne, prioriza pescado o huevo por la noche (y viceversa); si hubo legumbre o pasta, cena con verdura y proteína ligera.
   - Incluye verdura u hortaliza en la cena y fruta o lácteo de postre cuando encaje.
   - Raciones, texturas y preparaciones adecuadas a la edad del niño. Evita sal añadida, azúcares añadidos y alimentos con riesgo de atragantamiento para su edad (frutos secos enteros, uvas enteras, etc.).
   - Platos sencillos de preparar en casa entre semana.
3. NUNCA propongas alimentos que contengan los alérgenos del perfil ni que contradigan su tipo de dieta. Si algún plato de la guardería parece contener un alérgeno del perfil, añádelo en "allergenAlerts" con una explicación breve.
4. Ten en cuenta los gustos y rechazos del niño cuando sea posible, sin sacrificar el equilibrio.

En "rationale" explica en una o dos frases por qué esa cena equilibra el día. En "nutrientFocus" pon los nutrientes clave que aporta (p. ej. "proteína", "hierro", "fibra", "calcio", "omega-3"). En "tips" da un consejo práctico breve (preparación, cómo presentarlo, alternativa).
Usa "generalNotes" para observaciones de la semana completa (variedad, algo a vigilar) en dos o tres frases.

Responde siempre en español.`;

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
    'Analiza el menú de la guardería adjunto y devuelve el plan de la semana.',
  ];
  return lines.join('\n');
}
