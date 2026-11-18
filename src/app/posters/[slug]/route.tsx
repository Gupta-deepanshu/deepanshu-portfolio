import { projects, getProject } from '@/content/projects';
import { renderPoster } from '@/lib/poster';

/**
 * Generated placeholder poster for a project (1600×1000 PNG), built at build time.
 * Used by cards, the WebGL carousel texture and project page heroes until a real
 * screenshot exists in public/projects/<slug>/poster.*.
 */
export function generateStaticParams() {
  return projects.map(({ slug }) => ({ slug }));
}

export async function GET(_request: Request, { params }: RouteContext<'/posters/[slug]'>) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return new Response('Not found', { status: 404 });
  const index = projects.indexOf(project) + 1;
  return renderPoster({
    title: project.title,
    subtitle: project.oneLiner,
    kicker: project.category === 'featured' ? 'CASE STUDY' : 'EARLIER WORK',
    corner: `${String(index).padStart(2, '0')} / ${String(projects.length).padStart(2, '0')}`,
    accent: project.accent,
    width: 1600,
    height: 1000,
  });
}
