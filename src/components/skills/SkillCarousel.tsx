'use client';

/**
 * Skills carousel: the skill groups (src/content/skills.ts) on a React Bits Depth Carousel rail (cards recede
 * into depth, tilted, darker further back; see reactbits/depthPose). The cards are real
 * HTML (group heading + list), always in the DOM in reading order, never aria-hidden, so
 * nothing depends on the animation.
 *
 * Modes (gsap.matchMedia, so a resize or a motion-preference change swaps cleanly):
 * - Desktop with motion: the section pins and scroll turns the carousel one group at a
 *   time (snapping), then the page moves on. Index, arrow buttons, arrow keys and clicking
 *   a card all scroll to that group's position, so scroll stays the single source of truth.
 * - Phones / reduced motion: no pin. Swipe, arrow buttons, arrow keys or tap a card.
 *   Reduced motion jumps straight to the new pose (no easing).
 * - Server render / before hydration: a plain grid, so every group is readable at once.
 *
 * Motion model: one continuous carousel position (`shown`, in cards) eases toward `target`
 * every frame (gsap.ticker, critically damped, like the projects reel), and each card's
 * pose is computed from its fractional slot d = i − shown. Transform/opacity only.
 */
import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { education, skills } from '@/content/skills';
import { depthPose, type DepthConfig } from '@/components/reactbits/depthPose';
import { NavButton } from '@/components/ui/NavButton';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { scrollToY } from '@/lib/scroll';
import { cn } from '@/lib/cn';

const N = skills.length;
const LAST = N - 1;
/** Scroll per group, in viewport heights. */
const PER_STEP = 0.6;
/** Extra scroll (in steps) the first group stays at the front before the first turn. */
const DWELL = 1;
/** Timeline length: the dwell, then one unit per turn. */
const SPAN = DWELL + LAST;
/** Timeline time at which group i is settled at the front. */
const frontAt = (i: number) => (i === 0 ? 0 : DWELL + i);

const DESKTOP: DepthConfig = { depth: 220, spread: 90, tilt: 22, visible: 4, falloff: 0.2 };
const PHONE: DepthConfig = { depth: 150, spread: 40, tilt: 12, visible: 3, falloff: 0.22 };
/** Entrance stagger between cards, as a fraction of the entrance. */
const STAGGER = 0.15;
/** Swipe distance (px) that moves one group. */
const SWIPE_STEP = 140;

type Mode = 'grid' | 'free' | 'pinned';

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const pad = (n: number) => String(n).padStart(2, '0');

