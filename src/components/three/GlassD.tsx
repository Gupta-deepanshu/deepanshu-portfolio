'use client';

/**
 * Hero scene: a glass "D" floating in front of the name, in a curved grid room.
 *
 * Everything runs in ONE WebGL context (counts as one slot in the GL budget):
 *
 *  1. Fluid sim (low-res, ping-pong half-float targets): the cursor and the scroll
 *     push velocity into it. Classic stable-fluids loop:
 *     advect → splat → divergence → pressure (Jacobi) → subtract gradient.
 *  2. Background pass → `bgTarget`: grid room + violet glow + the NAME. The fluid
 *     velocity offsets the UVs per colour channel, so the cursor leaves a smeared,
 *     chromatic trail through the grid and the letters.
 *  3. Screen: copy `bgTarget`, then draw the extruded D on top. Its shader samples
 *     `bgTarget` behind itself: magnified toward the centre, bent by a noise-
 *     perturbed ("liquid") normal, frosted in drifting patches (jittered multi-
 *     sampling), R/G/B at different offsets, plus an inner glow, thin-film colour
 *     at grazing angles, fresnel rim and specular. No transmission pass or env map.
 *
 * Why the name is drawn in WebGL: the glass has to refract it, and the canvas can't
 * be both behind and in front of HTML. The <h1> stays the source of truth: its
 * letters are measured where the browser laid them out and copied into a texture
 * (same font, same positions), then the <h1> fades to opacity 0 — still in the DOM
 * for screen readers, search and selection. It tracks the <h1> every frame, so the
 * GSAP scroll-out still applies. On unmount the <h1> is shown again.
 */
import { useEffect, useRef } from 'react';
import {
  CanvasTexture,
  ExtrudeGeometry,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  RGBAFormat,
  Scene,
  Shape,
  ShaderMaterial,
  Euler,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
  WebGLRenderTarget,
  type IUniform,
} from 'three';
import { QUAD_VERT, ROOM_CHUNK } from './room';

interface Props {
  paused?: boolean;
  /** Device-pixel-ratio cap for the canvas. */
  dpr?: number;
  /** Cursor drives rotation + fluid (fine pointers only). */
  interactive?: boolean;
  /** The heading drawn behind the glass (its letters must be `.hero-char` spans). */
  textSelector?: string;
}

/* ---------------------------------------------------------------- shaders */

const ADVECT = /* glsl */ `
uniform sampler2D uVel; uniform vec2 uTexel; uniform float uDt; uniform float uDiss;
varying vec2 vUv;
void main() {
  vec2 back = vUv - uDt * texture2D(uVel, vUv).xy * uTexel;
  gl_FragColor = vec4(uDiss * texture2D(uVel, back).xy, 0.0, 1.0);
}`;

const SPLAT = /* glsl */ `
uniform sampler2D uVel; uniform vec2 uPoint; uniform vec2 uForce; uniform float uRadius; uniform float uAspect;
varying vec2 vUv;
void main() {
  vec2 p = vUv - uPoint; p.x *= uAspect;
  gl_FragColor = vec4(texture2D(uVel, vUv).xy + uForce * exp(-dot(p, p) / uRadius), 0.0, 1.0);
}`;

const DIVERGENCE = /* glsl */ `
uniform sampler2D uVel; uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  float l = texture2D(uVel, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture2D(uVel, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture2D(uVel, vUv - vec2(0.0, uTexel.y)).y;
  float t = texture2D(uVel, vUv + vec2(0.0, uTexel.y)).y;
  gl_FragColor = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
}`;

const PRESSURE = /* glsl */ `
uniform sampler2D uP; uniform sampler2D uDiv; uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  float l = texture2D(uP, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture2D(uP, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture2D(uP, vUv - vec2(0.0, uTexel.y)).x;
  float t = texture2D(uP, vUv + vec2(0.0, uTexel.y)).x;
  gl_FragColor = vec4((l + r + b + t - texture2D(uDiv, vUv).x) * 0.25, 0.0, 0.0, 1.0);
}`;

