'use client';

/**
 * Contact headline, animated after alche.studio's mission/vision copy but with no
 * background behind the text: per line, a violet bar wipes in from the left, the
 * letters type in behind it, then the bar retracts to the right, leaving plain
 * off-white text (the accent word in violet). Scrubbed, so it plays forward and back
 * with the scroll.
 *
 * - Server-rendered final state (bars retracted, letters visible): no-JS and reduced
 *   motion see the finished headline; GSAP only sets the from-state when motion is on.
 * - Accessible: the <h2> carries the full sentence in aria-label; bars and letter
 *   spans are aria-hidden.
 * - Transform/opacity only (bar scaleX, letter opacity).
 */
import { useRef } from 'react';
import { gsap, MEDIA, useGSAP } from '@/lib/gsap';
import { cn } from '@/lib/cn';

type Segment = { text: string; accent?: boolean };
const LINES: Segment[][] = [
  [{ text: 'Let’s build' }],
  [{ text: 'something' }],
  [{ text: 'people' }, { text: 'enjoy', accent: true }],
  [{ text: 'using.' }],
];
const LABEL = 'Let’s build something people enjoy using.';

export function ContactHeadline({ id }: { id: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const h = ref.current;
      if (!h) return;
      const mm = gsap.matchMedia();
      mm.add(MEDIA.motion, () => {
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          // Spread over most of the headline's travel up the screen (it can reach about the
          // top edge before the page ends, since Contact is the last section), with a
          // softer scrub so the wipe trails the scroll a little.
          scrollTrigger: { trigger: h, start: 'top 95%', end: 'top 18%', scrub: 1.2 },
        });
        h.querySelectorAll<HTMLElement>('[data-seg]').forEach((seg, i) => {
          const at = i * 0.45;
          const bar = seg.querySelector('[data-bar]');
          const chars = seg.querySelectorAll('[data-char]');
          tl.fromTo(bar, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.4, ease: 'power2.in' }, at);
          tl.fromTo(chars, { opacity: 0 }, { opacity: 1, duration: 0.05, stagger: 0.04 }, at + 0.3);
          tl.to(bar, { scaleX: 0, transformOrigin: '100% 50%', duration: 0.4, ease: 'power2.out' }, at + 0.42);
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <h2
      ref={ref}
      id={id}
      aria-label={LABEL}
      className="mt-6 flex flex-col items-start font-display text-[clamp(1.9rem,6vw,5.5rem)] font-semibold uppercase leading-[0.95]"
    >
      {LINES.map((line, l) => (
        <span key={l} aria-hidden="true" className="flex gap-[0.28em] whitespace-nowrap">
          {line.map((seg) => (
            <span key={seg.text} data-seg="" className="relative inline-block">
              <span data-bar="" className="absolute -inset-x-[0.08em] inset-y-[0.04em] bg-accent" style={{ transform: 'scaleX(0)' }} />
              <span className={cn('relative', seg.accent ? 'text-accent' : 'text-fg')}>
                {[...seg.text].map((ch, c) => (
                  <span key={c} data-char="" className="inline-block whitespace-pre">
                    {ch}
                  </span>
                ))}
              </span>
            </span>
          ))}
        </span>
      ))}
    </h2>
  );
}
