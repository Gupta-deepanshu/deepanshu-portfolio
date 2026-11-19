'use client';

/**
 * Shared stage for Experience + Projects (after alche.studio's works → about hand-off).
 *
 * 1. The Hero/About room stays fixed one more viewport and dissolves into the ambient
 *    page background (HeroStage); this wrapper is transparent, so there is no panel
 *    edge, just changing light.
 * 2. Meanwhile the outline D arrives exactly where the glass D sat in About (same
 *    place, same size), drawing itself — the glass "becomes" a line drawing.
 *    Once Experience fills the screen it grows into a large centred outline and
 *    stays put (sticky) behind Experience; as Projects arrives it opens up and fades, handing over to the glass D that floats behind the reel's cards.
 * 3. The last 45vh of the stage is masked, so it dissolves into Skills.
 *
 * Reduced motion: no scroll animation; the outline is static, large and centred.
 */
import { useRef, type ReactNode } from 'react';
import { gsap, MEDIA, useGSAP } from '@/lib/gsap';

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

export function OutlineStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      const d = root?.querySelector<SVGSVGElement>('[data-outline-d]');
      if (!root || !d) return;
      const mm = gsap.matchMedia();
      mm.add(MEDIA.motion, () => {
        const wide = () => window.innerWidth / window.innerHeight >= 1.15;
        // Where the glass D rests in About (see GlassD: x = ±0.7/0.58 of half-width).
        const startX = () => (wide() ? -0.35 : 0.29) * window.innerWidth;
        const startY = () => (wide() ? 0 : -0.25) * window.innerHeight;
        const startScale = () => (wide() ? 0.54 : 0.36);

        // The line drawing traces itself while the panel slides up.
        gsap.fromTo(
          d.querySelectorAll('path, line'),
          { strokeDashoffset: 1 },
          { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: root, start: 'top 85%', end: 'top 15%', scrub: true } },
        );
        // Then it grows from the About spot to a large centred outline.
        gsap.fromTo(
          d,
          { x: startX, y: startY, scale: startScale },
          {
            x: 0,
            y: 0,
            scale: 1,
            ease: 'power2.inOut',
            scrollTrigger: { trigger: root, start: 'top top', end: () => `+=${window.innerHeight * 0.9}`, scrub: true, invalidateOnRefresh: true },
          },
        );
        // Projects: it opens up and fades as the reel's glass D (alche's A between the
        // cards) takes over, so the line drawing seems to turn back into glass.
        gsap.to(d, {
          scale: 1.6,
          opacity: 0,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: { trigger: root.querySelector('#projects'), start: 'top bottom', end: 'top top', scrub: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className="relative isolate">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,#000_calc(100%-45vh),transparent)]"
      >
        <div data-stage-sticky="" className="sticky top-0 h-svh overflow-hidden">
          <svg
            data-outline-d=""
            viewBox="-1.05 -1.25 2.3 2.5"
            className="absolute inset-0 m-auto h-[72vh] w-[calc(72vh*0.92)] overflow-visible"
          >
            <g
              fill="none"
              stroke="var(--accent)"
              strokeWidth="0.0055"
             
              strokeDasharray="1"
              strokeLinecap="round"
            >
              <path d={D_PATH} pathLength={1} strokeOpacity={0.8} />
              <path
                d={D_PATH}
                pathLength={1}
               
                strokeOpacity={0.35}
                transform={`translate(${DEPTH.x} ${DEPTH.y})`}
              />
              {CORNERS.map(([x, y]) => (
                <line
                  key={`${x},${y}`}
                  x1={x}
                  y1={y}
                  x2={x + DEPTH.x}
                  y2={y + DEPTH.y}
                  pathLength={1}
                 
                  strokeOpacity={0.45}
                />
              ))}
            </g>
          </svg>
        </div>
      </div>
      {children}
    </div>
  );
}