export function SkillCarousel() {
  const stageRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  /** Moves the carousel to group i; set by the active mode. */
  const goRef = useRef<(i: number) => void>(() => {});
  const activeRef = useRef(0);
  const dragRef = useRef<{ x: number; start: number; moved: boolean; id: number } | null>(null);
  /** True for the click that ends a swipe (click fires after pointerup). */
  const swipedRef = useRef(false);
  /** Free mode: live carousel target, written by swipes. */
  const targetRef = useRef<{ get: () => number; set: (t: number) => void } | null>(null);
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<Mode>('grid');

  const show = useCallback((i: number) => {
    activeRef.current = i;
    setActive((prev) => (prev === i ? prev : i));
  }, []);

  useGSAP(
    () => {
      const stage = stageRef.current;
      if (!stage) return;
      const mm = gsap.matchMedia();
      mm.add(
        // `all` always matches: with a conditions object the callback only runs when at least
        // one condition matches, and phones with motion on match neither of the others.
        { all: 'all', desktop: '(min-width: 1024px)', reduce: '(prefers-reduced-motion: reduce)' },
        (ctx) => {
          const { desktop, reduce } = ctx.conditions as { desktop: boolean; reduce: boolean };
          const pinned = desktop && !reduce;
          const cfg = desktop ? DESKTOP : PHONE;
          const cards = gsap.utils.toArray<HTMLElement>('[data-skill-card]', stage);
          const shades = cards.map((c) => c.querySelector<HTMLElement>('[data-shade]'));
          setMode(pinned ? 'pinned' : 'free');

          let target = activeRef.current;
          let shown = target;
          let intro = pinned ? 0 : 1; // 0 → 1 as the section scrolls in (pinned only)
          let introShown = intro;
          const smooth = (t: number) => t * t * (3 - 2 * t);
          const vh = () => window.innerHeight;

          const render = () => {
            cards.forEach((c, i) => {
              const pose = depthPose(i - shown, cfg);
              // Entrance: the back of the rail first, each card rises from below. Scaled so
              // that at intro = 1 every card, the front one included, is fully in (e = 1).
              const e = smooth(clamp(introShown * (1 + STAGGER * (N - 1)) - (N - 1 - i) * STAGGER, 0, 1));
              const rise = (1 - e) * vh() * 0.6;
              c.style.transform = rise ? `translateY(${rise.toFixed(1)}px) ${pose.transform}` : pose.transform;
              // Opacity only, never visibility/display: faded cards must stay in the
              // accessibility tree so every group is readable wherever the carousel is.
              c.style.opacity = String(pose.opacity * e);
              c.style.zIndex = String(pose.zIndex);
              const shade = shades[i];
              if (shade) shade.style.opacity = pose.shade.toFixed(3);
            });
          };

          const tick = (_t: number, deltaMs: number) => {
            if (Math.abs(target - shown) < 0.0005 && Math.abs(intro - introShown) < 0.0005) {
              if (shown !== target || introShown !== intro) {
                shown = target;
                introShown = intro;
                render();
              }
              return;
            }
            const k = reduce ? 1 : 1 - Math.exp((-Math.min(deltaMs, 50) / 1000) * 9);
            shown += (target - shown) * k;
            introShown += (intro - introShown) * k;
            render();
          };
          gsap.ticker.add(tick);
          render();

          const cleanups: (() => void)[] = [];

          if (pinned) {
            const introTrigger = ScrollTrigger.create({
              trigger: stage,
              start: 'top 90%',
              end: 'top top',
              onUpdate: (self) => (intro = self.progress),
              onRefresh: (self) => (intro = introShown = self.progress),
            });
            triggerRef.current = ScrollTrigger.create({
              trigger: stage,
              pin: true,
              start: 'top top',
              end: () => `+=${vh() * PER_STEP * SPAN}`,
              invalidateOnRefresh: true,
              // Snap points: every group settled at the front, plus the end of the dwell, so
              // the first scroll lands with the first group still in front (snapping is
              // directional, so without this stop it would skip straight to the second).
              snap: {
                snapTo: [0, DWELL, ...skills.slice(1).map((_, i) => frontAt(i + 1))].map((t) => t / SPAN),
                duration: { min: 0.4, max: 0.9 },
                delay: 0.08,
                ease: 'sine.inOut',
              },
              onUpdate: (self) => {
                target = clamp(self.progress * SPAN - DWELL, 0, LAST);
                show(clamp(Math.round(target), 0, LAST));
              },
            });
            goRef.current = (i) => {
              const st = triggerRef.current;
              if (st) scrollToY(st.start + ((st.end - st.start) * frontAt(i)) / SPAN);
            };
            ScrollTrigger.sort();
            ScrollTrigger.refresh();
            cleanups.push(() => {
              introTrigger.kill();
              triggerRef.current?.kill();
              triggerRef.current = null;
            });
          } else {
            goRef.current = (i) => {
              target = clamp(i, 0, LAST);
              show(target);
            };
            targetRef.current = { get: () => target, set: (t) => (target = clamp(t, -0.4, LAST + 0.4)) };
            cleanups.push(() => (targetRef.current = null));
          }

          return () => {
            gsap.ticker.remove(tick);
            cleanups.forEach((fn) => fn());
            goRef.current = () => {};
            cards.forEach((c) => c.removeAttribute('style'));
            shades.forEach((s) => s?.removeAttribute('style'));
            setMode('grid');
            if (pinned) requestAnimationFrame(() => ScrollTrigger.refresh());
          };
        },
      );
      return () => mm.revert();
    },
    { scope: stageRef },
  );

  const go = useCallback((i: number) => goRef.current(clamp(i, 0, LAST)), []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    go(activeRef.current + (e.key === 'ArrowRight' ? 1 : -1));
  };

  // Swipe (free mode only). touch-action: pan-y keeps vertical page scrolling native.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const t = targetRef.current;
    if (!t) return;
    dragRef.current = { x: e.clientX, start: t.get(), moved: false, id: e.pointerId };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const t = targetRef.current;
    if (!drag || !t) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) {
      drag.moved = true;
      e.currentTarget.setPointerCapture(drag.id);
    }
    if (drag.moved) t.set(drag.start - dx / SWIPE_STEP);
  };
  const onPointerEnd = () => {
    const drag = dragRef.current;
    const t = targetRef.current;
    dragRef.current = null;
    if (drag?.moved && t) {
      swipedRef.current = true;
      setTimeout(() => (swipedRef.current = false), 0);
      go(Math.round(t.get()));
    }
  };
  // A click that ends a swipe must not also jump to the card under the pointer.
  const onCardClick = (i: number) => {
    if (swipedRef.current) return;
    go(i);
  };

  const carousel = mode !== 'grid';

  return (
    <div ref={stageRef} className={cn('relative', mode === 'pinned' ? 'flex h-svh items-center' : 'py-24 lg:py-32')}>
      {/* DOM order: heading, carousel, education (mobile reads them in that order). On desktop
          the carousel spans both rows on the right; heading and education meet at its middle. */}
      <div className="container-x grid w-full gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4 lg:row-start-1 lg:self-end">
          <p className="eyebrow">04 / Skills</p>
          <h2 id="skills-title" className="mt-4 font-display text-3xl font-semibold uppercase">
            Toolkit
          </h2>
          {/* Group index: shows where you are; jumps there (desktop carousel only). */}
          <ol className={cn('mt-8 space-y-2', !carousel && 'hidden', 'max-lg:hidden')} aria-label="Skill groups">
            {skills.map((g, i) => (
              <li key={g.label}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  disabled={!carousel}
                  aria-current={carousel && i === active ? 'step' : undefined}
                  className={cn(
                    'flex items-baseline gap-3 font-mono text-sm uppercase tracking-[0.12em] transition-colors disabled:cursor-default',
                    carousel && i === active ? 'text-fg' : 'text-muted hover:text-fg',
                  )}
                >
                  <span className={cn('tabular-nums', carousel && i === active ? 'text-accent' : '')}>{pad(i + 1)}</span>
                  {g.label}
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:col-span-8 lg:col-start-5 lg:row-span-2 lg:row-start-1 lg:self-center">
          <div
            role={carousel ? 'group' : undefined}
            aria-roledescription={carousel ? 'carousel' : undefined}
            aria-label={carousel ? 'Skill groups carousel. Use the left and right arrow keys to move.' : undefined}
            tabIndex={carousel ? 0 : undefined}
            onKeyDown={carousel ? onKeyDown : undefined}
            onPointerDown={mode === 'free' ? onPointerDown : undefined}
            onPointerMove={mode === 'free' ? onPointerMove : undefined}
            onPointerUp={mode === 'free' ? onPointerEnd : undefined}
            onPointerCancel={mode === 'free' ? onPointerEnd : undefined}
            className={cn(
              carousel
                ? 'relative h-[29rem] w-full touch-pan-y max-lg:overflow-x-clip select-none rounded-3xl [perspective:1000px] lg:h-[min(36rem,72vh)] lg:[perspective:1400px]'
                : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
            )}
          >
            <div className={cn(carousel && 'absolute inset-0 [transform-style:preserve-3d]', !carousel && 'contents')}>
              {skills.map((g, i) => (
                <article
                  key={g.label}
                  data-skill-card=""
                  aria-labelledby={`skill-group-${i}`}
                  onClick={carousel ? () => onCardClick(i) : undefined}
                  className={cn(
                    'overflow-hidden rounded-2xl border border-line bg-[radial-gradient(circle_at_100%_0%,rgb(165_148_255/0.16),transparent_45%),linear-gradient(160deg,#1a1726_0%,#110f18_60%,#0d0c12_100%)] p-6 shadow-[0_30px_60px_-24px_rgb(0_0_0/0.8)]',
                    carousel &&
                      'absolute left-[calc(50%-1.5rem)] top-1/2 h-[25rem] w-[min(18rem,calc(100%-5rem))] cursor-pointer will-change-transform [backface-visibility:hidden] lg:left-[38%] lg:h-[27.5rem] lg:w-[25rem] lg:p-9',
                  )}
                >
                  <p className="relative flex justify-between font-mono text-xs uppercase tracking-[0.14em] text-muted">
                    <span>
                      {pad(i + 1)} / {pad(N)}
                    </span>
                    <span>{g.items.length} skills</span>
                  </p>
                  <h3 id={`skill-group-${i}`} className={cn('relative mt-6 font-display text-2xl font-semibold uppercase', carousel && 'lg:text-3xl')}>
                    {g.label}
                  </h3>
                  <ul className="relative mt-6 space-y-1.5 lg:space-y-2">
                    {g.items.map((s) => (
                      <li key={s} className="flex items-start gap-3 font-display text-base text-fg/90 lg:text-xl">
                        {/* shrink-0 + top offset: long items wrap, and the dot stays a dot on the first line */}
                        <span aria-hidden="true" className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-accent" />
                        {s}
                      </li>
                    ))}
                  </ul>
                  {/* Depth shade: darkens cards further back (opacity only). */}
                  <span data-shade="" aria-hidden="true" className={cn('pointer-events-none absolute inset-0 bg-black opacity-0', !carousel && 'hidden')} />
                </article>
              ))}
            </div>
          </div>

          {/* Controls: prev / next and a counter (every carousel mode). */}
          {carousel && (
            <div className="mt-6 flex items-center justify-center gap-4 lg:justify-start lg:pl-[calc(38%-12.5rem)]">
              <NavButton label="Previous skill group" dir={-1} onClick={() => go(active - 1)} disabled={active === 0} />
              <p className="min-w-[5.5rem] text-center font-mono text-sm tabular-nums text-muted" aria-live="polite">
                <span className="text-fg">{pad(active + 1)}</span> / {pad(N)}
                <span className="sr-only">: {skills[active].label}</span>
              </p>
              <NavButton label="Next skill group" dir={1} onClick={() => go(active + 1)} disabled={active === LAST} />
            </div>
          )}
        </div>

        <EducationLine />
      </div>
    </div>
  );
}

/** A quiet credential line under the toolkit (a footnote, not another card). */
function EducationLine() {
  return (
    <aside aria-labelledby="edu-title" className="max-w-sm border-t border-line pt-6 lg:col-span-4 lg:row-start-2 lg:self-start">
      <h3 id="edu-title" className="eyebrow">
        Education
      </h3>
      <p className="mt-3 text-lg leading-snug">{education.degree}</p>
      <p className="mt-2 font-mono text-sm text-muted">
        {education.school}, {education.location}
        <br />
        {education.start}–{education.end} · <span className="text-accent">{education.grade}</span>
      </p>
    </aside>
  );
}
