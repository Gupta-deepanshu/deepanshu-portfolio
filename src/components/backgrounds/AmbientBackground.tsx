'use client';

/**
 * One background that never leaves (alche.studio-style section blending).
 *
 * A fixed, full-screen CSS layer behind every section: near-black base, two soft
 * glows and the faint grid from the hero's room. Each section has a "mood" (glow
 * colours, positions, grid strength); as a section scrolls in, GSAP scrubs the
 * layer's CSS custom properties from the previous mood to its own. So there is
 * never a cut to flat black: the page just keeps changing light.
 *
 * Section effects (the WebGL room, the outline D, the reel, Liquid Ether, dots,
 * crosshairs) sit on top of this and fade in/out over it.
 *
 * Cost: CSS only (gradients + custom properties), no canvas. Reduced motion: the
 * first mood, static.
 */
import { useRef } from 'react';
import { gsap, MEDIA, useGSAP } from '@/lib/gsap';

type Mood = Record<'--g1x' | '--g1y' | '--g1c' | '--g2x' | '--g2y' | '--g2c' | '--grid', string | number>;

// rgba() with commas so GSAP can interpolate the colours.
const MOODS: { id: string; mood: Mood }[] = [
  { id: 'top', mood: { '--g1x': '62%', '--g1y': '45%', '--g1c': 'rgba(87,49,242,0.42)', '--g2x': '15%', '--g2y': '85%', '--g2c': 'rgba(40,60,190,0.18)', '--grid': 0.55 } },
  { id: 'about', mood: { '--g1x': '18%', '--g1y': '50%', '--g1c': 'rgba(60,52,190,0.34)', '--g2x': '85%', '--g2y': '20%', '--g2c': 'rgba(87,49,242,0.12)', '--grid': 0.45 } },
  { id: 'experience', mood: { '--g1x': '12%', '--g1y': '30%', '--g1c': 'rgba(52,42,160,0.24)', '--g2x': '88%', '--g2y': '85%', '--g2c': 'rgba(110,80,230,0.12)', '--grid': 0.3 } },
  { id: 'projects', mood: { '--g1x': '50%', '--g1y': '42%', '--g1c': 'rgba(110,80,230,0.3)', '--g2x': '50%', '--g2y': '100%', '--g2c': 'rgba(40,60,190,0.16)', '--grid': 0.5 } },
  { id: 'skills', mood: { '--g1x': '82%', '--g1y': '28%', '--g1c': 'rgba(40,110,200,0.2)', '--g2x': '18%', '--g2y': '82%', '--g2c': 'rgba(110,80,230,0.12)', '--grid': 0.28 } },
  { id: 'contact', mood: { '--g1x': '30%', '--g1y': '60%', '--g1c': 'rgba(90,60,230,0.34)', '--g2x': '82%', '--g2y': '28%', '--g2c': 'rgba(60,120,240,0.2)', '--grid': 0.2 } },
];

export function AmbientBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      gsap.set(el, MOODS[0].mood);
      const mm = gsap.matchMedia();
      mm.add(MEDIA.motion, () => {
        MOODS.slice(1).forEach(({ id, mood }, i) => {
          const section = document.getElementById(id);
          if (!section) return;
          // Blend over the section's arrival: from when its top (or the empty hold before
          // it, if any) enters to when the section is two-thirds of the way up the screen.
          // So during a hold the only thing changing on screen is the light.
          const hold = document.querySelector(`[data-hold="${id}-in"]`);
          gsap.fromTo(el, MOODS[i].mood, {
            ...mood,
            ease: 'none',
            immediateRender: false,
            scrollTrigger: { trigger: hold ?? section, start: 'top bottom', endTrigger: section, end: 'top 35%', scrub: true },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} aria-hidden="true" className="ambient pointer-events-none fixed inset-0 -z-50">
      <div className="ambient-grid absolute inset-0" />
    </div>
  );
}
