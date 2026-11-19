'use client';

/**
 * Hero scroll-out: the content block drifts up and fades as the hero leaves.
 * `data-hero-content` lets the WebGL scene read the same opacity for its copy of
 * the name.
 */
import { useRef, type ReactNode } from 'react';
import { gsap, MEDIA, useGSAP } from '@/lib/gsap';
import { cn } from '@/lib/cn';

export function HeroScroll({ children, className }: { children: ReactNode; className?: string }) {
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
    <div ref={ref} data-hero-content="" className={cn('relative', className)}>
      {children}
    </div>
  );
}
