'use client';

/**
 * Single place GSAP plugins are registered. Import gsap/ScrollTrigger/SplitText
 * from here so registration always happens before use.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
}

/** gsap.matchMedia() conditions shared by every scroll-driven animation. */
export const MEDIA = {
  /** Full motion: everything runs. */
  motion: '(prefers-reduced-motion: no-preference)',
  desktop: '(prefers-reduced-motion: no-preference) and (min-width: 768px)',
  mobile: '(prefers-reduced-motion: no-preference) and (max-width: 767px)',
} as const;

/** Weighty default ease: slow in the tail, no overshoot. */
export const EASE = 'power3.out';

export { gsap, ScrollTrigger, SplitText, useGSAP };
