'use client';

/**
 * Mobile / reduced-motion / no-WebGL carousel: a native horizontal scroll-snap list.
 * Swiping is the browser's own (smooth, accessible, no library). The active card is
 * whichever is mostly visible; only it plays a video.
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { projects } from '@/content/projects';
import { ProjectCard } from './ProjectCard';
import { NavButton } from '@/components/ui/NavButton';

export function SwipeCarousel() {
  const listRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        });
      },
      { root: list, threshold: 0.6 },
    );
    list.querySelectorAll('[data-index]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const go = useCallback((index: number) => {
    const list = listRef.current;
    const i = Math.max(0, Math.min(projects.length - 1, index));
    const el = list?.querySelector<HTMLElement>(`[data-index="${i}"]`);
    if (!list || !el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    list.scrollTo({ left: el.offsetLeft - list.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      go(active + (e.key === 'ArrowRight' ? 1 : -1));
    }
  };

  return (
    <div role="group" aria-roledescription="carousel" aria-label="Projects" onKeyDown={onKeyDown}>
      <ul
        ref={listRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--gutter)] pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-lenis-prevent-horizontal=""
      >
        {projects.map((p, i) => (
          <li
            key={p.slug}
            data-index={i}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${projects.length}`}
            className="w-[85vw] max-w-md shrink-0 snap-center sm:w-[60vw]"
          >
            <ProjectCard project={p} index={i} total={projects.length} active={i === active} />
          </li>
        ))}
      </ul>
      <div className="container-x flex items-center justify-between">
        <div className="flex gap-1.5" aria-hidden="true">
          {projects.map((p, i) => (
            <span key={p.slug} className={`h-1 rounded-full transition-all duration-300 ${i === active ? 'w-6 bg-accent' : 'w-1.5 bg-line'}`} />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <p className="font-mono text-sm tabular-nums text-muted" aria-live="polite">
            <span className="sr-only">Project </span>
            {active + 1} / {projects.length}
          </p>
          <NavButton label="Previous project" onClick={() => go(active - 1)} disabled={active === 0} dir={-1} />
          <NavButton label="Next project" onClick={() => go(active + 1)} disabled={active === projects.length - 1} dir={1} />
        </div>
      </div>
    </div>
  );
}
