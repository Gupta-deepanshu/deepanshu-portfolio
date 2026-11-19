'use client';

/**
 * Shared stage for Hero + About: one background that STAYS while both sections
 * scroll over it (sticky, viewport-sized), the way alche.studio's room stays put
 * while content moves in front.
 *
 * The WebGL scene (GlassD) reads the scroll position itself: as the hero leaves,
 * the D shrinks into About's empty left column, the camera turns along the wall
 * and the glow cools. This wrapper only handles the hand-off: the whole stage
 * fades out as About ends, so Experience can bring its own background.
 *
 * Phones / no WebGL: the same sticky layer shows the static gradient; the static D
 * fades back as the hero leaves so it never sits behind About's text.
 */
import { useRef, type ReactNode } from 'react';
import { WebGLBackground } from '@/components/backgrounds/WebGLBackground';
import { gsap, MEDIA, useGSAP } from '@/lib/gsap';
import { StaticD } from './StaticD';

export function HeroStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add(MEDIA.motion, () => {
        gsap.fromTo(
          root.querySelector('[data-stage-bg]'),
          { opacity: 1 },
          { opacity: 0, ease: 'none', scrollTrigger: { trigger: root.querySelector('#about'), start: 'bottom 85%', end: 'bottom 20%', scrub: true } },
        );
        gsap.to(root.querySelectorAll('.static-d svg'), {
          opacity: 0.1,
          ease: 'none',
          scrollTrigger: { trigger: root.querySelector('#top'), start: 'top top', end: 'bottom top', scrub: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className="relative isolate">
      {/* Mask: the last 45vh of the stage fade to transparent, so the fixed layer never
          shows a hard bottom edge as it hands over to Experience. */}
      <div
        data-stage-bg=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,#000_calc(100%-45vh),transparent)]"
      >
        <div data-stage-sticky="" className="sticky top-0 h-svh">
          <WebGLBackground
            kind="glass"
            staticClassName="bg-hero-static"
            staticContent={<StaticD />}
            desktopOnly
            slotId="hero"
            className="absolute inset-0"
          />
        </div>
      </div>
      {children}
    </div>
  );
}
