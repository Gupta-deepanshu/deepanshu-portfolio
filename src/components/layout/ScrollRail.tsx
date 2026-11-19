'use client';

/**
 * alche.studio-style scroll progress rail on the left edge (desktop only).
 * One short track per section; the active section's track grows, fills with its
 * scroll progress and shows its label (set vertically, so the rail fits in the page
 * gutter and never overlaps content). Clicking a track jumps to that section.
 *
 * - Progress is written straight to the DOM from ScrollTrigger (transform: scaleY),
 *   so scrolling never re-renders React; only the active index is state.
 * - Decorative duplicate of the header nav: aria-hidden and out of the tab order
 *   (keyboard and screen-reader users already have the header links).
 * - With reduced motion it still tracks position; only the CSS transitions are off.
 */
import { useRef, useState } from 'react';
import { ScrollTrigger, useGSAP } from '@/lib/gsap';
import { scrollToY } from '@/lib/scroll';
import { cn } from '@/lib/cn';

const SECTIONS = [
  { id: 'top', label: 'Top' },
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Work' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
];

export function ScrollRail() {
  const ref = useRef<HTMLDivElement>(null);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const triggers = SECTIONS.map(({ id }, i) => {
        const el = document.getElementById(id);
        if (!el) return null;
        return ScrollTrigger.create({
          trigger: el,
          start: 'top center',
          end: 'bottom center',
          onToggle: (self) => self.isActive && setActive(i),
          onUpdate: (self) => {
            const fill = fills.current[i];
            if (fill) fill.style.transform = `scaleY(${self.progress})`;
          },
        });
      });
      return () => triggers.forEach((t) => t?.kill());
    },
    { scope: ref },
  );

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY);
  };

  return (
    <div ref={ref} aria-hidden="true" className="fixed left-5 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
      <ul className="flex flex-col gap-3">
        {SECTIONS.map(({ id, label }, i) => {
          const on = i === active;
          return (
            <li key={id}>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => jump(id)}
                className="group relative block py-0.5"
              >
                <span
                  className={cn(
                    'relative block w-px overflow-hidden bg-fg/25 transition-[height] duration-500 ease-out',
                    on ? 'h-14' : 'h-4 group-hover:h-6',
                  )}
                >
                  <span
                    ref={(el) => {
                      fills.current[i] = el;
                    }}
                    className="absolute inset-0 origin-top bg-fg"
                    style={{ transform: 'scaleY(0)' }}
                  />
                </span>
                <span
                  className={cn(
                    'absolute left-2.5 top-0.5 rotate-180 font-mono text-[0.6rem] uppercase leading-none tracking-[0.14em] transition-opacity duration-300 [writing-mode:vertical-rl]',
                    on ? 'text-fg opacity-100' : 'text-muted opacity-0 group-hover:opacity-100',
                  )}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
