'use client';

/**
 * Skills deck, after React Bits' Card Swap (the look: a diagonal, skewed 3D stack;
 * the front card drops away and the rest step forward). Rebuilt on GSAP instead of
 * vendoring Card Swap: that component runs its own physics/autoplay/drag engine (and
 * pulls in an icon package), which a scroll-scrubbed timeline would have to fight.
 *
 * Desktop with motion: the section pins and scroll deals through the six skill groups
 * once (snapping per card), then the page moves on. The cards are real HTML (group
 * heading + list), always in the DOM in reading order, so nothing depends on the
 * animation. Phones / reduced motion: the same cards as a plain grid (no pin).
 *
 * Slot maths (slot 0 = front): x = s·DX, y = −s·DY, z = −s·DZ, skewY, fading out
 * past VISIBLE slots. Step k moves card i from slot i−k to i−k−1: the front card drops
 * away and fades (dealt; it does not come back, so each group is seen once), the
 * rest step forward. After the last deal only the final group remains.
 */
import { useCallback, useRef, useState } from 'react';
import { education, skills } from '@/content/skills';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { scrollToY } from '@/lib/scroll';
import { cn } from '@/lib/cn';

const N = skills.length;
const LAST = N - 1;
const DX = 58;
const DY = 64;
const DZ = 90;
const SKEW = 6;
const VISIBLE = 4;
const DROP = 520;
/** Scroll per swap, in viewport heights. */
const PER_STEP = 0.6;
/** Extra scroll (in steps) the first card stays at the front before the first deal. */
const DWELL = 1;
/** Timeline length: the dwell, then one unit per deal. */
const SPAN = DWELL + LAST;
/** Timeline time at which card i is settled at the front. */
const frontAt = (i: number) => (i === 0 ? 0 : DWELL + i);

const slotPose = (s: number) => ({
  x: s * DX,
  y: -s * DY,
  z: -s * DZ,
  skewY: SKEW,
  opacity: s < VISIBLE ? 1 : 0,
  zIndex: N - s,
});
/** Slot of a card after `step` deals; negative = already dealt (gone). */
const slotOf = (card: number, step: number) => card - step;

