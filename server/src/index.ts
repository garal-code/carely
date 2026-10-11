import express from 'express';
import type { NextFunction, Request, Response } from 'express';

import { analyzeWithClaude, callClaude } from './claude.js';
import { buildDinnerPrompt, DINNER_SCHEMA, DINNER_SYSTEM_PROMPT } from './dinner.js';
import { analyzeWithOpenAI, callOpenAI } from './openai.js';
import { buildUserPrompt } from './prompt.js';
import { DIET_LABELS, PROTEINS, WEEKDAYS } from './types.js';
import type {
  ChildProfile,
  Diet,
  DinnerAlternativeRequest,
  DinnerDayInput,
  DinnerMode,
  DinnerProposal,
  DinnerWeekDayInput,
  MenuFile,
  Protein,
  SchoolMeal,
  Weekday,
} from './types.js';

const config = {
  port: Number(process.env.PORT ?? 3000),
  provider: process.env.AI_PROVIDER === 'openai' ? 'openai' : 'claude',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  claudeModel: process.env.CLAUDE_MODEL ?? 'claude-opus-5-5',
  openaiModel: process.env.OPENAI_MODEL ?? 'gpt-6.1-sol',
  /** Secreto compartido con la app; si está vacío no se comprueba. */
  appToken: process.env.APP_TOKEN ?? '',
  rateLimitPerHour: Number(process.env.RATE_LIMIT_PER_HOUR ?? 20),
} as const;

const apiKey = config.provider === 'claude' ? config.anthropicApiKey : config.openaiApiKey;
const model = config.provider === 'claude' ? config.claudeModel : config.openaiModel;

if (!apiKey) {
  console.error(
    `Falta la clave de API: define ${config.provider === 'claude' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'}.`,
  );
  process.exit(1);
}

// --- Validación de la petición -------------------------------------------

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
// ~20 MB de fichero original (base64 ocupa 4/3).
const MAX_BASE64_LENGTH = 27_000_000;

function text(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function parseFile(body: unknown): MenuFile {
  const file = (body as { file?: Record<string, unknown> })?.file;
  if (!file || (file.kind !== 'image' && file.kind !== 'pdf')) {
    throw new HttpError(400, 'Falta el fichero del menú.');
  }
  if (typeof file.base64 !== 'string' || file.base64.length === 0) {
    throw new HttpError(400, 'El fichero está vacío.');
  }
  if (file.base64.length > MAX_BASE64_LENGTH) {
    throw new HttpError(413, 'El fichero es demasiado grande. Prueba con una foto o un PDF más ligero.');
  }
  const mimeType = file.kind === 'pdf' ? 'application/pdf' : text(file.mimeType, 50);
  if (file.kind === 'image' && !IMAGE_TYPES.includes(mimeType)) {
    throw new HttpError(400, 'Formato de imagen no admitido. Usa JPG o PNG.');
  }
  return { kind: file.kind, name: text(file.name, 200) || 'menu', mimeType, base64: file.base64 };
}

function parseProfile(body: unknown): ChildProfile {
  const p = ((body as { profile?: Record<string, unknown> })?.profile ?? {}) as Record<string, unknown>;
  const diet = (Object.keys(DIET_LABELS) as Diet[]).includes(p.diet as Diet) ? (p.diet as Diet) : 'omnivora';
  const allergies = Array.isArray(p.allergies)
    ? p.allergies.filter((a): a is string => typeof a === 'string').slice(0, 30).map((a) => a.slice(0, 60))
    : [];
  return {
    name: text(p.name, 80),
    birthDate: text(p.birthDate, 10),
    allergies,
    otherAllergies: text(p.otherAllergies),
    diet,
    likes: text(p.likes),
    dislikes: text(p.dislikes),
    notes: text(p.notes),
  };
}

// --- Validación de la cena alternativa --------------------------------------

const DINNER_MODES: DinnerMode[] = ['another', 'pantry'];
const MEAL_TYPES: SchoolMeal['mealType'][] = ['desayuno', 'media_manana', 'comida', 'merienda'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PANTRY_LENGTH = 1000;
const MAX_WEEK_DAYS = 7;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: unknown, maxItems = 20, max = 200): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string').slice(0, maxItems).map((v) => v.slice(0, max))
    : [];
}

