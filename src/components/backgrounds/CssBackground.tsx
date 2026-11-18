'use client';

/**
 * Lightweight CSS/SVG section background. On desktop with motion allowed, the
 * pointer position is written to --mx/--my (rAF-throttled) so the CSS gradients can
 * follow it. No canvas, no WebGL context.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function CssBackground({ className, children }: { className?: string; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const section = el?.parentElement;
    if (!el || !section) return;
    const ok = window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)').matches;
    if (!ok) return;
    let frame = 0;
    let px = 0;
    let py = 0;
    const apply = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${px - r.left}px`);
      el.style.setProperty('--my', `${py - r.top}px`);
    };
    const move = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    section.addEventListener('pointermove', move, { passive: true });
    return () => {
      section.removeEventListener('pointermove', move);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} data-bg="" aria-hidden="true" className={cn('section-bg', className)}>
      {children}
    </div>
  );
}
