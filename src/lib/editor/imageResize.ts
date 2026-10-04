/** Photos are shrunk before they're uploaded, so a 12 MB phone photo doesn't slow the site down. */
export const MAX_IMAGE_EDGE = 2400;
export const RESIZE_ABOVE_BYTES = 1_500_000;
export const JPEG_QUALITY = 0.85;

/** The largest size with the same shape whose longer edge is at most `max`. Never upscales; bad input comes back unchanged. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const valid = [width, height, max].every((n) => Number.isFinite(n)) && width > 0 && height > 0 && max > 0;
  if (!valid || Math.max(width, height) <= max) return { width, height };
  const scale = max / Math.max(width, height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

const RESIZABLE = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/** GIFs may be animated and SVGs are already small vectors, so only the still bitmap formats are resized. */
export function shouldResize(type: string, size: number, width: number, height: number): boolean {
  if (!RESIZABLE.includes(type.toLowerCase())) return false;
  return Math.max(width, height) > MAX_IMAGE_EDGE || size > RESIZE_ABOVE_BYTES;
}

function hasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Shrinks a big photo (respecting its EXIF rotation) to fit MAX_IMAGE_EDGE, as a JPEG, or a PNG if it has
 * transparency. Returns the original file if it needs no change, can't be decoded, or the result isn't smaller.
 * Never throws.
 */
export async function prepareImage(file: File): Promise<File> {
  try {
    if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
    if (!RESIZABLE.includes(file.type.toLowerCase())) return file;
    let canvas: HTMLCanvasElement | null = null;
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    try {
      if (!shouldResize(file.type, file.size, bitmap.width, bitmap.height)) return file;
      const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_IMAGE_EDGE);
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, width, height);
      const keepPng = (file.type === 'image/png' || file.type === 'image/webp') && hasTransparency(ctx, width, height);
      if (!keepPng) {
        // JPEG has no alpha: paint the photo over white so nothing turns black.
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
      }
      const type = keepPng ? 'image/png' : 'image/jpeg';
      const blob = await canvasToBlob(canvas, type, keepPng ? undefined : JPEG_QUALITY);
      if (!blob || blob.size >= file.size) return file;
      const base = file.name.replace(/\.[^./]+$/, '') || 'photo';
      return new File([blob], `${base}.${keepPng ? 'png' : 'jpg'}`, { type, lastModified: file.lastModified });
    } finally {
      bitmap.close();
      if (canvas) canvas.width = canvas.height = 0; // free the pixels now; iOS caps total canvas memory
    }
  } catch (err) {
    console.error('Could not resize the image; uploading it as is', err);
    return file;
  }
}