// Los menús guardados antes de etiquetar proteínas no las traen: lista vacía.
function proteins(value: unknown): Protein[] {
  return Array.isArray(value)
    ? PROTEINS.filter((protein) => value.includes(protein))
    : [];
}

function parseDayInput(value: unknown): DinnerDayInput {
  if (
    !isObject(value) ||
    typeof value.date !== 'string' ||
    !DATE_RE.test(value.date) ||
    !WEEKDAYS.includes(value.day as Weekday) ||
    !Array.isArray(value.schoolMeals)
  ) {
    throw new HttpError(400, 'Los datos del día no son válidos.');
  }
  const schoolMeals = value.schoolMeals.slice(0, MEAL_TYPES.length).map((meal): SchoolMeal => {
    if (!isObject(meal) || !MEAL_TYPES.includes(meal.mealType as SchoolMeal['mealType'])) {
      throw new HttpError(400, 'Los datos del día no son válidos.');
    }
    return {
      mealType: meal.mealType as SchoolMeal['mealType'],
      dishes: strings(meal.dishes),
      proteins: proteins(meal.proteins),
    };
  });
  return { date: value.date, day: value.day as Weekday, schoolMeals };
}

function parseWeek(value: unknown): DinnerWeekDayInput[] {
  if (!Array.isArray(value)) throw new HttpError(400, 'Faltan los días de la semana.');
  if (value.length > MAX_WEEK_DAYS) {
    throw new HttpError(400, 'La semana no puede tener más de 7 días.');
  }
  return value.map((entry): DinnerWeekDayInput => {
    const day = parseDayInput(entry);
    const dinner = (entry as { dinner?: unknown }).dinner;
    if (!isObject(dinner) || !Array.isArray(dinner.dishes)) return day;
    const dishes = dinner.dishes
      .slice(0, 10)
      .filter(isObject)
      .map((dish) => ({ name: text(dish.name, 200) }))
      .filter((dish) => dish.name);
    return { ...day, dinner: { dishes } };
  });
}

function parseCurrentDinner(value: unknown): DinnerProposal {
  if (!isObject(value) || !Array.isArray(value.dishes)) {
    throw new HttpError(400, 'Falta la cena actual del día.');
  }
  const dishes = value.dishes
    .slice(0, 10)
    .filter(isObject)
    .map((dish) => ({ name: text(dish.name, 200), description: text(dish.description) }))
    .filter((dish) => dish.name);
  return {
    dishes,
    rationale: text(value.rationale),
    nutrientFocus: strings(value.nutrientFocus, 10, 60),
    tips: text(value.tips),
    proteins: proteins(value.proteins),
  };
}

function parseDinnerRequest(body: unknown): DinnerAlternativeRequest {
  const b = (isObject(body) ? body : {}) as Record<string, unknown>;
  if (!DINNER_MODES.includes(b.mode as DinnerMode)) {
    throw new HttpError(400, 'El tipo de propuesta no es válido.');
  }
  const mode = b.mode as DinnerMode;
  let pantry: string | undefined;
  if (mode === 'pantry') {
    if (typeof b.pantry !== 'string' || !b.pantry.trim()) {
      throw new HttpError(400, 'Indica qué ingredientes tienes en casa.');
    }
    if (b.pantry.length > MAX_PANTRY_LENGTH) {
      throw new HttpError(400, 'La lista de ingredientes es demasiado larga (máximo 1000 caracteres).');
    }
    pantry = b.pantry.trim();
  }
  if (!isObject(b.profile)) throw new HttpError(400, 'Falta el perfil del niño.');
  return {
    profile: parseProfile(body),
    mode,
    pantry,
    day: parseDayInput(b.day),
    week: parseWeek(b.week),
    currentDinner: parseCurrentDinner(b.currentDinner),
  };
}

// --- Protección básica -----------------------------------------------------

function requireAppToken(req: Request, _res: Response, next: NextFunction) {
  if (config.appToken && req.get('x-carely-token') !== config.appToken) {
    return next(new HttpError(401, 'No autorizado.'));
  }
  next();
}

const hits = new Map<string, number[]>();
function rateLimit(req: Request, _res: Response, next: NextFunction) {
  const key = req.ip ?? 'unknown';
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= config.rateLimitPerHour) {
    return next(new HttpError(429, 'Has analizado muchos menús seguidos. Inténtalo dentro de un rato.'));
  }
  recent.push(now);
  hits.set(key, recent);
  next();
}

