import { NotFoundView, type NotFoundIcon } from '@/components/notFound/NotFoundView';
import { secretAchievements } from '@/lib/achievements';
import { getPublishedSite } from '@/lib/getSiteData';

/** Any unknown URL: the site's own app icons assemble into “404” (with a hidden game). */
export default async function NotFound() {
  const data = await getPublishedSite();
  const { site, apps } = data;
  const icons: NotFoundIcon[] = apps.filter((a) => a.visible).map((a) => ({ icon: a.icon, title: a.title }));
  const settings = site.notFound ?? {};
  return (
    <NotFoundView
      icons={icons}
      message={settings.message}
      imageUrl={settings.imageUrl}
      game={settings.game !== false}
      lostAndFound={secretAchievements(data).some((a) => a.id === 'lost')}
      iconPack={site.style?.iconPack}
    />
  );
}
