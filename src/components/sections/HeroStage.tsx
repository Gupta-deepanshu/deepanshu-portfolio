'use client';

/**
 * Shared stage for Hero + About: one background that STAYS while both sections
 * scroll over it (sticky, viewport-sized), the way alche.studio's room stays put
 * while content moves in front.
 *
 * The WebGL scene (GlassD) reads the scroll position itself: as the hero leaves,
 * the D shrinks into About's empty left column, the camera turns along the wall
 * and the glow cools. The layer stays fixed one viewport past About and dissolves
 * over that stretch into the ambient page background (AmbientBackground), while the
 * outline D (OutlineStage) draws itself in the glass D's place.
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
        // Hand-off: the room dissolves over the end of About into the ambient page
        // background (same violet glow + grid). It is fully gone just before the outline
        // D starts tracing itself in the glass D's exact spot (OutlineStage: 'top 63%'),
        // all inside the empty hold before Experience (HoldZone "about-out"):
        // strictly one after the other, never two Ds at once.
        gsap.fromTo(
          root.querySelector('[data-stage-bg]'),
          { opacity: 1 },
          { opacity: 0, ease: 'none', scrollTrigger: { trigger: root.querySelector('#about'), start: 'bottom bottom', end: 'bottom 65%', scrub: true } },
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
      {/* Runs one viewport past About, so the room is still fixed while it dissolves. */}
      <div data-stage-bg="" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -bottom-[100svh] -z-10">
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
