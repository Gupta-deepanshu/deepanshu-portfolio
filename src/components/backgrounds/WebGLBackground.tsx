'use client';

/**
 * Host for a WebGL section background (glass D scene in the hero, Liquid Ether in contact).
 *
 * - Static layer is always rendered underneath: it is what shows with reduced
 *   motion, without WebGL2, before the canvas mounts and on small screens when
 *   `desktopOnly` is set. `staticContent` adds artwork to it (the hero's SVG D).
 * - The canvas component is code-split (next/dynamic, ssr:false) and mounted only
 *   while the WebGL budget says this slot isn't 'released'; 'paused' stops its loop.
 * - Mobile: DPR is capped and cursor interaction is off.
 * - If a context cannot be created the components draw nothing, so the static
 *   layer underneath simply remains visible.
 */
import dynamic from 'next/dynamic';
import { useRef, useSyncExternalStore, type ReactNode } from 'react';
import { useWebGLSlot } from '@/lib/gl-budget';
import { useFinePointer, useIsDesktop, useReducedMotion, useWebGL2 } from '@/lib/media-query';
import { cn } from '@/lib/cn';

const GlassD = dynamic(() => import('@/components/three/GlassD'), { ssr: false });
const LiquidEther = dynamic(() => import('@/components/reactbits/LiquidEther'), { ssr: false });
const noop = () => () => {};

interface Props {
  kind: 'glass' | 'ether';
  staticClassName: string;
  /** Extra static artwork drawn on the fallback layer. */
  staticContent?: ReactNode;
  /** Use only the static fallback below 768px (keeps mobile scrolling smooth). */
  desktopOnly?: boolean;
  slotId: string;
  /** Wrapper classes; defaults to the bleeding, edge-masked `section-bg`. */
  className?: string;
}

export function WebGLBackground({ kind, staticClassName, staticContent, desktopOnly = false, slotId, className = 'section-bg' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const desktop = useIsDesktop();
  const fine = useFinePointer();
  const webgl = useWebGL2();
  const enabled = webgl && !reduce && (!desktopOnly || desktop);
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const slot = useWebGLSlot(ref, enabled);
  const paused = slot !== 'active';
  const dpr = desktop ? 1.25 : 0.75;

  return (
    <div ref={ref} data-bg="" data-gl-slot={slotId} data-gl-state={slot} aria-hidden="true" className={className}>
      <div
        className={cn('absolute inset-0', staticClassName)}
        data-animate={!reduce && !enabled ? '' : undefined}
        data-static-only={hydrated && !enabled ? '' : undefined}
      >
        {staticContent}
      </div>
      {enabled &&
        slot !== 'released' &&
        (kind === 'glass' ? (
          // The glass scene paints its own opaque background, so no blending needed.
          <GlassD paused={paused} dpr={dpr} interactive={fine} />
        ) : (
          // screen blend: the canvas only adds light, so its black clear colour never hides the gradient
          <div className="absolute inset-0 mix-blend-screen">
            <LiquidEther
              colors={['#3b2bd6', '#a594ff', '#6fb7ff']}
              mouseForce={18}
              cursorSize={110}
              resolution={0.45}
              autoDemo
              autoSpeed={0.35}
              autoIntensity={1.6}
              clickBurst={false}
              maxDevicePixelRatio={dpr}
              paused={paused}
            />
          </div>
        ))}
    </div>
  );
}
