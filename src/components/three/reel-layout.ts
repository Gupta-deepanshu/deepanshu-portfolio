/**
 * Projects reel layout, shared by the WebGL reel (CurvedReel) and the DOM outline D
 * that hands over to the reel's glass D (OutlineStage). One source of truth, so the
 * outline can land exactly on the glass D's screen position and size.
 */

export const RADIUS = 5;
export const FOV = 38;
/** Ring tilt around the view axis (rad), ~11.5°; negative = next card lower right. */
export const TILT = -0.2;
/** Card centre height above the camera (world units). */
export const CARD_LIFT = 0.32;
const CARD_ASPECT = 1.6;
/** The glass D sits this many radii back and stands this many card-heights tall. */
const GLASS_DEPTH = RADIUS * 1.5;
const GLASS_TO_CARD = 1.3;
/** Height of the D's bounding box in geometry units (2 + bevel). */
const GLASS_GEOMETRY_HEIGHT = 2.3;

const tanHalfFov = () => Math.tan((FOV * Math.PI) / 360);

/** Focused card size in world units: ~55% of the width, capped at ~52% of the height. */
export function cardSize(aspect: number) {
  const tanV = tanHalfFov();
  let w = 2 * RADIUS * Math.atan(0.55 * tanV * aspect);
  const maxH = 2 * RADIUS * 0.52 * tanV;
  if (w / CARD_ASPECT > maxH) w = maxH * CARD_ASPECT;
  return { w, h: w / CARD_ASPECT, aspect: CARD_ASPECT };
}

/** World placement of the glass D behind the cards. */
export function glassPlacement(aspect: number) {
  const { h } = cardSize(aspect);
  return {
    y: CARD_LIFT * 1.5,
    z: -GLASS_DEPTH,
    scale: (GLASS_TO_CARD * h * GLASS_DEPTH) / (RADIUS * GLASS_GEOMETRY_HEIGHT),
  };
}

/**
 * Where the glass D appears on screen with the stage pinned (camera at rest):
 * `y` = px offset of its centre from the viewport centre (negative = up), `height` =
 * height of the glass D's front silhouette as a fraction of the viewport height (the
 * extrusion's front face is nearer the camera, so it reads ~2.3 units, not 2).
 */
export function reelGlassFrame(width: number, height: number) {
  const tanV = tanHalfFov();
  const g = glassPlacement(width / height);
  const depth = -g.z;
  return {
    y: -((g.y / depth / tanV) * height) / 2,
    height: (2.3 * g.scale) / depth / (2 * tanV),
  };
}
