import Anthropic from '@anthropic-ai/sdk';

import type { MenuFile } from '../lib/files';
import type { AIMenuResult } from '../types';
import { MENU_SCHEMA, SYSTEM_PROMPT } from './prompt';

export async function analyzeWithClaude(params: {
  apiKey: string;
  model: string;
  file: MenuFile;
  userPrompt: string;
}): Promise<AIMenuResult> {
  const { apiKey, model, file, userPrompt } = params;

  // La app llama a la API directamente desde el dispositivo con la clave del
  // usuario; `dangerouslyAllowBrowser` es necesario para la vista previa web.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

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

  // Si los filtros de seguridad rechazan la petición, la API la reintenta con
  // otro modelo. Haiku no admite este mecanismo.
  const supportsFallbacks = !model.startsWith('claude-haiku');

  const response = await client.beta.messages.create({
    model,
    max_tokens: 16000,
    ...(supportsFallbacks
      ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
      : {}),
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: MENU_SCHEMA as unknown as Record<string, unknown> },
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [fileBlock, { type: 'text', text: userPrompt }],
      },
    ],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('Claude no ha podido procesar este menú. Prueba con otra foto o PDF.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('La respuesta de Claude se ha cortado. Inténtalo de nuevo.');
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
  return JSON.parse(text) as AIMenuResult;
}
