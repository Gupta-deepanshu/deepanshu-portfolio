'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import type { Project } from '@/content/types';
import { mediaFor } from '@/lib/media';
import { LinkButton } from '@/components/ui/LinkButton';
import { TransitionLink } from '@/components/ui/TransitionLink';
import { cn } from '@/lib/cn';

interface Props {
  project: Project;
  index: number;
  total: number;
  /** Only the active card may play its video. */
  active?: boolean;
  className?: string;
  priority?: boolean;
}

export function EarlierLabel({ className }: { className?: string }) {
  return (
    <span className={cn('rounded-full border border-line px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted', className)}>
      Earlier work
    </span>
  );
}

export function ProjectCard({ project, index, total, active = false, className, priority }: Props) {
  const media = mediaFor(project);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = media.video.length > 0;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (active && !reduce) v.play().catch(() => {});
    else v.pause();
  }, [active]);

  return (
    <article className={cn('group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-raised/70', className)}>
      <div className="relative aspect-[16/10] overflow-hidden bg-bg">
        <Image
          src={media.poster}
          alt={project.posterAlt}
          fill
          sizes="(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 85vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          priority={priority}
        />
        {hasVideo && (
          <video
            ref={videoRef}
            className={cn('absolute inset-0 h-full w-full object-cover transition-opacity duration-500', active ? 'opacity-100' : 'opacity-0')}
            muted
            loop
            playsInline
            preload="none"
            poster={media.poster}
            aria-hidden="true"
          >
            {media.video.map((v) => (
              <source key={v.src} src={v.src} type={v.type} />
            ))}
          </video>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-3 font-mono text-xs text-muted">
          <span>
            {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
          {project.category === 'earlier' && <EarlierLabel />}
        </div>
        <h3 className="font-display text-3xl leading-tight">
          <TransitionLink href={`/projects/${project.slug}`} className="after:absolute after:inset-0">
            {project.title}
          </TransitionLink>
        </h3>
        <p className="text-fg/80">{project.oneLiner}</p>
        <ul aria-label="Tech stack" className="flex flex-wrap gap-1.5">
          {project.tech.slice(0, 5).map((t) => (
            <li key={t} className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[0.7rem] text-muted">
              {t}
            </li>
          ))}
        </ul>
        <div className="relative z-10 mt-auto flex flex-wrap gap-2 pt-2">
          <LinkButton href={project.links.live}>Live</LinkButton>
          <LinkButton href={project.links.github}>GitHub</LinkButton>
        </div>
      </div>
    </article>
  );
}