export function SkillDeck() {
  const stageRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const [active, setActive] = useState(0);
  const [deck, setDeck] = useState(false);

  useGSAP(
    () => {
      const stage = stageRef.current;
      if (!stage) return;
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const cards = gsap.utils.toArray<HTMLElement>('[data-skill-card]', stage);
        setDeck(true);
        cards.forEach((c, i) => gsap.set(c, slotPose(slotOf(i, 0))));

        // Entrance (Card Swap's intro): as the section scrolls into view, the cards fly up
        // from below one after another, back of the deck first, and settle into the stack,
        // so the deck is built by the time the section pins. Scrubbed with scroll.
        const intro = gsap.timeline({
          scrollTrigger: { trigger: stage, start: 'top 90%', end: 'top top', scrub: 0.6 },
        });
        [...cards].reverse().forEach((c, j) => {
          const s = slotOf(cards.indexOf(c), 0);
          if (s >= VISIBLE) return;
          intro.from(c, { y: '+=' + window.innerHeight * 0.7, rotate: 6 - j * 2, opacity: 0, duration: 0.6, ease: 'power3.out', immediateRender: true }, j * 0.25);
        });

        const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
        for (let k = 0; k < LAST; k++) {
          const t = DWELL + k; // deal k starts after the dwell
          cards.forEach((c, i) => {
            const from = slotOf(i, k);
            const to = from - 1;
            if (from < 0) return;
            if (from === 0) {
              // Dealt: the front card drops away below the deck and fades out.
              tl.to(c, { y: DROP, rotate: -5, duration: 0.7, ease: 'power2.in' }, t);
              tl.to(c, { opacity: 0, duration: 0.35, ease: 'none' }, t + 0.35);
            } else {
              tl.set(c, { zIndex: N - to }, t + 0.2);
              tl.to(c, { ...slotPose(to), zIndex: N - to, duration: 0.6 }, t + 0.2);
            }
          });
        }
        // Pin the timeline length to SPAN so scroll maps evenly (last tweens end early).
        tl.set({}, {}, SPAN);

        triggerRef.current = ScrollTrigger.create({
          trigger: stage,
          pin: true,
          start: 'top top',
          end: () => `+=${window.innerHeight * PER_STEP * SPAN}`,
          scrub: 0.6,
          animation: tl,
          invalidateOnRefresh: true,
          // Snap points: every card settled at the front, plus the end of the dwell, so the
          // first scroll lands with the first card still in front (snapping is directional,
          // so without this stop it would skip straight to the second card).
          snap: { snapTo: [0, DWELL, ...skills.slice(1).map((_, i) => frontAt(i + 1))].map((t) => t / SPAN), duration: { min: 0.3, max: 0.7 }, delay: 0.1, ease: 'power2.inOut' },
          onUpdate: (self) => {
            const next = Math.min(LAST, Math.max(0, Math.round(self.progress * SPAN - DWELL)));
            setActive((prev) => (prev === next ? prev : next));
          },
        });
        ScrollTrigger.sort();
        ScrollTrigger.refresh();

        return () => {
          triggerRef.current?.kill();
          triggerRef.current = null;
          intro.scrollTrigger?.kill();
          intro.kill();
          tl.kill();
          gsap.set(cards, { clearProps: 'all' });
          setDeck(false);
          setActive(0);
          requestAnimationFrame(() => ScrollTrigger.refresh());
        };
      });
      return () => mm.revert();
    },
    { scope: stageRef },
  );

  const go = useCallback((i: number) => {
    const st = triggerRef.current;
    if (!st) return;
    scrollToY(st.start + ((st.end - st.start) * frontAt(i)) / SPAN);
  }, []);

  return (
    <div ref={stageRef} className={cn('relative', deck ? 'flex h-svh items-center' : 'py-24 lg:py-32')}>
      <div className="container-x grid w-full gap-12 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-4">
          <p className="eyebrow">04 / Skills</p>
          <h2 id="skills-title" className="mt-4 font-display text-3xl font-semibold uppercase">
            Toolkit
          </h2>
          {/* Group index: shows where you are in the deck; jumps there (desktop deck only). */}
          <ol className={cn('mt-8 space-y-2', !deck && 'hidden')} aria-label="Skill groups">
            {skills.map((g, i) => (
              <li key={g.label}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  disabled={!deck}
                  aria-current={deck && i === active ? 'step' : undefined}
                  className={cn(
                    'flex items-baseline gap-3 font-mono text-sm uppercase tracking-[0.12em] transition-colors disabled:cursor-default',
                    deck && i === active ? 'text-fg' : 'text-muted hover:text-fg',
                  )}
                >
                  <span className={cn('tabular-nums', deck && i === active ? 'text-accent' : '')}>{String(i + 1).padStart(2, '0')}</span>
                  {g.label}
                </button>
              </li>
            ))}
          </ol>
          <EducationCard />
        </div>

        <div className="lg:col-span-8">
          <div
            className={cn(
              deck ? 'relative mx-auto h-[min(40rem,76vh)] w-full [perspective:900px]' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
            )}
          >
            {skills.map((g, i) => (
              <article
                key={g.label}
                data-skill-card=""
                aria-labelledby={`skill-group-${i}`}
                className={cn(
                  'overflow-hidden rounded-2xl border border-line bg-[linear-gradient(160deg,#1a1726_0%,#110f18_60%,#0d0c12_100%)] p-6 shadow-[0_30px_60px_-24px_rgb(0_0_0/0.8)]',
                  deck && 'absolute bottom-[6%] left-[4%] w-[min(34rem,60%)] p-9 [backface-visibility:hidden]',
                )}
              >
                <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-accent/15 blur-3xl" />
                <p className="relative flex justify-between font-mono text-xs uppercase tracking-[0.14em] text-muted">
                  <span>
                    {String(i + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
                  </span>
                  <span>{g.items.length} skills</span>
                </p>
                <h3 id={`skill-group-${i}`} className={cn('relative mt-6 font-display text-2xl font-semibold uppercase', deck && 'lg:text-3xl')}>
                  {g.label}
                </h3>
                <ul className="relative mt-6 space-y-2">
                  {g.items.map((s) => (
                    <li key={s} className="flex items-center gap-3 font-display text-lg text-fg/90 lg:text-xl">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
                      {s}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EducationCard() {
  return (
    <aside aria-labelledby="edu-title" className="mt-10 max-w-sm rounded-2xl border border-line bg-bg/50 p-6 backdrop-blur-sm">
      <h3 id="edu-title" className="eyebrow">
        Education
      </h3>
      <p className="mt-4 text-lg">{education.degree}</p>
      <p className="mt-1 text-muted">
        {education.school}, {education.location}
      </p>
      <p className="mt-4 flex justify-between font-mono text-sm text-muted">
        <span>
          {education.start}–{education.end}
        </span>
        <span className="text-accent">{education.grade}</span>
      </p>
    </aside>
  );
}