const GRADIENT = /* glsl */ `
uniform sampler2D uP; uniform sampler2D uVel; uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  float l = texture2D(uP, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture2D(uP, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture2D(uP, vUv - vec2(0.0, uTexel.y)).x;
  float t = texture2D(uP, vUv + vec2(0.0, uTexel.y)).x;
  gl_FragColor = vec4(texture2D(uVel, vUv).xy - 0.5 * vec2(r - l, t - b), 0.0, 1.0);
}`;

const BACKGROUND = /* glsl */ `
uniform sampler2D uVel; uniform vec2 uRes; uniform float uTime; uniform float uScroll; uniform vec2 uGlow;
uniform sampler2D uText; uniform vec4 uTextRect; uniform float uTextAlpha;
varying vec2 vUv;
${ROOM_CHUNK}

vec3 room(vec2 uv) {
  float aspect = uRes.x / uRes.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 1.15;
  vec2 g = cylinderWall(p) * 6.5 + vec2(uTime * 0.02, uScroll * 4.0);
  float major = gridLines(g, 0.25);
  float minor = gridLines(g * 5.0, 0.0);

  vec2 q = (uv - uGlow) * vec2(aspect, 1.0);
  float glow = exp(-dot(q, q) * 7.0) * (1.0 - 0.55 * clamp(uScroll, 0.0, 1.0));
  float halo = exp(-dot(q, q) * 1.8);
  float breathe = 0.85 + 0.15 * sin(uTime * 0.35);
  vec2 q2 = (uv - vec2(0.18, 0.15)) * vec2(aspect, 1.0);
  float low = exp(-dot(q2, q2) * 2.5);

  vec3 violet = vec3(0.34, 0.19, 0.95);
  vec3 col = vec3(0.010, 0.009, 0.020);
  col += violet * (glow * 0.3 * breathe + halo * 0.07) + vec3(0.03, 0.05, 0.22) * low * 0.18;
  col += (major * 0.32 + minor * 0.05) * (vec3(0.055, 0.05, 0.09) + violet * (glow * 0.9 + halo * 0.25));
  vec2 vig = uv - 0.5;
  col *= 1.0 - dot(vig, vig) * 0.9;
  // Darker toward the bottom so the section dissolves into About without a seam.
  col *= mix(0.25, 1.0, smoothstep(0.08, 0.6, uv.y));
  return col;
}

vec4 text(vec2 uv) {
  vec2 t = (uv - uTextRect.xy) / uTextRect.zw;
  if (t.x < 0.0 || t.y < 0.0 || t.x > 1.0 || t.y > 1.0) return vec4(0.0);
  return texture2D(uText, t) * vec4(1.0, 1.0, 1.0, uTextAlpha);
}

void main() {
  vec2 v = texture2D(uVel, vUv).xy;
  vec2 off = v * 0.0003;
  float speed = length(off);
  vec3 col = vec3(room(vUv - off).r, room(vUv - off * 1.6).g, room(vUv - off * 2.3).b);
  // Thin iridescent sheen where the fluid is moving fast.
  vec3 hue = 0.5 + 0.5 * cos(6.2831 * (atan(v.y, v.x) / 6.2831 + vec3(0.0, 0.33, 0.67)));
  col += hue * smoothstep(0.0, 0.04, speed) * 0.06;
  // The name only drifts a touch with the fluid (no channel split): it must stay readable.
  vec4 t = text(vUv - off * 0.12);
  col = mix(col, t.rgb, t.a);
  gl_FragColor = vec4(col, 1.0);
}`;

const COPY = /* glsl */ `
uniform sampler2D uTex; varying vec2 vUv;
void main() { gl_FragColor = texture2D(uTex, vUv); }`;

const GLASS_VERT = /* glsl */ `
varying vec3 vNormal; varying vec3 vViewPos; varying vec3 vObj;
void main() {
  vObj = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}`;

