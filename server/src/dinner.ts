import { describeAge } from './age.js';
import { MENU_SCHEMA } from './prompt.js';
import { DIET_LABELS } from './types.js';
import type {
  ChildProfile,
  DinnerAlternativeRequest,
  DinnerProposal,
  Protein,
  SchoolMeal,
  Weekday,
} from './types.js';

/**
 * Esquema de una cena (`DinnerProposal`, con sus proteínas). Se reutiliza el
 * del análisis del menú para que ambas respuestas tengan siempre la misma
 * forma: todos los campos obligatorios y sin propiedades adicionales.
 */
export const DINNER_SCHEMA = MENU_SCHEMA.properties.weeks.items.properties.days.items.properties.dinner;

export const DINNER_SYSTEM_PROMPT = `Eres un asistente experto en nutrición infantil que ayuda a familias en España a planificar las cenas de sus hijos.

Recibirás el perfil del niño, lo que come en la guardería el día de la cena, el resto de la semana (con las cenas ya elegidas) y la cena que la familia tiene ahora para ese día. Tu trabajo es proponer una única cena alternativa:

1. Complementa lo que el niño come en la guardería ese día, siguiendo las recomendaciones de la Asociación Española de Pediatría:
   - Si a mediodía hubo carne, prioriza pescado o huevo por la noche (y viceversa); si hubo legumbre o pasta, cena con verdura y proteína ligera.
   - Equilibra las proteínas de toda la semana (comidas de la guardería y cenas): alterna carne, pescado, huevo y legumbre y evita repetir el mismo grupo muchas veces.
   - Incluye verdura u hortaliza en la cena y fruta o lácteo de postre cuando encaje.
   - Raciones, texturas y preparaciones adecuadas a la edad del niño. Evita sal añadida, azúcares añadidos y alimentos con riesgo de atragantamiento para su edad (frutos secos enteros, uvas enteras, etc.).
   - Platos sencillos de preparar en casa entre semana.
2. NUNCA propongas alimentos que contengan los alérgenos del perfil ni que contradigan su tipo de dieta.
3. Ten en cuenta los gustos y rechazos del niño cuando sea posible, sin sacrificar el equilibrio.
4. Si se pide otra receta, la cena debe ser claramente distinta de la cena actual y de las demás cenas de la semana (otros platos, no una variación mínima).
5. Si se pide cocinar con lo que hay en casa, construye la cena principalmente con los ingredientes indicados, suponiendo que hay básicos de despensa (aceite, agua, especias suaves). Si con esos ingredientes no sale una cena adecuada, propón la mejor opción posible y explica en "tips" qué falta. Aunque un alérgeno del perfil aparezca en la lista, no lo uses nunca.
6. Etiqueta la cena en "proteins" con los grupos de proteína principales que contiene:
   - "carne": incluye aves y embutidos.
   - "pescado": incluye marisco.
   - "huevo": solo cuando el huevo es un componente principal del plato, no un ingrediente menor (rebozados, masas, salsas).
   - "legumbre": lentejas, garbanzos, alubias, guisantes, soja y tofu.
   Usa una lista vacía si la cena no contiene ninguno.

En "rationale" explica en una o dos frases por qué esa cena equilibra el día y la semana. En "nutrientFocus" pon los nutrientes clave que aporta (p. ej. "proteína", "hierro", "fibra", "calcio", "omega-3"). En "tips" da un consejo práctico breve (preparación, cómo presentarlo, alternativa).

Responde siempre en español.`;

const DAY_LABELS: Record<Weekday, string> = {
  lunes: 'lunes',
  martes: 'martes',
  miercoles: 'miércoles',
  jueves: 'jueves',
  viernes: 'viernes',
  sabado: 'sábado',
  domingo: 'domingo',
};

const MEAL_LABELS: Record<SchoolMeal['mealType'], string> = {
  desayuno: 'Desayuno',
  media_manana: 'Media mañana',
  comida: 'Comida',
  merienda: 'Merienda',
};

// Mismas líneas de perfil que el prompt del análisis del menú (prompt.ts).
function describeProfile(profile: ChildProfile): string[] {
  const allergies = [...profile.allergies, profile.otherAllergies.trim()].filter(Boolean);
  return [
    'Perfil del niño:',
    `- Nombre: ${profile.name.trim() || 'sin indicar'}`,
    `- Edad: ${describeAge(profile.birthDate) ?? 'sin indicar'}`,
    `- Alergias e intolerancias: ${allergies.length ? allergies.join(', ') : 'ninguna conocida'}`,
    `- Tipo de dieta: ${DIET_LABELS[profile.diet]}`,
    `- Le gusta: ${profile.likes.trim() || 'sin indicar'}`,
    `- No le gusta: ${profile.dislikes.trim() || 'sin indicar'}`,
    `- Otras notas: ${profile.notes.trim() || 'ninguna'}`,
  ];
}

function describeProteins(proteins: Protein[]): string {
  return proteins.length ? ` (proteínas: ${proteins.join(', ')})` : '';
}

function describeMeals(meals: SchoolMeal[]): string[] {
  if (!meals.length) return ['  - Sin comidas en la guardería'];
  return meals.map(
    (meal) => `  - ${MEAL_LABELS[meal.mealType]}: ${meal.dishes.join(', ') || 'sin platos'}${describeProteins(meal.proteins)}`,
  );
}

function describeDinner(dinner: DinnerProposal): string[] {
  return [
    ...dinner.dishes.map((dish) => `  - ${dish.name}${dish.description ? `: ${dish.description}` : ''}`),
    ...(dinner.proteins.length ? [`  Proteínas: ${dinner.proteins.join(', ')}`] : []),
  ];
}

export function buildDinnerPrompt(input: DinnerAlternativeRequest): string {
  const { profile, mode, pantry, day, week, currentDinner } = input;

  const otherDays = week.filter((weekDay) => weekDay.date !== day.date);
  const weekLines = otherDays.length
    ? otherDays.flatMap((weekDay) => [
        `- ${DAY_LABELS[weekDay.day]} ${weekDay.date}:`,
        ...describeMeals(weekDay.schoolMeals),
        `  - Cena: ${weekDay.dinner?.dishes.map((dish) => dish.name).join(', ') || 'sin elegir'}`,
      ])
    : ['- Sin más días'];

  const request =
    mode === 'pantry'
      ? [
          'Propón una cena para ese día cocinando principalmente con lo que hay en casa:',
          pantry?.trim() ?? '',
        ]
      : [
          'Propón otra receta de cena para ese día, claramente distinta de la cena actual y de las demás cenas de la semana.',
        ];

  const lines = [
    ...describeProfile(profile),
    '',
    `Día de la cena: ${DAY_LABELS[day.day]} ${day.date}`,
    'En la guardería ese día:',
    ...describeMeals(day.schoolMeals),
    '',
    'Resto de la semana:',
    ...weekLines,
    '',
    'Cena actual de ese día:',
    ...describeDinner(currentDinner),
    '',
    ...request,
  ];
  return lines.join('\n');
}
