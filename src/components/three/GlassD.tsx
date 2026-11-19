'use client';

/**
 * Hero scene: a glass "D" floating in a curved grid room.
 *
 * Everything runs in ONE WebGL context (counts as one slot in the GL budget):
 *
 *  1. Fluid sim (low-res, ping-pong half-float targets): the cursor and the scroll
 *     push velocity into it. Classic stable-fluids loop:
 *     advect → splat → divergence → pressure (Jacobi) → subtract gradient.
 *  2. Background pass → `bgTarget`: a grid on the inside of a cylinder plus a violet
 *     glow. Its UVs are displaced by the fluid velocity with a per-channel offset,
 *     which gives the smeared, chromatic "not quite ripples" trail.
 *  3. Screen: copy `bgTarget`, then draw the extruded D. The glass shader samples
 *     `bgTarget` at its own screen position, bent by the surface normal and
 *     magnified toward the letter's centre (reads as thick glass), with R/G/B
 *     sampled at slightly different offsets (dispersion), plus fresnel rim and
 *     two fake specular lights. No env map, no transmission pass: cheap.
 *
 * The D rotates toward the cursor (eased, so it feels heavy) and turns further as
 * the hero scrolls away. `paused` stops the loop; unmount frees the context.
 */
import { useEffect, useRef } from 'react';
import {
  ExtrudeGeometry,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  Shape,
  ShaderMaterial,
  Vector2,
  Vector3,
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
varying vec2 vUv;

${ROOM_CHUNK}

vec3 room(vec2 uv) {
  float aspect = uRes.x / uRes.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 1.15;
  vec2 wall = cylinderWall(p);
  vec2 g = wall * 6.5 + vec2(uTime * 0.02, uScroll * 4.0);
  float major = gridLines(g, 0.25);
  float minor = gridLines(g * 5.0, 0.0);

  vec2 q = (uv - uGlow) * vec2(aspect, 1.0);
  float glow = exp(-dot(q, q) * 9.0) * (1.0 - 0.55 * clamp(uScroll, 0.0, 1.0));
  float breathe = 0.85 + 0.15 * sin(uTime * 0.35);
  vec2 q2 = (uv - vec2(0.18, 0.15)) * vec2(aspect, 1.0);
  float low = exp(-dot(q2, q2) * 2.5);
  float halo = exp(-dot(q, q) * 1.8);

  vec3 violet = vec3(0.34, 0.19, 0.95);
  vec3 col = vec3(0.010, 0.009, 0.020);
  col += violet * (glow * 0.42 * breathe + halo * 0.07) + vec3(0.03, 0.05, 0.22) * low * 0.18;
  col += (major * 0.32 + minor * 0.05) * (vec3(0.055, 0.05, 0.09) + violet * (glow * 0.9 + halo * 0.25));
  return col;
}

void main() {
  vec2 v = texture2D(uVel, vUv).xy;
  vec2 off = v * 0.00045;
  float speed = length(off);
  vec3 col = vec3(room(vUv - off).r, room(vUv - off * 1.6).g, room(vUv - off * 2.3).b);
  // Thin iridescent sheen where the fluid is moving fast.
  vec3 hue = 0.5 + 0.5 * cos(6.2831 * (atan(v.y, v.x) / 6.2831 + vec3(0.0, 0.33, 0.67)));
  col += hue * smoothstep(0.0, 0.04, speed) * 0.06;
  vec2 vig = vUv - 0.5;
  col *= 1.0 - dot(vig, vig) * 0.9;
  // Built-in scrim: darker toward the bottom (under the name) so text keeps full contrast
  // and the section dissolves into About without a seam.
  col *= mix(0.25, 1.0, smoothstep(0.08, 0.6, vUv.y));
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
void main() {
  vec2 suv = gl_FragCoord.xy / uRes;
  vec3 n = normalize(vNormal);
  vec3 V = normalize(-vViewPos);
  float facing = max(dot(n, V), 0.0);
  float fres = pow(1.0 - facing, 3.0);

  // Thick-glass look: magnify toward the centre, bend by the normal, follow the fluid.
  vec2 lens = uCenter + (suv - uCenter) * 0.7;
  // Slow internal wobble so the flat faces still distort what is behind them.
  vec2 wobble = vec2(sin(vViewPos.y * 7.0 + uTime * 0.6), cos(vViewPos.x * 6.0 - uTime * 0.5)) * 0.012;
  vec2 bend = n.xy * 0.12 + wobble + texture2D(uVel, suv).xy * 0.0003;
  vec3 bg = vec3(
    texture2D(uBg, lens - bend).r,
    texture2D(uBg, lens - bend * 1.4).g,
    texture2D(uBg, lens - bend * 1.9).b
  );
  vec3 col = bg * 1.05 + vec3(0.012, 0.01, 0.03);
  // Soft diagonal reflection band that slides across the faces as the D turns.
  float band = vObj.x * 0.62 + vObj.y * 0.78 - n.x * 1.6 - n.y * 0.6;
  col += exp(-pow(band * 3.2 - 0.4, 2.0)) * vec3(0.16, 0.15, 0.24) * (0.4 + 0.6 * facing);
  col += exp(-pow(band * 9.0 + 3.2, 2.0)) * vec3(0.10, 0.10, 0.16);

  vec3 R = reflect(-V, n);
  float spec = pow(max(dot(R, normalize(vec3(-0.6, 0.75, 0.55))), 0.0), 48.0) * 1.1
             + pow(max(dot(R, normalize(vec3(0.85, -0.25, 0.45))), 0.0), 16.0) * 0.28;
  col += spec * vec3(0.96, 0.94, 1.0);
  col += fres * vec3(0.62, 0.52, 1.0) * 1.1;
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
    depth: 0.42,
    curveSegments: 56,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.09,
    bevelSegments: 10,
  });
  geometry.center();
  return geometry;
}

