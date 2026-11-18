'use client';

import type Lenis from 'lenis';

/**
 * Scroll helpers that work with or without Lenis, so callers never need to know
 * whether smooth scrolling is on (it's off for reduced motion).
 */
let instance: Lenis | null = null;

export const setLenis = (lenis: Lenis | null) => {
  instance = lenis;
};
export const getLenis = () => instance;

/** Scroll to a y position (px). */
export function scrollToY(y: number, { immediate = false }: { immediate?: boolean } = {}) {
  if (instance) instance.scrollTo(y, { immediate, duration: 1.1 });
  else window.scrollTo({ top: y, behavior: 'auto' });
}

/**
 * Scroll to an element and move keyboard focus to it (focus without a second
 * native jump). This is what makes the skip links and in-page anchors accessible.
 */
export function scrollToElement(el: HTMLElement) {
  const focus = () => {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  };
  if (instance) {
    instance.scrollTo(el, { duration: 1.1 });
    focus();
  } else {
    el.scrollIntoView({ behavior: 'auto', block: 'start' });
    focus();
  }
}

/** Handle a click on an in-page anchor (#id). Returns true if handled. */
export function handleAnchorClick(event: { preventDefault: () => void }, hash: string): boolean {
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  const el = id ? document.getElementById(id) : null;
  if (!el) return false;
  event.preventDefault();
  history.pushState(null, '', `#${id}`);
  scrollToElement(el);
  return true;
}
