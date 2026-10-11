import type {
  AIMenuResult,
  AIProvider,
  ChildProfile,
  DinnerAlternativeRequest,
  DinnerAlternativeResponse,
  DinnerProposal,
  WeeklyMenu,
} from '../types';
import type { MenuFile } from './files';

// Se definen al compilar la app (ver README): URL del servidor de Carely y
// el secreto compartido que este espera en la cabecera `x-carely-token`.
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? '';

// Los menús mensuales tardan bastante más en analizarse.
const TIMEOUT_MS = 5 * 60 * 1000;
const DINNER_TIMEOUT_MS = 90 * 1000;

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  claude: 'Claude',
  openai: 'ChatGPT',
};

type ApiBody<T> = (Partial<T> & { error?: string }) | null;

/**
 * POST al servidor de Carely con el token de la app y un tiempo máximo.
 * Devuelve el JSON de la respuesta (o null si no lo es) y si fue correcta.
 */
async function postJSON<T>(
  path: string,
  body: unknown,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<{ ok: boolean; data: ApiBody<T> }> {
  if (!API_URL) {
    throw new Error('La app no tiene configurado el servidor (EXPO_PUBLIC_API_URL).');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-carely-token': APP_TOKEN },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new Error(
      controller.signal.aborted
        ? timeoutMessage
        : 'No hay conexión con el servidor. Revisa tu conexión a internet.',
    );
  } finally {
    clearTimeout(timeout);
  }

  const data: ApiBody<T> = await response.json().catch(() => null);
  return { ok: response.ok, data };
}

export async function analyzeMenu(file: MenuFile, profile: ChildProfile): Promise<WeeklyMenu> {
  const { ok, data } = await postJSON<{ menu: AIMenuResult; provider: AIProvider; model: string }>(
    '/v1/menus/analyze',
    {
      file: { kind: file.kind, name: file.name, mimeType: file.mimeType, base64: file.base64 },
      profile,
    },
    TIMEOUT_MS,
    'El análisis está tardando demasiado. Inténtalo de nuevo.',
  );
  if (!ok || !data?.menu) {
    throw new Error(data?.error ?? 'Ha ocurrido un error inesperado al analizar el menú.');
  }

  return {
    ...data.menu,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    source: { kind: file.kind, name: file.name },
    provider: data.provider as AIProvider,
    model: data.model as string,
  };
}

/** Pide otra cena para un día: otra receta distinta o con lo que hay en casa. */
export async function requestDinnerAlternative(
  input: DinnerAlternativeRequest,
): Promise<DinnerProposal> {
  const { ok, data } = await postJSON<DinnerAlternativeResponse>(
    '/v1/dinners/alternative',
    input,
    DINNER_TIMEOUT_MS,
    'La nueva cena está tardando demasiado. Inténtalo de nuevo.',
  );
  if (!ok || !Array.isArray(data?.dinner?.dishes)) {
    throw new Error(data?.error ?? 'Ha ocurrido un error inesperado al buscar otra cena.');
  }
  return data.dinner as DinnerProposal;
}
