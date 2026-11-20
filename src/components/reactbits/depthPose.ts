/*
 * Pose math vendored from React Bits' Depth Carousel (DepthCarousel-TS-TW): cards recede
 * into depth along a tilted 3D rail. Only the `layout` maths is taken; the component's
 * own engine (wheel/drag/autoplay, GSAP tweens) is not, because its wheel handler calls
 * preventDefault and would fight the pinned, scroll-driven Skills section that drives it.
 *
 * Local changes:
 * - No loop: cards before the front fade out as they pass the camera (each group is seen
 *   once while scrolling down), cards past `visible` fade in smoothly instead of popping.
 * - No CSS filter (brightness/blur): filters repaint every frame. Depth darkening is the
 *   opacity of a black overlay instead, so per-frame work stays transform + opacity.
 * - Pure function, no DOM: the caller writes the styles.
 */

export interface DepthConfig {
  /** px each step back moves away from the camera. */
  depth: number;
  /** px each step back moves sideways (positive = to the right). */
  spread: number;
  /** degrees the cards behind the front turn (rotateY). */
  tilt: number;
  /** How many cards behind the front stay visible. */
  visible: number;
  /** How much each step back darkens (0–1). */
  falloff: number;
}

export interface DepthPose {
  transform: string;
  opacity: number;
  /** Opacity of the black overlay that darkens cards further back. */
  shade: number;
  zIndex: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** Pose of a card `d` slots behind the front (fractional; d < 0 = already passed). */
export function depthPose(d: number, cfg: DepthConfig): DepthPose {
  const back = Math.max(0, d);
  const tx = cfg.spread * d;
  const tz = -cfg.depth * d;
  const ry = cfg.tilt * clamp(d, 0, 1);
  const opacity = d < 0 ? clamp(1 + d, 0, 1) : clamp(cfg.visible + 0.5 - d, 0, 1);
  return {
    transform: `translate(-50%, -50%) translate3d(${tx.toFixed(2)}px, 0, ${tz.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg)`,
    opacity,
    shade: clamp(back * cfg.falloff * 1.25, 0, 0.86),
    zIndex: Math.round(2000 - d * 20),
  };
}
