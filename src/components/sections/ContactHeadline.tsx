'use client';

/**
 * Contact headline, after alche.studio's mission/vision copy: each line sits on a
 * solid highlight bar. While scrolling, each bar wipes in from the left, then its
 * letters type in behind the wipe. Scrubbed, so it plays forward and back with the
 * scroll. Inverted for our dark page: off-white bars with dark text, the accent word
 * on a violet bar.
 *
 * - Server-rendered final state (bars full, letters visible): no-JS and reduced
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
          // Ends by the time the headline's top is just above mid-screen: Contact is the last
          // section, so the page can't scroll much further than that.
          scrollTrigger: { trigger: h, start: 'top 92%', end: 'top 50%', scrub: 0.6 },
        });
        h.querySelectorAll<HTMLElement>('[data-seg]').forEach((seg, i) => {
          const at = i * 0.32;
          tl.fromTo(seg.querySelector('[data-bar]'), { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: 'power2.inOut' }, at);
          tl.fromTo(
            seg.querySelectorAll('[data-char]'),
            { opacity: 0 },
            { opacity: 1, duration: 0.04, stagger: 0.035 },
            at + 0.15,
          );
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
      className="mt-6 flex flex-col items-start gap-[0.12em] font-display text-[clamp(1.9rem,6vw,5.5rem)] font-semibold uppercase leading-none"
    >
      {LINES.map((line, l) => (
        <span key={l} aria-hidden="true" className="flex gap-[0.12em] whitespace-nowrap">
          {line.map((seg) => (
            <span key={seg.text} data-seg="" className="relative inline-block px-[0.14em] py-[0.08em]">
              <span data-bar="" className={cn('absolute inset-0 origin-left', seg.accent ? 'bg-accent' : 'bg-fg')} />
              <span className="relative text-bg">
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
