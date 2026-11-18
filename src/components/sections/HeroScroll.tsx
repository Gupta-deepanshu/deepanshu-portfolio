'use client';

/** Hero scroll-out: the content block drifts up and fades as the hero leaves. */
import { useRef, type ReactNode } from 'react';
import { gsap, MEDIA, useGSAP } from '@/lib/gsap';

export function HeroScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MEDIA.motion, () => {
        gsap.to(ref.current, {
          yPercent: -18,
          opacity: 0.15,
          ease: 'none',
          scrollTrigger: { trigger: ref.current?.parentElement, start: 'top top', end: 'bottom top', scrub: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className="relative">
      {children}
    </div>
  );
}