/* ------------------------------------------------------------- component */

const SIM_SIZE = 128; // fluid grid along the short side
const PRESSURE_ITERATIONS = 14;

export default function GlassD({ paused = false, dpr = 1.25, interactive = true }: Props) {
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, dpr));
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
    let simAspect = 1;

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

    /* background + screen */
    const bgTarget = new WebGLRenderTarget(1, 1, { minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
    const res = new Vector2();
    const glowCenter = new Vector2(0.62, 0.55);
    const bgMat = mat(BACKGROUND, {
      uVel: { value: null },
      uRes: { value: res },
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uGlow: { value: glowCenter },
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
        uCenter: { value: glowCenter },
        uTime: { value: 0 },
      },
    });
    const glass = new Mesh(glassGeo, glassMat);
    scene.add(glass);
    const home = new Vector3();
    let baseScale = 1;
    const projected = new Vector3();

    /* sizing */
    const resize = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      renderer.setSize(w, h, false);
      const buf = renderer.getDrawingBufferSize(new Vector2());
      res.copy(buf);
      bgTarget.setSize(buf.x, buf.y);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      simAspect = w / h;
      const sw = Math.round(simAspect >= 1 ? SIM_SIZE * simAspect : SIM_SIZE);
      const sh = Math.round(simAspect >= 1 ? SIM_SIZE : SIM_SIZE / simAspect);
      [...vel, ...pressure, divergence].forEach((t) => t.setSize(sw, sh));
      simTexel.set(1 / sw, 1 / sh);
      splat.uniforms.uAspect.value = simAspect;

      // Layout: right of centre on landscape screens, centred and smaller on portrait.
      const halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
      const halfW = halfH * camera.aspect;
      if (camera.aspect >= 1) {
        home.set(halfW * 0.36, halfH * 0.12, 0);
        baseScale = Math.min(1.05, halfW * 0.34);
      } else {
        home.set(0, halfH * 0.28, 0);
        baseScale = halfW * 0.5;
      }
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    /* input */
    const pointer = { x: 0.5, y: 0.5, nx: 0, ny: 0, moved: false };
    const last = new Vector2(0.5, 0.5);
    let lastMove = 0;
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const r = canvas.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) / r.width;
      pointer.y = 1 - (e.clientY - r.top) / r.height;
      pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ny = (e.clientY / window.innerHeight) * 2 - 1;
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
    const rot = { x: 0, y: 0 };
    let firstFrame = true;

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
        const cap = 2600;
        const s = m > cap ? cap / m : 1;
        addForce(pointer.x, pointer.y, fx * s, fy * s);
        pointer.moved = false;
      } else if (now - lastMove > 2500) {
        // Idle: a slow drifting stir so the room never looks frozen.
        const ax = 0.5 + 0.32 * Math.sin(time * 0.31);
        const ay = 0.5 + 0.22 * Math.sin(time * 0.47 + 1.3);
        addForce(ax, ay, Math.cos(time * 0.31) * 60, Math.cos(time * 0.47 + 1.3) * 60);
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

      // 2. the D: ease toward the cursor, turn further with scroll
      const scroll = Math.min(1.5, sy / window.innerHeight);
      const ease = 1 - Math.exp(-dt * 2.6);
      const targetY = pointer.nx * 0.55 + Math.sin(time * 0.35) * 0.18 + scroll * 1.6;
      const targetX = pointer.ny * 0.35 + Math.sin(time * 0.27 + 1) * 0.08 + scroll * 0.35;
      rot.y += (targetY - rot.y) * ease;
      rot.x += (targetX - rot.x) * ease;
      glass.rotation.set(rot.x, rot.y - 0.25, Math.sin(time * 0.2) * 0.04);
      glass.position.set(home.x, home.y + scroll * 0.9 + Math.sin(time * 0.6) * 0.04, home.z);
      glass.scale.setScalar(baseScale * (1 - scroll * 0.15));
      glass.updateMatrixWorld();
      projected.setFromMatrixPosition(glass.matrixWorld).project(camera);
      glowCenter.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5);

      // 3. background → target, copy to screen, glass on top
      bgMat.uniforms.uVel.value = vel[0].texture;
      bgMat.uniforms.uTime.value = time;
      bgMat.uniforms.uScroll.value = scroll;
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
      startRef.current = null;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointer);
      [...vel, ...pressure, divergence, bgTarget].forEach((t) => t.dispose());
      [advect, splat, divMat, pressureMat, gradMat, bgMat, copyMat, glassMat].forEach((m) => m.dispose());
      quadGeo.dispose();
      glassGeo.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [dpr, interactive]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
