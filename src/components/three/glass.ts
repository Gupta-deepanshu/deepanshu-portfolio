/**
 * The glass D, shared by the hero (GlassD) and the projects reel (CurvedReel).
 *
 *   createD()     extruded, chamfered "D" frame (stem + half-disc bowl, wide counter);
 *                 the same outline as the static SVG D and the outline D.
 *   GLASS_VERT/FRAG
 *                 thick, prism-like glass that samples a texture of whatever is BEHIND
 *                 it (uBg, in screen space): shifted per flat facet and brightened,
 *                 crinkled milky frost patches with grain, R/G/B dispersion + rainbow
 *                 thin-film on the chamfers, dark side walls, glints. With GLASS_TEXT
 *                 it also draws the hero name (TEXT_CHUNK) unbent through the faces. uVel (fluid velocity) adds extra bend; pass a black
 *                 texture where there is no fluid. uAlpha fades it (premultiplied).
 */
import { ExtrudeGeometry, Shape } from 'three';

export const GLASS_VERT = /* glsl */ `
varying vec3 vNormal; varying vec3 vViewPos; varying vec3 vObj;
void main() {
  vObj = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}`;

/**
 * The name, sampled from its canvas texture in screen space (uTextRect = x, y, w, h in
 * 0..1 screen UV). Shared by the hero's screen composite and its glass, so the letters
 * line up exactly where they cross the glass edge.
 */
export const TEXT_CHUNK = /* glsl */ `
uniform sampler2D uText; uniform vec4 uTextRect; uniform float uTextAlpha;
vec4 textAt(vec2 uv) {
  vec2 t = (uv - uTextRect.xy) / uTextRect.zw;
  if (t.x < 0.0 || t.y < 0.0 || t.x > 1.0 || t.y > 1.0) return vec4(0.0);
  vec4 c = texture2D(uText, t);
  return vec4(c.rgb, c.a * uTextAlpha);
}`;

/**
 * Glass. Define GLASS_TEXT (and pass TEXT_CHUNK's uniforms) to have it draw the name
 * itself: unbent through the flat faces, bent only on the chamfers, sprayed by frost.
 */
