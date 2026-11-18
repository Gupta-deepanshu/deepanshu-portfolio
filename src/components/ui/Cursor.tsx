'use client';

/**
 * Optional trailing cursor ring (Motion springs). Only for (pointer: fine) and motion
 * allowed; the native cursor stays visible, so nothing is lost if this never loads.
 */
import { motion, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useState } from 'react';
import { useFinePointer, useReducedMotion } from '@/lib/media-query';

export function Cursor() {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  if (!fine || reduce) return null;
  return <Ring />;
}

function Ring() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 380, damping: 40, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 380, damping: 40, mass: 0.6 });
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as Element | null;
      setHover(!!t?.closest?.('a, button, [role="link"], [data-cursor]'));
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [x, y]);

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[110] rounded-full border border-fg/60 mix-blend-difference"
      style={{ x: sx, y: sy, translateX: '-50%', translateY: '-50%', width: 36, height: 36 }}
      animate={{ scale: hover ? 1.6 : 1, opacity: hover ? 1 : 0.6 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}
