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
 * Motion model: one continuous deck position (`shown`, in cards) eases toward the scroll
 * every frame (gsap.ticker, critically damped), and each card's pose is computed from
 * its fractional slot s = i − shown: x = s·DX, y = −s·DY, z = −s·DZ, skewY, fading past
 * VISIBLE slots; s < 0 means dealt (drops away and fades, never returns, so each group
 * is seen once). Smooth through wheel ticks and snaps; transform/opacity only.
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

        // One continuous deck position instead of per-step tweens: `target` follows the
        // scroll (in deals, after the dwell), `shown` eases toward it every frame (critically
        // damped, like the projects reel), and every card's pose is computed from `shown`.
        // Motion flows through wheel ticks and snaps instead of lurching between eases.
        let target = 0;
        let shown = 0;
        let intro = 0; // 0 → 1 as the section scrolls in (Card Swap-style entrance)
        let introShown = 0;
        const smooth = (t: number) => t * t * (3 - 2 * t);
        const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
        const vh = () => window.innerHeight;

        const render = () => {
          cards.forEach((c, i) => {
            const s = i - shown; // fractional slot; < 0 = being dealt / gone
            let x = s * DX;
            let y = -s * DY;
            let z = -s * DZ;
            let rot = 0;
            let op = clamp01(VISIBLE - s); // fades in as it reaches the last visible slot
            if (s < 0) {
              // Dealt: drop away below the deck and fade, then stay gone.
              const d = smooth(clamp01(-s));
              x = 0;
              y = d * DROP;
              z = 0;
              rot = -5 * d;
              op = 1 - smooth(clamp01((-s - 0.3) / 0.6));
            }
            // Entrance: back of the deck first, each card flies up from below.
            const order = N - 1 - i;
            const e = smooth(clamp01(introShown * 1.6 - order * 0.15));
            y += (1 - e) * vh() * 0.7;
            rot += (1 - e) * (6 - order);
            op *= e;
            c.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotate(${rot}deg) skewY(${SKEW}deg)`;
            // Opacity only, never visibility/display: faded cards must stay in the
            // accessibility tree so every group is readable regardless of deck position.
            c.style.opacity = String(op);
            c.style.zIndex = String(100 - Math.round(s * 10));
          });
        };

        const tick = (_t: number, deltaMs: number) => {
          const k = 1 - Math.exp(-Math.min(deltaMs, 50) / 1000 * 9);
          if (Math.abs(target - shown) < 0.0005 && Math.abs(intro - introShown) < 0.0005) {
            if (shown !== target || introShown !== intro) {
              shown = target;
              introShown = intro;
              render();
            }
            return;
          }
          shown += (target - shown) * k;
          introShown += (intro - introShown) * k;
          render();
        };
        gsap.ticker.add(tick);
        render();

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
          // Snap points: every card settled at the front, plus the end of the dwell, so the
          // first scroll lands with the first card still in front (snapping is directional,
          // so without this stop it would skip straight to the second card).
          snap: {
            snapTo: [0, DWELL, ...skills.slice(1).map((_, i) => frontAt(i + 1))].map((t) => t / SPAN),
            duration: { min: 0.4, max: 0.9 },
            delay: 0.08,
            ease: 'sine.inOut',
          },
          onUpdate: (self) => {
            target = Math.min(LAST, Math.max(0, self.progress * SPAN - DWELL));
            const next = Math.min(LAST, Math.max(0, Math.round(target)));
            setActive((prev) => (prev === next ? prev : next));
          },
        });
        ScrollTrigger.sort();
        ScrollTrigger.refresh();

        return () => {
          gsap.ticker.remove(tick);
          introTrigger.kill();
          triggerRef.current?.kill();
          triggerRef.current = null;
          cards.forEach((c) => c.removeAttribute('style'));
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
      {/* DOM order: heading, deck, education (mobile reads them in that order). On desktop
          the deck spans both rows on the right; heading and education meet at its middle. */}
      <div className="container-x grid w-full gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4 lg:row-start-1 lg:self-end">
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
        </div>

        <div className="lg:col-span-8 lg:col-start-5 lg:row-span-2 lg:row-start-1 lg:self-center">
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
                  'overflow-hidden rounded-2xl border border-line bg-[radial-gradient(circle_at_100%_0%,rgb(165_148_255/0.16),transparent_45%),linear-gradient(160deg,#1a1726_0%,#110f18_60%,#0d0c12_100%)] p-6 shadow-[0_30px_60px_-24px_rgb(0_0_0/0.8)]',
                  deck && 'absolute bottom-[6%] left-[4%] w-[min(34rem,60%)] p-9 will-change-transform [backface-visibility:hidden]',
                )}
              >
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
