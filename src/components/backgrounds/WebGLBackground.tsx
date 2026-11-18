'use client';

/**
 * Host for a WebGL section background (Silk in the hero, Liquid Ether in contact).
 *
 * - Static CSS gradient is always rendered underneath: it is what shows with
 *   reduced motion, without WebGL2, before the canvas mounts and on small screens
 *   when `desktopOnly` is set.
 * - The canvas component is code-split (next/dynamic, ssr:false) and mounted only
 *   while the WebGL budget says this slot isn't 'released'; 'paused' stops its loop.
 * - Mobile: DPR is capped and cursor interaction is off.
 * - If a context cannot be created the components draw nothing, so the static
 *   gradient underneath simply remains visible.
 */
import dynamic from 'next/dynamic';
import { useRef } from 'react';
import { useWebGLSlot } from '@/lib/gl-budget';
import { useFinePointer, useIsDesktop, useReducedMotion, useWebGL2 } from '@/lib/media-query';
import { cn } from '@/lib/cn';

const Silk = dynamic(() => import('@/components/reactbits/Silk'), { ssr: false });
const LiquidEther = dynamic(() => import('@/components/reactbits/LiquidEther'), { ssr: false });

interface Props {
  kind: 'silk' | 'ether';
  staticClassName: string;
  /** Use only the static fallback below 768px (keeps mobile scrolling smooth). */
  desktopOnly?: boolean;
  slotId: string;
}

export function WebGLBackground({ kind, staticClassName, desktopOnly = false, slotId }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const desktop = useIsDesktop();
  const fine = useFinePointer();
  const webgl = useWebGL2();
  const enabled = webgl && !reduce && (!desktopOnly || desktop);
  const slot = useWebGLSlot(ref, enabled);
  const paused = slot !== 'active';
  const dpr = desktop ? 1.25 : 0.75;

  return (
    <div ref={ref} data-bg="" data-gl-slot={slotId} data-gl-state={slot} aria-hidden="true" className="section-bg">
      <div className={cn('absolute inset-0', staticClassName)} data-animate={!reduce && !enabled ? '' : undefined} />
      {enabled && slot !== 'released' && (
        <div className="absolute inset-0">
          {kind === 'silk' ? (
            <Silk
              color="#2a2630"
              sheenColor="#ffb08f"
              speed={3}
              scale={1.1}
              noiseIntensity={1.2}
              sheen={0.45}
              glow={0.25}
              depth={0.6}
              rotation={-0.35}
              mouseInteraction={fine}
              clickRipple={false}
              paused={paused}
              dpr={dpr}
            />
          ) : (
            <LiquidEther
              colors={['#ff6a3d', '#7a4bd8', '#f2c57c']}
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
          )}
        </div>
      )}
    </div>
  );
}
