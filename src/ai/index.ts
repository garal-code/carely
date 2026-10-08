import type { MenuFile } from '../lib/files';
import type { AIProvider, AISettings, ChildProfile, WeeklyMenu } from '../types';
import { analyzeWithClaude } from './claude';
import { analyzeWithOpenAI } from './openai';
import { buildUserPrompt } from './prompt';

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  claude: 'Claude (Anthropic)',
  openai: 'ChatGPT (OpenAI)',
};

export async function analyzeMenu(params: {
  file: MenuFile;
  profile: ChildProfile;
  settings: AISettings;
  apiKey: string;
}): Promise<WeeklyMenu> {
  const { file, profile, settings, apiKey } = params;
  const userPrompt = buildUserPrompt(profile);
  const model = settings.provider === 'claude' ? settings.claudeModel : settings.openaiModel;

  let result;
  try {
    result =
      settings.provider === 'claude'
        ? await analyzeWithClaude({ apiKey, model, file, userPrompt })
        : await analyzeWithOpenAI({ apiKey, model, file, userPrompt });
  } catch (error) {
    throw new Error(describeError(error));
  }

  return {
    ...result,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    source: { kind: file.kind, name: file.name },
    provider: settings.provider,
    model,
  };
}

function describeError(error: unknown): string {
  const status = (error as { status?: number })?.status;
  if (status === 401) return 'La clave de API no es válida. Revísala en Ajustes.';
  if (status === 403) return 'Tu clave de API no tiene permiso para usar este modelo.';
  if (status === 404) return 'El modelo configurado no existe o no está disponible. Revísalo en Ajustes.';
  if (status === 413) return 'El fichero es demasiado grande. Prueba con una foto más pequeña o un PDF más ligero.';
  if (status === 429) return 'Has alcanzado el límite de uso o no tienes saldo en la cuenta de API. Inténtalo más tarde.';
  if (status && status >= 500) return 'El servicio de IA no está disponible ahora mismo. Inténtalo más tarde.';
  if (error instanceof SyntaxError) return 'La IA ha devuelto una respuesta con un formato inesperado. Inténtalo de nuevo.';
  if (error instanceof Error && error.message) return error.message;
  return 'Ha ocurrido un error inesperado al analizar el menú.';
}
