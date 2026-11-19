import { site } from '@/content/site';
import { renderPoster } from '@/lib/poster';

export const alt = `${site.name}, ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return renderPoster({
    title: site.name,
    subtitle: site.intro,
    kicker: site.role.toUpperCase(),
    corner: site.location.toUpperCase(),
    accent: '#A594FF',
    ...size,
  });
}
