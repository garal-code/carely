import OpenAI from 'openai';

import type { MenuFile } from '../lib/files';
import type { AIMenuResult } from '../types';
import { MENU_SCHEMA, SYSTEM_PROMPT } from './prompt';

export async function analyzeWithOpenAI(params: {
  apiKey: string;
  model: string;
  file: MenuFile;
  userPrompt: string;
}): Promise<AIMenuResult> {
  const { apiKey, model, file, userPrompt } = params;

  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

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

  const response = await client.responses.create({
    model,
    instructions: SYSTEM_PROMPT,
    input: [
      {
        role: 'user',
        content: [fileItem, { type: 'input_text', text: userPrompt }],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'weekly_menu',
        strict: true,
        schema: MENU_SCHEMA as unknown as Record<string, unknown>,
      },
    },
  });

  if (response.status === 'incomplete') {
    throw new Error('La respuesta de ChatGPT se ha cortado. Inténtalo de nuevo.');
  }
  if (!response.output_text) {
    throw new Error('ChatGPT no ha devuelto ningún resultado para este menú.');
  }
  return JSON.parse(response.output_text) as AIMenuResult;
}
