'use client';

/**
 * Desktop projects reel: the section pins, and scroll progress (ScrollTrigger,
 * scrubbed, snapping to each project) turns the WebGL CurvedReel: a curved room
 * with the active project large in the centre and its neighbours at the edges.
 *
 * - Scroll position is the single source of truth. Arrow keys and Prev/Next buttons
 *   don't rotate the gallery directly; they scroll the page to that project's snap
 *   point, and the ScrollTrigger update does the rest. Keyboard, buttons, wheel and
 *   scrollbar can never disagree.
 * - The canvas is decoration (aria-hidden). Title, one-liner, tech, links, the
 *   "Earlier work" label and the 1/6 counter are real HTML in the overlay.
 * - The canvas counts toward the WebGL budget: paused off-screen, unmounted when
 *   far away. If WebGL fails, the parent switches to the HTML swipe carousel.
 */
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { projects } from '@/content/projects';
import { mediaFor } from '@/lib/media';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { useWebGLSlot } from '@/lib/gl-budget';
import { scrollToY } from '@/lib/scroll';
import type { CurvedReelHandle, ReelItem } from '@/components/three/CurvedReel';
import DecryptedText from '@/components/reactbits/DecryptedText';
import { LinkButton, Arrow } from '@/components/ui/LinkButton';
import { NavButton } from '@/components/ui/NavButton';
import { TransitionLink } from '@/components/ui/TransitionLink';
import { EarlierLabel } from './ProjectCard';

const CurvedReel = dynamic(() => import('@/components/three/CurvedReel'), { ssr: false });

const items: ReelItem[] = projects.map((p) => {
  const m = mediaFor(p);
  return { image: m.poster, video: m.video, accent: p.accent };
});
const LAST = projects.length - 1;

