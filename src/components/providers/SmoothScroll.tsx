'use client';

/**
 * Lenis smooth scrolling, wired the way Lenis recommends for GSAP ScrollTrigger:
 *
 *   lenis.on('scroll', ScrollTrigger.update)      ScrollTrigger reads every Lenis frame
 *   gsap.ticker.add(t => lenis.raf(t * 1000))     one clock (GSAP's) drives both
 *   gsap.ticker.lagSmoothing(0)                    no catch-up jumps after a long frame
 *
 * Lenis animates the real window scroll position, so the native scrollbar, keyboard
 * scrolling, find-in-page and screen readers keep working. With reduced motion,
 * Lenis is never created and everything falls back to native scroll.
 */
import Lenis from 'lenis';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { handleAnchorClick, setLenis } from '@/lib/scroll';

export function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let lenis: Lenis | null = null;
    let tick: ((time: number) => void) | null = null;

    const start = () => {
      if (reduce.matches || lenis) return;
      lenis = new Lenis({ autoRaf: false, lerp: 0.1, wheelMultiplier: 1 });
      lenis.on('scroll', ScrollTrigger.update);
      tick = (time) => lenis?.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      setLenis(lenis);
    };
    const stop = () => {
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
      tick = null;
      setLenis(null);
    };
    const onChange = () => (reduce.matches ? stop() : start());

    start();
    reduce.addEventListener('change', onChange);
    // Fonts change line heights; re-measure trigger positions once they're in.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => {
      reduce.removeEventListener('change', onChange);
      stop();
    };
  }, []);

  // In-page anchors (skip links, nav, "Skip to projects"): scroll smoothly AND move
  // focus to the target, which a plain smooth-scroll would forget to do.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = (event.target as Element | null)?.closest?.('a[href*="#"]');
      if (!(link instanceof HTMLAnchorElement)) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
      handleAnchorClick(event, url.hash);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // New route: start at the top (unless there's a hash) and re-measure triggers.
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
