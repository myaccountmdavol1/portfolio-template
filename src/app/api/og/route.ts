import { readDeepLink, resolveDeepLink } from '@/lib/deepLink';
import { getVisitorSite } from '@/lib/addons/visitorSite';
import { itemCard, siteCard } from '@/lib/og/cards';

/** GET /api/og — the site's share picture; with ?open=…&item=… the picture for that app, badge, or photo. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const data = await getVisitorSite();
  const { open, item } = readDeepLink(url.search);
  const target = resolveDeepLink(data, open, item);
  return target ? itemCard(data, target, url.origin) : siteCard(data);
}
