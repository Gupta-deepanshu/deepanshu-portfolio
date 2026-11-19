'use client';

/**
 * WebGL budget: decides, for every WebGL surface on the page, whether it should be
 *
 *   'active'   in or near the viewport → mounted and rendering
 *   'paused'   within ~2 viewports      → mounted, context kept, render loop stopped
 *   'released' further away             → unmounted, so its WebGL context is freed
 *
 * and guarantees at most MAX_ACTIVE surfaces render at once (the ones closest to the
 * viewport centre win). Two IntersectionObservers do the distance bucketing so we
 * never poll layout on scroll.
 *
 * Why not one shared canvas with scissor rects? The three surfaces use very different
 * pipelines (2-pass bloom, a fluid sim, a textured mesh). Merging them means rewriting
 * all three into one renderer; with this budget the cost is already "≤2 contexts busy",
 * which is what a shared canvas would buy us in practice.
 */
import { useEffect, useState, type RefObject } from 'react';

export type SlotState = 'active' | 'paused' | 'released';

const MAX_ACTIVE = 2;

interface Slot {
  el: Element;
  near: boolean;
  mounted: boolean;
  /** Once mounted, never released again (paused instead): see `keepAlive`. */
  keep: boolean;
  wasMounted: boolean;
  set: (state: SlotState) => void;
  current: SlotState;
}

const slots = new Set<Slot>();
let nearObserver: IntersectionObserver | null = null;
let mountObserver: IntersectionObserver | null = null;

function recompute() {
  const mid = window.innerHeight / 2;
  const distance = (slot: Slot) => {
    const r = slot.el.getBoundingClientRect();
    if (r.top <= mid && r.bottom >= mid) return 0;
    return Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
  };
  const near = [...slots].filter((s) => s.near).sort((a, b) => distance(a) - distance(b));
  const active = new Set(near.slice(0, MAX_ACTIVE));
  slots.forEach((slot) => {
    const next: SlotState = active.has(slot)
      ? 'active'
      : slot.mounted || slot.near || (slot.keep && slot.wasMounted)
        ? 'paused'
        : 'released';
    if (next !== 'released') slot.wasMounted = true;
    if (next !== slot.current) {
      slot.current = next;
      slot.set(next);
    }
  });
}

function find(el: Element) {
  for (const slot of slots) if (slot.el === el) return slot;
  return undefined;
}

function observers() {
  if (nearObserver && mountObserver) return;
  nearObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const slot = find(e.target);
        if (slot) slot.near = e.isIntersecting;
      });
      recompute();
    },
    { rootMargin: '50% 0px 50% 0px' },
  );
  mountObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const slot = find(e.target);
        if (slot) slot.mounted = e.isIntersecting;
      });
      recompute();
    },
    { rootMargin: '200% 0px 200% 0px' },
  );
}

/**
 * Register an element (the section/stage that hosts a canvas) with the budget.
 * Pass `enabled=false` on devices/preferences that use the CSS fallback instead.
 * `keepAlive`: once mounted it is paused (context kept, no rendering) instead of
 * released when far away. For scenes whose shader compile stalls the GPU thread
 * (~100 ms on D3D) — tearing them down and rebuilding mid-scroll dropped frames.
 */
export function useWebGLSlot(ref: RefObject<Element | null>, enabled = true, keepAlive = false): SlotState {
  const [state, setState] = useState<SlotState>('released');

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    observers();
    const slot: Slot = { el, near: false, mounted: false, keep: keepAlive, wasMounted: false, set: setState, current: 'released' };
    slots.add(slot);
    nearObserver!.observe(el);
    mountObserver!.observe(el);
    return () => {
      nearObserver?.unobserve(el);
      mountObserver?.unobserve(el);
      slots.delete(slot);
      setState('released');
      recompute();
    };
  }, [ref, enabled, keepAlive]);

  return enabled ? state : 'released';
}

/** Debug helper used by the Playwright checks. */
export function budgetSnapshot() {
  return [...slots].map((s) => ({ id: (s.el as HTMLElement).dataset.glSlot ?? s.el.id, state: s.current }));
}

if (typeof window !== 'undefined') {
  (window as unknown as { __glBudget?: typeof budgetSnapshot }).__glBudget = budgetSnapshot;
}