export const GLASS_FRAG = /* glsl */ `
uniform sampler2D uBg; uniform sampler2D uVel; uniform vec2 uRes; uniform vec2 uCenter; uniform float uTime; uniform float uAlpha;
varying vec3 vNormal; varying vec3 vViewPos; varying vec3 vObj;
#ifdef GLASS_TEXT
${TEXT_CHUNK}
#endif

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1); p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float rand(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 suv = gl_FragCoord.xy / uRes;
  vec3 n = normalize(vNormal);
  vec3 V = normalize(-vViewPos);
  // 0 on faces turned to the viewer, -> 1 on the chamfers and side walls.
  float edge = 1.0 - max(dot(n, V), 0.0);
  float fres = pow(edge, 2.5);
  float chamfer = smoothstep(0.12, 0.55, edge);

  // Frost: large crinkled patches (ice / crushed foil) with crease lines and grain.
  vec3 fp = vObj + vec3(0.0, uTime * 0.03, uTime * 0.02);
  float n1 = noise(fp * vec3(1.4, 1.7, 1.4) + 4.0);
  float n2 = noise(fp * 4.5 + 9.0);
  float n3 = noise(fp * 15.0);
  float frost = smoothstep(0.66, 1.0, n1 + 0.45 * n2 + 0.18 * n3);
  float crease = pow(1.0 - abs(n2 * 2.0 - 1.0), 12.0);

  // The room behind, refracted: a flat facet shifts it by its tilt, the lens magnifies
  // it a little; R/G/B split mostly on the chamfers. Frost scatters samples per pixel
  // (grainy, not blurred).
  vec2 lens = uCenter + (suv - uCenter) * 0.86;
  vec2 bend = n.xy * 0.09 + texture2D(uVel, suv).xy * 0.0003;
  vec2 disp = bend * (0.06 + chamfer * 0.5);
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 j = (vec2(rand(suv * 91.7 + fi), rand(suv.yx * 37.3 + fi * 1.7)) - 0.5) * (0.004 + frost * 0.035);
    vec2 b = lens - bend + j;
    acc.r += texture2D(uBg, b + disp).r;
    acc.g += texture2D(uBg, b).g;
    acc.b += texture2D(uBg, b - disp).b;
  }
  vec3 room = acc / 6.0;
  // Thick glass gathers light: brighter, slightly richer than the room around it.
  float l = dot(room, vec3(0.299, 0.587, 0.114));
  vec3 col = mix(vec3(l), room, 1.15) * 1.35 + vec3(0.008, 0.008, 0.02);
  // Frosted patches go milky in the room's own colour, with brighter creases.
  vec3 milk = room * 2.4 + vec3(0.045, 0.05, 0.08);
  col = mix(col, milk, frost * 0.6);
  col += crease * frost * vec3(0.05, 0.055, 0.07);
  col += (rand(suv * 311.0) - 0.5) * 0.05 * frost;

  // Side walls read darker (light leaves through the faces), silhouettes get a dark line.
  col *= mix(1.0, 0.55, smoothstep(0.75, 1.0, edge));

  // Chamfers: rainbow thin-film, bright rim, sharp glints.
  vec3 film = 0.5 + 0.5 * cos(6.2831 * (edge * 1.6 + vObj.x * 0.4 + vObj.y * 0.25 + vec3(0.0, 0.33, 0.67)));
  col += film * smoothstep(0.16, 0.28, edge) * (1.0 - smoothstep(0.4, 0.62, edge)) * 0.5;
  col += fres * vec3(0.7, 0.72, 0.9) * 0.25;
  vec3 R = reflect(-V, n);
  col += pow(max(dot(R, normalize(vec3(-0.5, 0.75, 0.6))), 0.0), 90.0) * (0.2 + 0.8 * chamfer) * 1.2;
  col += pow(max(dot(R, normalize(vec3(0.8, -0.3, 0.5))), 0.0), 24.0) * 0.2 * chamfer;

#ifdef GLASS_TEXT
  // The name sits just behind a flat front face: a parallel slab barely shifts it, so it
  // stays aligned with the letters outside the glass. Chamfers bend it; frost sprays
  // its edges into grain while the letter cores stay solid.
  vec2 spray = (vec2(rand(suv * 53.7), rand(suv.yx * 71.3)) - 0.5) * frost * 0.022;
  vec4 tx = textAt(suv - bend * chamfer * 1.4 + spray);
  col = mix(col, tx.rgb * 1.05, tx.a * (1.0 - smoothstep(0.6, 0.95, edge) * 0.85));
#endif
  gl_FragColor = vec4(col * uAlpha, uAlpha);
}`;


/** A thin-stroked "D" frame (stem + half-disc bowl, wide counter), extruded with a crisp chamfer. */
export function createD() {
  const outer = new Shape();
  outer.moveTo(-0.75, -1);
  outer.lineTo(-0.75, 1);
  outer.lineTo(0, 1);
  outer.absarc(0, 0, 1, Math.PI / 2, -Math.PI / 2, true);
  outer.lineTo(-0.75, -1);

  const counter = new Shape();
  counter.moveTo(-0.4, -0.64);
  counter.lineTo(-0.4, 0.64);
  counter.lineTo(0, 0.64);
  counter.absarc(0, 0, 0.64, Math.PI / 2, -Math.PI / 2, true);
  counter.lineTo(-0.4, -0.64);
  outer.holes.push(counter);

  const geometry = new ExtrudeGeometry(outer, {
    depth: 0.75,
    curveSegments: 64,
    bevelEnabled: true,
    // One segment = a flat chamfer: crisp facet edges that catch the rainbow,
    // instead of a rounded, "inflated" bevel.
    bevelThickness: 0.1,
    bevelSize: 0.07,
    bevelSegments: 1,
  });
  geometry.center();
  return geometry;
}

