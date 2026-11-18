'use client';

import { useSyncExternalStore } from 'react';

/**
 * Subscribe to a media query. Server snapshot is `serverValue` so the first client
 * render matches the HTML; the real value arrives right after hydration.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
/** Desktop-class device: wide viewport and a precise pointer (mouse/trackpad). */
export const useFinePointer = () => useMediaQuery('(pointer: fine)');
export const useIsDesktop = () => useMediaQuery('(min-width: 768px)');

let webgl2: boolean | undefined;
/** Cached WebGL2 capability check (one throwaway context, released immediately). */
export function supportsWebGL2(): boolean {
  if (webgl2 !== undefined) return webgl2;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    webgl2 = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl2 = false;
  }
  return webgl2;
}

export function useWebGL2(): boolean {
  return useSyncExternalStore(
    () => () => {},
    supportsWebGL2,
    () => false,
  );
}
