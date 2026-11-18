'use client';

/**
 * Page transitions (Motion). A curtain covers the page, the route changes underneath,
 * then the curtain lifts once the new pathname has rendered.
 *
 * Why not React's <ViewTransition>? It's still experimental in Next.js; this version
 * is ~60 lines, works in every browser, and is easy to reason about. Reduced motion
 * skips the curtain entirely.
 */
import { AnimatePresence, motion } from 'motion/react';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type Phase = 'idle' | 'covering' | 'revealing';

const Ctx = createContext<(href: string) => void>(() => {});
export const useTransitionNavigate = () => useContext(Ctx);

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');
  const target = useRef<string | null>(null);
  const from = useRef(pathname);

  const navigate = useCallback(
    (href: string) => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || phase !== 'idle') {
        router.push(href);
        return;
      }
      target.current = href;
      from.current = pathname;
      setPhase('covering');
    },
    [phase, pathname, router],
  );

  // New page rendered under the curtain → lift it.
  useEffect(() => {
    if (phase === 'covering' && pathname !== from.current) {
      const id = requestAnimationFrame(() => setPhase('revealing'));
      return () => cancelAnimationFrame(id);
    }
  }, [pathname, phase]);

  return (
    <Ctx.Provider value={navigate}>
      {children}
      <AnimatePresence>
        {phase !== 'idle' && (
          <motion.div
            key="curtain"
            aria-hidden="true"
            className="pointer-events-auto fixed inset-0 z-[90] bg-raised"
            style={{ originY: phase === 'covering' ? 1 : 0 }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: phase === 'covering' ? 1 : 0 }}
            transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
            onAnimationComplete={() => {
              if (phase === 'covering' && target.current) {
                router.push(target.current);
                target.current = null;
              } else if (phase === 'revealing') {
                setPhase('idle');
              }
            }}
          />
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

/** Wrap with useTransitionNavigate in a link component (see TransitionLink). */
export type { Phase };
