import { File } from 'expo-file-system';

/** Fichero de menú listo para enviar a la IA. */
export interface MenuFile {
  kind: 'image' | 'pdf';
  name: string;
  mimeType: string;
  base64: string;
  /** URI local para la vista previa. */
  uri: string;
}

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function normalizeImageMimeType(mimeType: string | null | undefined): string {
  if (mimeType && SUPPORTED_IMAGE_TYPES.includes(mimeType)) return mimeType;
  // El selector de imágenes recomprime a JPEG cuando se indica `quality`.
  return 'image/jpeg';
}

/** Quita la cabecera `data:...;base64,` si la tiene. */
export function stripDataUrl(value: string): string {
  return value.startsWith('data:') ? value.slice(value.indexOf(',') + 1) : value;
}

/**
 * Lee un fichero como base64. En web, los selectores devuelven `data:` o
 * `blob:` URIs en lugar de rutas del sistema de ficheros.
 */
export async function readAsBase64(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return stripDataUrl(uri);
  if (uri.startsWith('blob:')) {
    const blob = await (await fetch(uri)).blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return stripDataUrl(dataUrl);
  }
  return new File(uri).base64();
}
