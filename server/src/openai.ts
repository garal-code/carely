import OpenAI from 'openai';

import type { AIMenuResult, MenuFile } from './types.js';
import { MENU_SCHEMA, SYSTEM_PROMPT } from './prompt.js';

/**
 * Llamada genérica a OpenAI con salida estructurada (modo `strict`). La
 * comparten el análisis del menú y las cenas alternativas.
 */
export async function callOpenAI(params: {
  apiKey: string;
  model: string;
  system: string;
  content: OpenAI.Responses.ResponseInputContent[];
  schema: object;
  schemaName: string;
  /** Mensaje si el modelo no devuelve nada. */
  emptyMessage: string;
}): Promise<unknown> {
  const { apiKey, model, system, content, schema, schemaName, emptyMessage } = params;

  const client = new OpenAI({ apiKey });

  const response = await client.responses.create({
    model,
    instructions: system,
    input: [{ role: 'user', content }],
    text: {
      format: {
        type: 'json_schema',
        name: schemaName,
        strict: true,
        schema: schema as Record<string, unknown>,
      },
    },
  });

  if (response.status === 'incomplete') {
    throw new Error('La respuesta de ChatGPT se ha cortado. Inténtalo de nuevo.');
  }
  if (!response.output_text) {
    throw new Error(emptyMessage);
  }
  return JSON.parse(response.output_text);
}

export async function analyzeWithOpenAI(params: {
  apiKey: string;
  model: string;
  file: MenuFile;
  userPrompt: string;
}): Promise<AIMenuResult> {
  const { apiKey, model, file, userPrompt } = params;

  const fileItem: OpenAI.Responses.ResponseInputContent =
    file.kind === 'pdf'
      ? {
          type: 'input_file',
          filename: file.name,
          file_data: `data:application/pdf;base64,${file.base64}`,
        }
      : {
          type: 'input_image',
          image_url: `data:${file.mimeType};base64,${file.base64}`,
          detail: 'high',
        };

  return (await callOpenAI({
    apiKey,
    model,
    system: SYSTEM_PROMPT,
    content: [fileItem, { type: 'input_text', text: userPrompt }],
    schema: MENU_SCHEMA,
    schemaName: 'daycare_menu',
    emptyMessage: 'ChatGPT no ha devuelto ningún resultado para este menú.',
  })) as AIMenuResult;
}