const GLASS_FRAG = /* glsl */ `
uniform sampler2D uBg; uniform sampler2D uVel; uniform vec2 uRes; uniform vec2 uCenter; uniform float uTime;
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
  gl_FragColor = vec4(col, 1.0);
}`;

/* --------------------------------------------------------------- geometry */

/** A "D" outline (stem + half-disc bowl) with a matching counter, extruded with a bevel. */
function createD() {
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

/* ----------------------------------------------------------- name texture */

interface TextLayer {
  canvas: HTMLCanvasElement;
  /** CSS-px padding around the heading's box inside the texture. */
  pad: number;
}

/**
 * Copy the heading's letters into a 2D canvas, each at the exact box the browser
 * gave its `.hero-char` span. Baseline: CSS centres the font's content area
 * (ascent + descent) inside the line box, so baseline = top + half-leading + ascent.
 */
function drawHeading(h1: HTMLElement, pixelRatio: number, into?: HTMLCanvasElement): TextLayer {
  const box = h1.getBoundingClientRect();
  const pad = Math.round(box.height * 0.1);
  const canvas = into ?? document.createElement('canvas');
  canvas.width = Math.ceil((box.width + pad * 2) * pixelRatio);
  canvas.height = Math.ceil((box.height + pad * 2) * pixelRatio);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cs = getComputedStyle(h1);
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText('Hg');
  const ascent = m.fontBoundingBoxAscent;
  const contentHeight = ascent + m.fontBoundingBoxDescent;
  h1.querySelectorAll<HTMLElement>('.hero-char').forEach((ch) => {
    const r = ch.getBoundingClientRect();
    ctx.fillStyle = getComputedStyle(ch).color;
    ctx.fillText(ch.textContent ?? '', r.left - box.left + pad, r.top - box.top + pad + (r.height - contentHeight) / 2 + ascent);
  });
  return { canvas, pad };
}

/* ------------------------------------------------------------- component */

const SIM_SIZE = 128; // fluid grid along the short side
const PRESSURE_ITERATIONS = 14;

export default function GlassD({ paused = false, dpr = 1.25, interactive = true, textSelector = '[data-hero-name]' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const startRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
    if (!paused) startRef.current?.();
  }, [paused]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // A fresh canvas per mount: a canvas whose context was force-lost can't host a new one
    // (matters for Strict Mode's double effect in dev and for budget re-mounts).
    const canvas = document.createElement('canvas');
    canvas.className = 'block size-full opacity-0 transition-opacity duration-1000 data-[ready]:opacity-100';
    container.appendChild(canvas);

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      canvas.remove();
      return; // no context: the static fallback underneath stays visible
    }
    const pixelRatio = Math.min(window.devicePixelRatio, dpr);
    renderer.setPixelRatio(pixelRatio);
    renderer.autoClear = false;

    /* fullscreen-pass plumbing */
    const quadCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadScene = new Scene();
    const quadGeo = new PlaneGeometry(2, 2);
    const quad = new Mesh(quadGeo);
    quad.frustumCulled = false;
    quadScene.add(quad);
    const run = (material: ShaderMaterial, target: WebGLRenderTarget | null) => {
      quad.material = material;
      renderer.setRenderTarget(target);
      renderer.render(quadScene, quadCam);
    };
    const mat = (fragmentShader: string, uniforms: Record<string, IUniform>) =>
      new ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });

    /* fluid targets */
    const rt = (w: number, h: number) =>
      new WebGLRenderTarget(w, h, {
        type: HalfFloatType,
        format: RGBAFormat,
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        depthBuffer: false,
      });
    let vel = [rt(1, 1), rt(1, 1)];
    let pressure = [rt(1, 1), rt(1, 1)];
    const divergence = rt(1, 1);
    const simTexel = new Vector2();

    const advect = mat(ADVECT, { uVel: { value: null }, uTexel: { value: simTexel }, uDt: { value: 0 }, uDiss: { value: 1 } });
    const splat = mat(SPLAT, {
      uVel: { value: null },
      uPoint: { value: new Vector2() },
      uForce: { value: new Vector2() },
      uRadius: { value: 0.0022 },
      uAspect: { value: 1 },
    });
    const divMat = mat(DIVERGENCE, { uVel: { value: null }, uTexel: { value: simTexel } });
    const pressureMat = mat(PRESSURE, { uP: { value: null }, uDiv: { value: divergence.texture }, uTexel: { value: simTexel } });
    const gradMat = mat(GRADIENT, { uP: { value: null }, uVel: { value: null }, uTexel: { value: simTexel } });

    /* name texture (filled once the heading has finished its entrance) */
    const textCanvas = document.createElement('canvas');
    textCanvas.width = textCanvas.height = 1;
    const textTexture = new CanvasTexture(textCanvas);
    textTexture.minFilter = LinearFilter;
    textTexture.generateMipmaps = false;
    const textRect = new Vector4(0, 0, 1, 1);
    let textPad = 0;
    let textReady = false;
    let textAlpha = 0;

    /* background + screen */
    const bgTarget = new WebGLRenderTarget(1, 1, { minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
    const res = new Vector2();
    const center = new Vector2(0.5, 0.55);
    const bgMat = mat(BACKGROUND, {
      uVel: { value: null },
      uRes: { value: res },
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uGlow: { value: center },
      uText: { value: textTexture },
      uTextRect: { value: textRect },
      uTextAlpha: { value: 0 },
    });
    const copyMat = mat(COPY, { uTex: { value: bgTarget.texture } });

    /* the D */
    const scene = new Scene();
    const camera = new PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 0, 6);
    const glassGeo = createD();
    const glassMat = new ShaderMaterial({
      vertexShader: GLASS_VERT,
      fragmentShader: GLASS_FRAG,
      uniforms: {
        uBg: { value: bgTarget.texture },
        uVel: { value: null },
        uRes: { value: res },
        uCenter: { value: center },
        uTime: { value: 0 },
      },
    });
    const glass = new Mesh(glassGeo, glassMat);
    scene.add(glass);
    let halfW = 1;
    let halfH = 1;

    /* sizing */
    const resize = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      renderer.setSize(w, h, false);
      renderer.getDrawingBufferSize(res);
      bgTarget.setSize(res.x, res.y);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
      halfW = halfH * camera.aspect;

      const aspect = w / h;
      const sw = Math.round(aspect >= 1 ? SIM_SIZE * aspect : SIM_SIZE);
      const sh = Math.round(aspect >= 1 ? SIM_SIZE : SIM_SIZE / aspect);
      [...vel, ...pressure, divergence].forEach((t) => t.setSize(sw, sh));
      simTexel.set(1 / sw, 1 / sh);
      splat.uniforms.uAspect.value = aspect;
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    /* the heading: wait for fonts + its letter entrance, then copy it in */
    const h1 = document.querySelector<HTMLElement>(textSelector);
    const scroller = h1?.closest<HTMLElement>('[data-hero-content]') ?? null;
    let disposed = false;
    const paintText = () => {
      if (!h1 || disposed) return;
      textPad = drawHeading(h1, pixelRatio, textCanvas).pad;
      textTexture.dispose(); // canvas size may change: re-allocate on next upload
      textTexture.needsUpdate = true;
      textReady = true;
    };
    const headingObserver = new ResizeObserver(() => textReady && paintText());
    if (h1) {
      const entrance = h1.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined));
      Promise.all([document.fonts.ready, ...entrance]).then(() => {
        paintText();
        headingObserver.observe(h1);
      });
    }

    /* input */
    const pointer = { x: 0.5, y: 0.5, px: 0, py: 0, dx: 0, dy: 0, moved: false };
    const last = new Vector2(0.5, 0.5);
    let lastMove = 0;
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const r = canvas.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) / r.width;
      pointer.y = 1 - (e.clientY - r.top) / r.height;
      if (lastMove) {
        pointer.dx += (e.clientX - pointer.px) / window.innerWidth;
        pointer.dy += (e.clientY - pointer.py) / window.innerHeight;
      }
      pointer.px = e.clientX;
      pointer.py = e.clientY;
      pointer.moved = true;
      lastMove = performance.now();
    };
    if (interactive) window.addEventListener('pointermove', onPointer, { passive: true });
    let lastScroll = window.scrollY;

    const addForce = (x: number, y: number, fx: number, fy: number) => {
      splat.uniforms.uVel.value = vel[0].texture;
      splat.uniforms.uPoint.value.set(x, y);
      splat.uniforms.uForce.value.set(fx, fy);
      run(splat, vel[1]);
      vel = [vel[1], vel[0]];
    };

    /* loop */
    let raf = 0;
    let prev = performance.now();
    let time = 0;
    // Free rotation with momentum: cursor movement adds angular velocity (world axes),
    // friction slows it, and after a pause it eases back to face the viewer.
    const spin = new Quaternion();
    const omega = new Vector3();
    const step = new Quaternion();
    const axis = new Vector3();
    const rest = new Quaternion();
    const restEuler = new Euler();
    let lastInput = 0;
    let firstFrame = true;
    const target = { x: 0, y: 0.15, scale: 1 };

    const frame = (now: number) => {
      raf = 0;
      if (pausedRef.current) return;
      const dt = Math.min((now - prev) / 1000, 1 / 30);
      prev = now;
      time += dt;
      const sw = 1 / simTexel.x;

      // 1. fluid
      advect.uniforms.uVel.value = vel[0].texture;
      advect.uniforms.uDt.value = dt;
      advect.uniforms.uDiss.value = Math.exp(-dt * 1.1);
      run(advect, vel[1]);
      vel = [vel[1], vel[0]];

      if (pointer.moved) {
        const k = Math.min(1, dt * 60);
        const fx = ((pointer.x - last.x) / Math.max(dt, 1e-3)) * sw * 0.55 * k;
        const fy = ((pointer.y - last.y) / Math.max(dt, 1e-3)) * sw * 0.55 * k;
        const m = Math.hypot(fx, fy);
        const s = m > 2600 ? 2600 / m : 1;
        addForce(pointer.x, pointer.y, fx * s, fy * s);
        pointer.moved = false;
      } else if (now - lastMove > 2500) {
        // Idle: a slow drifting stir so the room never looks frozen.
        const ax = 0.5 + 0.32 * Math.sin(time * 0.31);
        const ay = 0.5 + 0.22 * Math.sin(time * 0.47 + 1.3);
        addForce(ax, ay, Math.cos(time * 0.31) * 25, Math.cos(time * 0.47 + 1.3) * 25);
      }
      last.set(pointer.x, pointer.y);

      // Scroll pushes the field vertically under the cursor: the room "drags" with the page.
      const sy = window.scrollY;
      const dScroll = sy - lastScroll;
      lastScroll = sy;
      if (dScroll !== 0) {
        const f = Math.max(-1800, Math.min(1800, (dScroll / Math.max(dt, 1e-3)) * 0.35));
        addForce(pointer.x, pointer.y, 0, f);
      }

      divMat.uniforms.uVel.value = vel[0].texture;
      run(divMat, divergence);
      for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
        pressureMat.uniforms.uP.value = pressure[0].texture;
        run(pressureMat, pressure[1]);
        pressure = [pressure[1], pressure[0]];
      }
      gradMat.uniforms.uP.value = pressure[0].texture;
      gradMat.uniforms.uVel.value = vel[0].texture;
      run(gradMat, vel[1]);
      vel = [vel[1], vel[0]];

      // 2. follow the heading (two layout reads per frame, no writes in between)
      const c = canvas.getBoundingClientRect();
      if (h1) {
        const b = h1.getBoundingClientRect();
        if (textReady) {
          textRect.set(
            (b.left - textPad - c.left) / c.width,
            1 - (b.bottom + textPad - c.top) / c.height,
            (b.width + textPad * 2) / c.width,
            (b.height + textPad * 2) / c.height,
          );
        }
        // The D sits on the heading's centre, ~2/3 of the viewport tall (like alche's A).
        const cx = ((b.left + b.width / 2 - c.left) / c.width) * 2 - 1;
        const cy = 1 - ((b.top + b.height / 2 - c.top) / c.height) * 2;
        target.x = cx * halfW;
        target.y = cy * halfH;
        const px = Math.min(window.innerHeight * 0.62, b.width * 0.55);
        target.scale = ((px / c.height) * 2 * halfH) / 2.3; // geometry is ~2.3 tall with bevel
      }
      const opacity = scroller ? parseFloat(scroller.style.opacity || '1') : 1;
      if (textReady) textAlpha = Math.min(1, textAlpha + dt / 0.6);

      // 3. the D: spin with momentum
      const scroll = Math.min(1.5, sy / window.innerHeight);
      if (pointer.dx || pointer.dy) {
        // Horizontal drag turns it about Y, vertical about X (a trackball flick).
        omega.y += pointer.dx * 16;
        omega.x += pointer.dy * 16;
        pointer.dx = pointer.dy = 0;
        lastInput = now;
      }
      if (dScroll !== 0) {
        omega.y += (dScroll / window.innerHeight) * 5;
        lastInput = now;
      }
      omega.clampLength(0, 14);
      omega.multiplyScalar(Math.exp(-dt * 1.4));
      const w = omega.length();
      if (w > 1e-4) {
        step.setFromAxisAngle(axis.copy(omega).divideScalar(w), w * dt);
        spin.premultiply(step).normalize();
      }
      if (now - lastInput > 2500) {
        // Settle back to facing forward with a gentle idle sway.
        rest.setFromEuler(restEuler.set(Math.sin(time * 0.27 + 1) * 0.12, Math.sin(time * 0.35) * 0.3, Math.sin(time * 0.2) * 0.05));
        spin.slerp(rest, 1 - Math.exp(-dt * 0.9));
      }
      glass.quaternion.copy(spin);
      glass.position.set(target.x, target.y + Math.sin(time * 0.6) * 0.04, 0.4);
      glass.scale.setScalar(target.scale * (1 - scroll * 0.15));
      center.set((target.x / halfW) * 0.5 + 0.5, (target.y / halfH) * 0.5 + 0.5);

      // 4. background → target, copy to screen, glass on top
      bgMat.uniforms.uVel.value = vel[0].texture;
      bgMat.uniforms.uTime.value = time;
      bgMat.uniforms.uScroll.value = scroll;
      bgMat.uniforms.uTextAlpha.value = textAlpha * opacity;
      run(bgMat, bgTarget);
      renderer.setRenderTarget(null);
      renderer.clear();
      run(copyMat, null);
      glassMat.uniforms.uVel.value = vel[0].texture;
      glassMat.uniforms.uTime.value = time;
      renderer.render(scene, camera);

      if (firstFrame) {
        firstFrame = false;
        canvas.dataset.ready = '';
      }
      // Once the WebGL copy of the name is in, fade the HTML one (still in the DOM).
      if (h1 && textReady && textAlpha > 0 && !('glText' in h1.dataset)) h1.dataset.glText = '';
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf) return;
      prev = performance.now();
      raf = requestAnimationFrame(frame);
    };
    startRef.current = start;
    if (!pausedRef.current) start();

    return () => {
      disposed = true;
      startRef.current = null;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      headingObserver.disconnect();
      window.removeEventListener('pointermove', onPointer);
      if (h1) delete h1.dataset.glText;
      [...vel, ...pressure, divergence, bgTarget].forEach((t) => t.dispose());
      [advect, splat, divMat, pressureMat, gradMat, bgMat, copyMat, glassMat].forEach((m) => m.dispose());
      textTexture.dispose();
      quadGeo.dispose();
      glassGeo.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [dpr, interactive, textSelector]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