export function PinnedGallery({ onFail }: { onFail: () => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<CurvedReelHandle | null>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const progressRef = useRef(0);
  const glassRef = useRef(0);
  const [active, setActive] = useState(0);
  const slot = useWebGLSlot(stageRef);

  useGSAP(
    () => {
      const stage = stageRef.current;
      if (!stage) return;
      triggerRef.current = ScrollTrigger.create({
        trigger: stage,
        pin: true,
        start: 'top top',
        end: () => `+=${window.innerHeight * LAST}`,
        scrub: true,
        invalidateOnRefresh: true,
        snap: { snapTo: 1 / LAST, duration: { min: 0.25, max: 0.6 }, delay: 0.08, ease: 'power2.inOut' },
        onUpdate: (self) => {
          progressRef.current = self.progress;
          galleryRef.current?.setProgress(self.progress);
          const next = Math.round(self.progress * LAST);
          setActive((prev) => (prev === next ? prev : next));
        },
        // This pin is created after hydration (it only exists on desktop), so the
        // triggers of the sections below it were measured without its spacer.
        // Refresh it first, then re-measure everything in page order.
        refreshPriority: 1,
      });
      // Glass D hand-off: over the stage's last 25vh before it pins, the reel's glass D
      // fades in exactly where the outline D (OutlineStage) is fading out.
      const glassTrigger = ScrollTrigger.create({
        trigger: stage,
        start: 'top 25%',
        end: 'top top',
        onUpdate: (self) => {
          glassRef.current = self.progress;
          galleryRef.current?.setGlassAlpha(self.progress);
        },
        onRefresh: (self) => {
          glassRef.current = self.progress;
          galleryRef.current?.setGlassAlpha(self.progress);
        },
      });
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
      return () => {
        glassTrigger.kill();
        triggerRef.current?.kill();
        triggerRef.current = null;
        // Spacer gone (list view / mobile): re-measure the sections below.
        requestAnimationFrame(() => ScrollTrigger.refresh());
      };
    },
    { scope: stageRef },
  );

  // Ref callback: when the gallery (re)mounts after being released, sync it at once.
  const attachGallery = useCallback((handle: CurvedReelHandle | null) => {
    galleryRef.current = handle;
    handle?.setProgress(progressRef.current);
    handle?.setGlassAlpha(glassRef.current);
  }, []);

  const go = useCallback((index: number) => {
    const st = triggerRef.current;
    const i = gsap.utils.clamp(0, LAST, index);
    if (!st) return;
    scrollToY(st.start + ((st.end - st.start) * i) / LAST);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step) {
      e.preventDefault();
      go(active + step);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      go(e.key === 'Home' ? 0 : LAST);
    }
  };

  const project = projects[active];

  return (
    <div ref={stageRef} data-gl-slot="projects" data-gl-state={slot} className="relative h-svh overflow-hidden">
      {/* Full-bleed canvas; the top edge dissolves into the section heading above. */}
      <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,#000_14%)]">
        {slot !== 'released' && (
          <CurvedReel ref={attachGallery} items={items} activeIndex={active} paused={slot !== 'active'} dpr={1.5} onError={onFail} />
        )}
        {/* Scrim under the overlay text (contrast never depends on the poster). */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-bg via-bg/70 to-transparent" />
        {/* Click the centred card to open it; the visible link below is the accessible path. */}
        <TransitionLink
          href={`/projects/${project.slug}`}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute left-1/2 top-[41%] h-[50%] w-[min(54%,82vh)] -translate-x-1/2 -translate-y-1/2"
        />
      </div>

      <div
        role="group"
        aria-roledescription="carousel"
        aria-label="Projects"
        onKeyDown={onKeyDown}
        className="absolute inset-x-0 bottom-0"
      >
        <div className="container-x grid items-end gap-6 pb-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={project.slug}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${active + 1} of ${projects.length}`}
              >
                <div className="mb-3 flex items-center gap-3">
                  {project.category === 'earlier' && <EarlierLabel />}
                  <ul aria-label="Tech stack" className="flex flex-wrap gap-1.5">
                    {project.tech.slice(0, 4).map((t) => (
                      <li key={t} className="rounded-full bg-bg/60 px-2.5 py-0.5 font-mono text-[0.7rem] text-muted backdrop-blur">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
                <h3 className="font-display font-semibold uppercase text-[clamp(1.8rem,3.6vw,3.4rem)] leading-none">
                  <DecryptedText text={project.title} animateOn="view" speed={35} maxIterations={8} sequential />
                </h3>
                <p className="mt-3 max-w-xl text-lg text-fg/85">{project.oneLiner}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <TransitionLink
                    href={`/projects/${project.slug}`}
                    className="group inline-flex items-center gap-2 rounded-full bg-fg px-5 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-accent"
                  >
                    {project.category === 'featured' ? 'Read the case study' : 'View project'}
                    <span className="sr-only">: {project.title}</span>
                    <Arrow />
                  </TransitionLink>
                  <LinkButton href={project.links.live}>Live</LinkButton>
                  <LinkButton href={project.links.github}>GitHub</LinkButton>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-4 lg:col-span-4 lg:justify-end">
            <p className="font-mono text-sm tabular-nums text-muted" aria-hidden="true">
              <span className="text-fg">{String(active + 1).padStart(2, '0')}</span> / {String(projects.length).padStart(2, '0')}
            </p>
            <div className="flex gap-2">
              <NavButton label="Previous project" onClick={() => go(active - 1)} disabled={active === 0} dir={-1} />
              <NavButton label="Next project" onClick={() => go(active + 1)} disabled={active === LAST} dir={1} />
            </div>
          </div>
        </div>
        <div className="container-x pb-6">
          <div className="h-px w-full bg-line" aria-hidden="true">
            <div className="h-px bg-accent transition-transform duration-500" style={{ transform: `scaleX(${(active + 1) / projects.length})`, transformOrigin: 'left' }} />
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          Project {active + 1} of {projects.length}: {project.title}
        </p>
      </div>
    </div>
  );
}
