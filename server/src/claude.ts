import Anthropic from '@anthropic-ai/sdk';

import type { AIMenuResult, MenuFile } from './types.js';
import { MENU_SCHEMA, SYSTEM_PROMPT } from './prompt.js';

/**
 * Llamada genérica a Claude con salida estructurada. La comparten el análisis
 * del menú y las cenas alternativas.
 */
export async function callClaude(params: {
  apiKey: string;
  model: string;
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[];
  schema: object;
  maxTokens: number;
  /** Mensaje si los filtros de seguridad rechazan la petición. */
  refusalMessage: string;
}): Promise<unknown> {
  const { apiKey, model, system, content, schema, maxTokens, refusalMessage } = params;

  const client = new Anthropic({ apiKey });

  // Si los filtros de seguridad rechazan la petición, la API la reintenta con
  // otro modelo. Haiku no admite este mecanismo.
  const supportsFallbacks = !model.startsWith('claude-haiku');

  // Con un max_tokens alto el SDK exige streaming; finalMessage() acumula la
  // respuesta completa.
  const stream = client.beta.messages.stream({
    model,
    max_tokens: maxTokens,
    ...(supportsFallbacks
      ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
      : {}),
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: schema as Record<string, unknown> },
    },
    system,
    messages: [{ role: 'user', content }],
  });
  const response = await stream.finalMessage();

  if (response.stop_reason === 'refusal') {
    throw new Error(refusalMessage);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('La respuesta de Claude se ha cortado. Inténtalo de nuevo.');
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
  return JSON.parse(text);
}

export async function analyzeWithClaude(params: {
  apiKey: string;
  model: string;
  file: MenuFile;
  userPrompt: string;
}): Promise<AIMenuResult> {
  const { apiKey, model, file, userPrompt } = params;

  const fileBlock: Anthropic.Beta.BetaContentBlockParam =
    file.kind === 'pdf'
      ? {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: file.base64 },
        }
      : {
          type: 'image',
          source: {
            type: 'base64',
            media_type: file.mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
            data: file.base64,
          },
        };

  // Un menú mensual (unos 22 días, cada uno con su cena) necesita mucha salida.
  return (await callClaude({
    apiKey,
    model,
    system: SYSTEM_PROMPT,
    content: [fileBlock, { type: 'text', text: userPrompt }],
    schema: MENU_SCHEMA,
    maxTokens: 32000,
    refusalMessage: 'Claude no ha podido procesar este menú. Prueba con otra foto o PDF.',
  })) as AIMenuResult;
}
