import { mediaManifest } from '@/content/media.generated';
import type { Project } from '@/content/types';

export interface ResolvedMedia {
  /** Real screenshot if one exists in public/projects/<slug>/, else the generated poster. */
  poster: string;
  generated: boolean;
  video: { src: string; type: string }[];
}

/** URL of the generated gradient poster (see src/app/posters/[slug]/route.tsx). */
export const generatedPosterUrl = (slug: string) => `/posters/${slug}`;

export function mediaFor(project: Pick<Project, 'slug'>): ResolvedMedia {
  const found = mediaManifest[project.slug];
  return {
    poster: found?.poster ?? generatedPosterUrl(project.slug),
    generated: !found?.poster,
    video: found?.video ?? [],
  };
}
