/**
 * The glass D, shared by the hero (GlassD) and the projects reel (CurvedReel).
 *
 *   createD()     extruded, bevelled "D" (stem + half-disc bowl, matching counter);
 *                 the same outline as the static SVG D and the outline D.
 *   GLASS_VERT/FRAG
 *                 refractive glass that samples a texture of whatever is BEHIND it
 *                 (uBg, in screen space): magnified toward the centre (uCenter), bent
 *                 by a noise-perturbed "liquid" normal, frosted in drifting patches,
 *                 slight R/G/B dispersion, inner glow, thin-film rim colour, fresnel
 *                 and specular. uVel (fluid velocity) adds extra bend; pass a black
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

export const GLASS_FRAG = /* glsl */ `
uniform sampler2D uBg; uniform sampler2D uVel; uniform vec2 uRes; uniform vec2 uCenter; uniform float uTime; uniform float uAlpha;
varying vec3 vNormal; varying vec3 vViewPos; varying vec3 vObj;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1); p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
vec3 noiseGrad(vec3 p) {
  const float e = 0.08;
  return vec3(noise(p + vec3(e,0,0)) - noise(p - vec3(e,0,0)),
              noise(p + vec3(0,e,0)) - noise(p - vec3(0,e,0)),
              noise(p + vec3(0,0,e)) - noise(p - vec3(0,0,e))) / (2.0 * e);
}
float rand(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 suv = gl_FragCoord.xy / uRes;
  vec3 n = normalize(vNormal);
  vec3 V = normalize(-vViewPos);

  // Liquid surface: the normal is bent by slowly drifting 3D noise.
  vec3 g = noiseGrad(vObj * 2.4 + vec3(0.0, uTime * 0.12, uTime * 0.08));
  vec3 pn = normalize(n + g * 0.22);
  float fres = pow(1.0 - max(dot(n, V), 0.0), 2.5);

  // Thick-glass refraction: magnify what's behind toward the centre, bend by the
  // perturbed normal, and follow the cursor fluid.
  vec2 lens = uCenter + (suv - uCenter) * 0.78;
  vec2 bend = pn.xy * 0.11 + texture2D(uVel, suv).xy * 0.0004;

  // Frosted patches: where the noise is high, jitter the samples (roughness).
  float rough = smoothstep(0.5, 0.8, noise(vObj * 1.7 + vec3(4.0, 0.0, uTime * 0.05))) * 0.012;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 j = (vec2(rand(suv * 91.7 + fi), rand(suv.yx * 37.3 + fi * 1.7)) - 0.5) * rough;
    acc.r += texture2D(uBg, lens - bend + j).r;
    acc.g += texture2D(uBg, lens - bend * 1.07 + j).g;
    acc.b += texture2D(uBg, lens - bend * 1.14 + j).b;
  }
  vec3 col = acc / 6.0 * 1.1 + vec3(0.01, 0.008, 0.03);

  // Light trapped inside: violet ↔ magenta, drifting.
  float inner = noise(vObj * 1.2 + vec3(0.0, uTime * 0.1, 2.0));
  col += mix(vec3(0.30, 0.14, 0.85), vec3(0.85, 0.25, 0.75), inner) * (0.03 + 0.16 * inner * inner);

  // Thin-film colour at grazing angles, fresnel rim, specular.
  vec3 film = 0.5 + 0.5 * cos(6.2831 * (fres * 1.4 + g.x * 0.15 + vec3(0.0, 0.33, 0.67)));
  col += film * fres * 0.14;
  col += fres * vec3(0.55, 0.48, 1.0) * 0.55;
  vec3 R = reflect(-V, pn);
  col += pow(max(dot(R, normalize(vec3(-0.5, 0.75, 0.6))), 0.0), 60.0) * vec3(1.0, 0.97, 1.0);
  col += pow(max(dot(R, normalize(vec3(0.8, -0.3, 0.5))), 0.0), 20.0) * 0.25;
  gl_FragColor = vec4(col * uAlpha, uAlpha);
}`;


/** A "D" outline (stem + half-disc bowl) with a matching counter, extruded with a bevel. */
export function createD() {
  const outer = new Shape();
  outer.moveTo(-0.75, -1);
  outer.lineTo(-0.75, 1);
  outer.lineTo(0, 1);
  outer.absarc(0, 0, 1, Math.PI / 2, -Math.PI / 2, true);
  outer.lineTo(-0.75, -1);

  const counter = new Shape();
  counter.moveTo(-0.32, -0.56);
  counter.lineTo(-0.32, 0.56);
  counter.lineTo(0, 0.56);
  counter.absarc(0, 0, 0.56, Math.PI / 2, -Math.PI / 2, true);
  counter.lineTo(-0.32, -0.56);
  outer.holes.push(counter);

  const geometry = new ExtrudeGeometry(outer, {
    depth: 0.6,
    curveSegments: 56,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.1,
    bevelSegments: 10,
  });
  geometry.center();
  return geometry;
}

