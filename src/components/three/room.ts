/**
 * GLSL shared by the hero scene and the projects reel: the "room" both live in.
 *
 *   gridLines(g, w)       anti-aliased grid (fwidth keeps lines ~1px at any DPR)
 *   cylinderWall(p)       maps a centred screen point to coordinates on the inside
 *                         of a cylinder around the camera: x = angle, y = height.
 *                         Columns narrow toward the edges and rows bow outward.
 */
export const ROOM_CHUNK = /* glsl */ `
float gridLines(vec2 g, float width) {
  vec2 d = abs(fract(g - 0.5) - 0.5) / fwidth(g);
  return 1.0 - clamp(min(d.x, d.y) - width, 0.0, 1.0);
}
vec2 cylinderWall(vec2 p) {
  return vec2(atan(p.x), p.y / sqrt(1.0 + p.x * p.x));
}
`;

export const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
