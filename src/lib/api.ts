import type { AIMenuResult, AIProvider, ChildProfile, WeeklyMenu } from '../types';
import type { MenuFile } from './files';

// Se definen al compilar la app (ver README): URL del servidor de Carely y
// el secreto compartido que este espera en la cabecera `x-carely-token`.
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? '';

const TIMEOUT_MS = 3 * 60 * 1000;

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  claude: 'Claude',
  openai: 'ChatGPT',
};

export async function analyzeMenu(file: MenuFile, profile: ChildProfile): Promise<WeeklyMenu> {
  if (!API_URL) {
    throw new Error('La app no tiene configurado el servidor (EXPO_PUBLIC_API_URL).');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_URL}/v1/menus/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-carely-token': APP_TOKEN },
      body: JSON.stringify({
        file: { kind: file.kind, name: file.name, mimeType: file.mimeType, base64: file.base64 },
        profile,
      }),
      signal: controller.signal,
    });
  } catch {
    throw new Error(
      controller.signal.aborted
        ? 'El análisis está tardando demasiado. Inténtalo de nuevo.'
        : 'No hay conexión con el servidor. Revisa tu conexión a internet.',
    );
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.menu) {
    throw new Error(data?.error ?? 'Ha ocurrido un error inesperado al analizar el menú.');
  }

  const menu = data.menu as AIMenuResult;
  return {
    ...menu,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    source: { kind: file.kind, name: file.name },
    provider: data.provider,
    model: data.model,
  };
}
