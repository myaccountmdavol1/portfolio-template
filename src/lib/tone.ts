import { pickPassColor } from './badges';

/** Average perceived brightness (0 = black, 1 = white) of RGBA pixels, weighting transparent pixels out. */
export function averageLuminance(pixels: Uint8ClampedArray | number[]): number {
  let total = 0;
  let weight = 0;
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const a = pixels[i + 3] / 255;
    // Rec. 709 luma on gamma-encoded values — close enough to how bright it looks.
    total += ((0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255) * a;
    weight += a;
  }
  return weight > 0 ? total / weight : 0;
}

/** Bright images get dark text; everything else gets white text. */
export function toneForLuminance(luminance: number): 'light' | 'dark' {
  return luminance > 0.6 ? 'light' : 'dark';
}

/** Measures an image file in the browser (a local file, so the canvas isn't cross-origin tainted). */
export async function measureImageTone(file: Blob): Promise<'light' | 'dark' | undefined> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(bitmap, 0, 0, 48, 48);
    bitmap.close();
    return toneForLuminance(averageLuminance(ctx.getImageData(0, 0, 48, 48).data));
  } catch {
    return undefined;
  }
}

/** A Wallet pass colour from badge art (see pickPassColor), measured in the browser. */
export async function passColorFromImage(file: Blob): Promise<string | undefined> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(bitmap, 0, 0, 48, 48);
    bitmap.close();
    return pickPassColor(ctx.getImageData(0, 0, 48, 48).data);
  } catch {
    return undefined;
  }
}

/** The same for an image already online (Credly art), read through our own image optimizer so the browser allows it. */
export async function passColorFromUrl(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(`/_next/image?url=${encodeURIComponent(url)}&w=64&q=75`);
    return res.ok ? await passColorFromImage(await res.blob()) : undefined;
  } catch {
    return undefined;
  }
}