// --- Errores de la IA ------------------------------------------------------

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  const status = (error as { status?: number })?.status;
  if (status === 400 || status === 413) {
    return new HttpError(422, 'No se ha podido leer el fichero. Prueba con una foto más nítida o con el PDF.');
  }
  if (status === 429 || status === 529) {
    return new HttpError(503, 'Hay mucha demanda ahora mismo. Inténtalo en unos minutos.');
  }
  if (status === 401 || status === 403 || status === 404) {
    return new HttpError(500, 'El servicio no está bien configurado. Avisa al administrador.');
  }
  if (status && status >= 500) {
    return new HttpError(503, 'El servicio de IA no está disponible ahora mismo. Inténtalo más tarde.');
  }
  if (error instanceof SyntaxError) {
    return new HttpError(502, 'La IA ha devuelto una respuesta inesperada. Inténtalo de nuevo.');
  }
  if (error instanceof Error && error.message) return new HttpError(502, error.message);
  return new HttpError(500, 'Ha ocurrido un error inesperado al analizar el menú.');
}

// --- Rutas -----------------------------------------------------------------

const app = express();
app.set('trust proxy', 1); // Railway pone un proxy delante
app.use(express.json({ limit: '30mb' }));

// Permite usar la vista previa web de Expo contra este servidor. La app
// nativa no lo necesita, y la autenticación va en una cabecera, no en cookies.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-carely-token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/v1/menus/analyze', requireAppToken, rateLimit, async (req, res) => {
  const file = parseFile(req.body);
  const profile = parseProfile(req.body);
  const userPrompt = buildUserPrompt(profile);
  const started = Date.now();

  const menu =
    config.provider === 'claude'
      ? await analyzeWithClaude({ apiKey, model, file, userPrompt })
      : await analyzeWithOpenAI({ apiKey, model, file, userPrompt });

  console.log(
    `analyze ok kind=${file.kind} size=${file.base64.length} weeks=${menu.weeks.length} days=${menu.weeks.reduce((total, week) => total + week.days.length, 0)} ms=${Date.now() - started}`,
  );
  res.json({ menu, provider: config.provider, model });
});

app.post('/v1/dinners/alternative', requireAppToken, rateLimit, async (req, res) => {
  const input = parseDinnerRequest(req.body);
  const userPrompt = buildDinnerPrompt(input);
  const started = Date.now();

  let dinner: DinnerProposal;
  try {
    dinner = (
      config.provider === 'claude'
        ? await callClaude({
            apiKey,
            model,
            system: DINNER_SYSTEM_PROMPT,
            content: [{ type: 'text', text: userPrompt }],
            schema: DINNER_SCHEMA,
            maxTokens: 4000,
            refusalMessage: 'Claude no ha podido proponer una cena. Inténtalo de nuevo.',
          })
        : await callOpenAI({
            apiKey,
            model,
            system: DINNER_SYSTEM_PROMPT,
            content: [{ type: 'input_text', text: userPrompt }],
            schema: DINNER_SCHEMA,
            schemaName: 'dinner_proposal',
            emptyMessage: 'ChatGPT no ha devuelto ninguna cena.',
          })
    ) as DinnerProposal;
  } catch (error) {
    // Aquí no hay fichero: un 400/413 de la IA no se debe a una foto ilegible.
    const status = (error as { status?: number })?.status;
    if (status === 400 || status === 413) {
      console.error('dinner error', error);
      throw new HttpError(502, 'No se ha podido proponer otra cena. Inténtalo de nuevo.');
    }
    throw error;
  }

  console.log(
    `dinner ok mode=${input.mode} pantry=${input.pantry?.length ?? 0} week=${input.week.length} dishes=${dinner.dishes.length} proteins=${dinner.proteins.join('+') || '-'} ms=${Date.now() - started}`,
  );
  res.json({ dinner, provider: config.provider, model });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const httpError =
    (error as { type?: string })?.type === 'entity.too.large'
      ? new HttpError(413, 'El fichero es demasiado grande. Prueba con una foto o un PDF más ligero.')
      : toHttpError(error);
  if (httpError.status >= 500) console.error('analyze error', error);
  res.status(httpError.status).json({ error: httpError.message });
});

app.listen(config.port, () => {
  console.log(`Carely API escuchando en :${config.port} (${config.provider}, ${model})`);
});
