import { mediaDir } from '@/lib/media';
import { diskMedia } from '@/lib/media/disk';

const TYPES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif',
  pdf: 'application/pdf', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg',
};

/** Serves local uploads in development and e2e. Never in production (mediaDir() is null there). */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const dir = mediaDir();
  if (!dir) return new Response('Not found', { status: 404 });
  const path = (await params).path.join('/');
  const bytes = await diskMedia(dir).read(path).catch(() => null);
  if (!bytes) return new Response('Not found', { status: 404 });
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': TYPES[ext] ?? 'application/octet-stream', 'Cache-Control': 'no-store' } });
}
