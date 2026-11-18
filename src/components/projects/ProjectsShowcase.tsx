'use client';

/**
 * Chooses how the six projects are shown:
 *   desktop + motion + WebGL2  → PinnedGallery (pinned WebGL Circular Gallery)
 *   otherwise                  → SwipeCarousel (native scroll-snap)
 *   "View as list"             → a plain grid of all six, for anyone who wants it
 *
 * The server render (and first client render) is the swipe carousel, so all six
 * projects are in the HTML before any JS runs. The view switch is a Motion
 * cross-fade on the wrapper; GSAP never touches that wrapper.
 */
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { projects } from '@/content/projects';
import { useIsDesktop, useReducedMotion, useWebGL2 } from '@/lib/media-query';
import { ScrollTrigger } from '@/lib/gsap';
import { PinnedGallery } from './PinnedGallery';
import { SwipeCarousel } from './SwipeCarousel';
import { ProjectCard } from './ProjectCard';

type View = 'carousel' | 'list';

export function ProjectsShowcase() {
  const [view, setView] = useState<View>('carousel');
  const [glFailed, setGlFailed] = useState(false);
  const desktop = useIsDesktop();
  const reduce = useReducedMotion();
  const webgl = useWebGL2();
  const pinned = desktop && !reduce && webgl && !glFailed;

  const toggle = () => {
    setView((v) => (v === 'carousel' ? 'list' : 'carousel'));
    // Section height changes a lot (pin spacer appears/disappears): re-measure after paint.
    requestAnimationFrame(() => requestAnimationFrame(() => ScrollTrigger.refresh()));
  };

  return (
    <div>
      <div className="container-x mb-10 flex items-center justify-end">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={view === 'list'}
          className="inline-flex items-center gap-3 rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-fg hover:text-fg"
        >
          <span aria-hidden="true" className="relative inline-flex h-4 w-7 rounded-full bg-line">
            <motion.span
              className="absolute top-0.5 size-3 rounded-full bg-fg"
              animate={{ x: view === 'list' ? 14 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          </span>
          View as list
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view === 'list' ? 'list' : pinned ? 'pinned' : 'swipe'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {view === 'list' ? (
            <ul className="container-x grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p, i) => (
                <li key={p.slug}>
                  <ProjectCard project={p} index={i} total={projects.length} />
                </li>
              ))}
            </ul>
          ) : pinned ? (
            <PinnedGallery onFail={() => setGlFailed(true)} />
          ) : (
            <SwipeCarousel />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
