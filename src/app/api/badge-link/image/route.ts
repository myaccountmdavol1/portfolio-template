// Fetches a badge or certificate image for the editor, so it can be saved into the owner's own storage
// (some sites' image links expire). Only these hosts, only images, at most 10MB.
const ALLOWED = [/(^|\.)sj-cdn\.net$/, /(^|\.)parchment\.com$/, /(^|\.)badgr\.io$/, /(^|\.)credential\.net$/, /(^|\.)credly\.com$/, /^storage\.googleapis\.com$/, /\.public\.blob\.vercel-storage\.com$/];

export async function GET(request: Request) {
  let url: URL;
  try {
    url = new URL(new URL(request.url).searchParams.get('url') ?? '');
  } catch {
    return new Response('Bad link', { status: 400 });
  }
  if (url.protocol !== 'https:' || !ALLOWED.some((host) => host.test(url.hostname))) return new Response('Not allowed', { status: 403 });
  const res = await fetch(url, { cache: 'no-store' }).catch(() => null);
  const type = res?.headers.get('content-type') ?? '';
  if (!res?.ok || !type.startsWith('image/')) return new Response('Not an image', { status: 422 });
  const body = await res.arrayBuffer();
  if (body.byteLength > 10 * 1024 * 1024) return new Response('Too big', { status: 413 });
  return new Response(body, { headers: { 'Content-Type': type, 'Cache-Control': 'no-store' } });
}
