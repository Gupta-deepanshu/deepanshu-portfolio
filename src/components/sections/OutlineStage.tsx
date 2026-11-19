'use client';

/**
 * Experience + Projects stage: the outline D that carries the logo between the hero's
 * glass D and the projects reel's glass D. Rule: only ONE D is ever visible, and every
 * hand-off happens in place (same screen position, same size), so it reads as one
 * object changing material rather than two objects passing.
 *
 * The outline lives in a FIXED layer (not sticky), so it never rides in with the
 * content. Timeline (scrubbed):
 *
 *   1. About ends → the hero room (with the glass D, resting in About's left column)
 *      dissolves first (HeroStage). Then the outline traces itself at that exact spot
 *      and size, and glides to a large centred outline behind Experience.
 *   2. Projects arrives → the outline moves to exactly where the reel's glass D sits
 *      (≈9% above centre, same height), then rides up with the reel stage over its last
 *      25vh before the pin, cross-fading into the glass D (PinnedGallery drives the
 *      reel's glass alpha over the same range).
 *
 * Reduced motion: no scroll animation; the outline is a static, large, centred drawing
 * at the top of Experience (see globals.css).
 */
import { useRef, type ReactNode } from 'react';
import { gsap, MEDIA, useGSAP } from '@/lib/gsap';
import { reelGlassFrame } from '@/components/three/reel-layout';

// Same outline as the 3D geometry (GlassD) and the static SVG D.
const D_PATH = 'M-0.75 -1 L0 -1 A1 1 0 0 1 0 1 L-0.75 1 Z M-0.32 -0.56 L0 -0.56 A0.56 0.56 0 0 1 0 0.56 L-0.32 0.56 Z';
// Back face offset (gives the drawing its thickness) and the edges joining the faces.
const DEPTH = { x: 0.09, y: -0.07 };
const CORNERS: [number, number][] = [
  [-0.75, -1],
  [-0.75, 1],
  [0, 1],
  [0, -1],
  [1, 0],
  [-0.32, -0.56],
  [-0.32, 0.56],
  [0.56, 0],
];
/** The SVG is 72vh tall and the D path spans 2 of its 2.5 viewBox units. */
const D_HEIGHT_VH = 0.72 * (2 / 2.5);

export function OutlineStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      const d = root?.querySelector<SVGSVGElement>('[data-outline-d]');
      const stage = root?.querySelector<HTMLElement>('[data-gl-slot="projects"]') ?? null;
      if (!root || !d) return;
      const mm = gsap.matchMedia();
      mm.add(MEDIA.motion, () => {
        const vw = () => window.innerWidth;
        const vh = () => window.innerHeight;
        const wide = () => vw() / vh() >= 1.15;
        // Where the glass D rests in About (GlassD: x = -0.7 / +0.58 of half-width,
        // body ≈ 31% / 21% of the viewport height).
        const aboutX = () => (wide() ? -0.35 : 0.29) * vw();
        const aboutY = () => (wide() ? 0 : -0.25) * vh();
        const aboutScale = () => (wide() ? 0.31 : 0.21) / D_HEIGHT_VH;
        // Where the reel's glass D sits once the stage is pinned (shared layout maths).
        const reel = () => reelGlassFrame(vw(), vh());
        const reelScale = () => reel().height / D_HEIGHT_VH;

        gsap.set(d, { x: aboutX, y: aboutY, scale: aboutScale, opacity: 0 });

        // 1a. Trace in place, after the glass D has dissolved (HeroStage fades the room
        //     over the stretch before this).
        gsap
          .timeline({ scrollTrigger: { trigger: root, start: 'top 65%', end: 'top 15%', scrub: true, invalidateOnRefresh: true } })
          .to(d, { opacity: 1, duration: 0.15, ease: 'none' }, 0)
          .fromTo(d.querySelectorAll('path, line'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, ease: 'none' }, 0);

        // 1b. Glide to a large centred outline behind Experience.
        gsap.fromTo(
          d,
          { x: aboutX, y: aboutY, scale: aboutScale },
          {
            x: 0,
            y: 0,
            scale: 1,
            ease: 'power2.inOut',
            immediateRender: false,
            scrollTrigger: { trigger: root, start: 'top 15%', end: () => `+=${vh() * 0.9}`, scrub: true, invalidateOnRefresh: true },
          },
        );

        if (stage) {
          // 2a. As Projects arrives, settle onto the reel D's frame, offset by the 25vh
          //     the stage still has to travel before it pins.
          gsap.fromTo(
            d,
            { y: 0, scale: 1 },
            {
              y: () => reel().y + vh() * 0.25,
              scale: reelScale,
              ease: 'power1.inOut',
              immediateRender: false,
              scrollTrigger: { trigger: stage, start: 'top bottom', end: 'top 25%', scrub: true, invalidateOnRefresh: true },
            },
          );
          // 2b. Ride up with the stage (linear, like the scroll) while cross-fading into
          //     the glass D; PinnedGallery fades the glass in over this same range.
          gsap.fromTo(
            d,
            { y: () => reel().y + vh() * 0.25, opacity: 1 },
            {
              y: () => reel().y,
              opacity: 0,
              ease: 'none',
              immediateRender: false,
              scrollTrigger: { trigger: stage, start: 'top 25%', end: 'top top', scrub: true, invalidateOnRefresh: true },
            },
          );
        }
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className="relative isolate">
      <div data-outline-layer="" aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <svg
          data-outline-d=""
          viewBox="-1.05 -1.25 2.3 2.5"
          className="absolute inset-0 m-auto h-[72vh] w-[calc(72vh*0.92)] overflow-visible"
        >
          <g fill="none" stroke="var(--accent)" strokeWidth="0.0055" strokeDasharray="1" strokeLinecap="round">
            <path d={D_PATH} pathLength={1} strokeOpacity={0.8} />
            <path d={D_PATH} pathLength={1} strokeOpacity={0.35} transform={`translate(${DEPTH.x} ${DEPTH.y})`} />
            {CORNERS.map(([x, y]) => (
              <line key={`${x},${y}`} x1={x} y1={y} x2={x + DEPTH.x} y2={y + DEPTH.y} pathLength={1} strokeOpacity={0.45} />
            ))}
          </g>
        </svg>
      </div>
      {children}
    </div>
  );
}
