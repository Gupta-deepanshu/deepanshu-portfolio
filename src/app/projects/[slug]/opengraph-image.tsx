import { getProject, projects } from '@/content/projects';
import { site } from '@/content/site';
import { renderPoster } from '@/lib/poster';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return projects.map(({ slug }) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug) ?? projects[0];
  return renderPoster({
    title: project.title,
    subtitle: project.oneLiner,
    kicker: project.category === 'featured' ? 'CASE STUDY' : 'EARLIER WORK',
    corner: site.name.toUpperCase(),
    accent: project.accent,
    ...size,
  });
}
