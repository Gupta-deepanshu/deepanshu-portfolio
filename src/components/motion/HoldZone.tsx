'use client';

/**
 * A "hold" between two sections, after alche.studio's intro/outro containers: an empty
 * stretch of scroll where no content moves, only the fixed background stage and the D
 * (which time their hand-offs to it). It makes the page breathe between sections.
 *
 * Snapping (desktop, fine pointer, motion allowed): if you stop inside the hold, the
 * page eases (~1s) to the nearest clean state: progress 0 = the previous section's end
 * resting at the bottom of the screen, 1 = the next section's top at the top of the
 * screen. Never halfway through a hand-off. No snapping inside reading sections.
 *
 * Height comes from CSS (`.hold-*` in globals.css): shorter on phones, 0 with reduced
 * motion (and then no snapping either).
 */
import { useRef } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';

interface Props {
  /** Identifies the hold for the scenes that time themselves to it. */
  id: 'hero' | 'about-out';
  className: string;
}

export function HoldZone({ id, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference) and (pointer: fine) and (min-width: 768px)', () => {
      // Only snap when stopped in the middle of the hold (screen mostly empty), and finish
      // the transition in the direction you were scrolling. Near either end you are still
      // looking at real content, so the page stays where you left it.
      let st: ScrollTrigger | null = null;
      st = ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        snap: {
          snapTo: (v: number) => (v < 0.2 || v > 0.8 ? v : (st?.direction ?? 1) > 0 ? 1 : 0),
          duration: { min: 0.6, max: 1 },
          delay: 0.12,
          ease: 'power2.inOut',
        },
      });
      return () => st?.kill();
    });
    return () => mm.revert();
  });

  return <div ref={ref} data-hold={id} aria-hidden="true" className={className} />;
}
