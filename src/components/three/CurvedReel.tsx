'use client';

/**
 * Projects reel: the camera stands at the centre of a cylindrical grid room and the
 * project posters hang on its inner wall. Scroll progress (from the pinned
 * ScrollTrigger in PinnedGallery) turns the room, so the active project is large
 * and centred while its neighbours peek in, bent around the wall, at the edges.
 *
 * Same contract as the Circular Gallery it replaces:
 *   - imperative `setProgress(0..1)`; the component eases toward it,
 *   - `activeIndex` decides which card may play its (muted, looped) video,
 *   - `paused` stops the render loop and the video; unmount frees the context,
 *   - `onError` if WebGL can't start (parent falls back to the HTML carousel).
 *
 * Scroll *speed* is part of the look: the eased velocity bulges the cards toward
 * the camera and splits their RGB channels, then settles when scrolling stops.
 * Cards out of focus shrink a little and dim; the glow behind the reel takes the
 * active project's accent colour.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
  Color,
  DataTexture,
  Euler,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  ShaderMaterial,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  VideoTexture,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { QUAD_VERT, ROOM_CHUNK } from './room';
import { createD, GLASS_FRAG, GLASS_VERT } from './glass';

export interface ReelItem {
  image: string;
  video?: { src: string; type: string }[];
  /** Accent used for the glow and while the poster loads. */
  accent: string;
}

export interface CurvedReelHandle {
  /** 0 = first item centred, 1 = last item centred. */
  setProgress: (progress: number) => void;
}

interface Props {
  items: ReelItem[];
  activeIndex: number;
  paused?: boolean;
  dpr?: number;
  onError?: () => void;
}

/* ---------------------------------------------------------------- shaders */

const ROOM_FRAG = /* glsl */ `
uniform vec2 uRes; uniform float uTurn; uniform float uTime; uniform vec3 uGlowColor; uniform float uLift; uniform float uTilt;
varying vec2 vUv;
${ROOM_CHUNK}
void main() {
  float aspect = uRes.x / uRes.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) * 1.1;
  // Into the ring's tilted frame, then onto a sphere around the camera (longitude,
  // latitude), so the grid curves both ways and turns with the cards.
  float c = cos(uTilt), s = sin(uTilt);
  p = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
  vec2 sphere = vec2(atan(p.x), atan(p.y / sqrt(1.0 + p.x * p.x)));
  vec2 g = sphere * vec2(6.5, 6.5) + vec2(uTurn, uTime * 0.01);
  float major = gridLines(g, 0.25);
  float minor = gridLines(g * 5.0, 0.0);
  vec2 q = (vUv - vec2(0.5, 0.5 + uLift)) * vec2(aspect, 1.0);
  float glow = exp(-dot(q, q) * 2.6);
  // Light only, no base colour: the canvas is transparent, so the page behind (the
  // black panel with the outline D) shows through. Premultiplied alpha.
  vec3 col = uGlowColor * glow * 0.16;
  col += (major * 0.3 + minor * 0.045) * (vec3(0.055, 0.05, 0.09) + uGlowColor * glow * 0.5);
  vec2 v = vUv - 0.5;
  col *= 1.0 - dot(v, v) * 1.1;
  gl_FragColor = vec4(col, clamp(max(col.r, max(col.g, col.b)) * 1.5, 0.0, 1.0));
}`;

const COPY = /* glsl */ `
uniform sampler2D uTex; varying vec2 vUv;
void main() { gl_FragColor = texture2D(uTex, vUv); }`;

const CARD_VERT = /* glsl */ `
uniform float uAngle; uniform float uRadius; uniform vec2 uSize; uniform float uFocus;
uniform float uVelocity; uniform float uLift; uniform float uTilt;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec2 local = position.xy * uSize * mix(0.84, 1.0, uFocus);
  // Card centre: on a ring around the camera, tilted about the view axis, so the
  // previous card sits up-left and the next down-right and projects travel on a
  // diagonal arc (alche's globe motion). Convert that point to longitude/latitude.
  vec3 dir = vec3(sin(uAngle), 0.0, -cos(uAngle));
  float c = cos(uTilt), s = sin(uTilt);
  dir.xy = vec2(c * dir.x - s * dir.y, s * dir.x + c * dir.y);
  float lat0 = asin(clamp(dir.y, -1.0, 1.0));
  float lon0 = atan(dir.x, -dir.z);
  // Card surface: laid out upright around that centre on the sphere (x → longitude,
  // y → latitude), so cards stay level and curve both ways like panels inside a
  // globe. Scroll speed bulges them toward the camera.
  float lon = lon0 + local.x / (uRadius * cos(lat0));
  float lat = lat0 + local.y / uRadius;
  float r = uRadius - sin(uv.x * 3.14159) * abs(uVelocity) * 0.35;
  vec3 p = vec3(sin(lon) * cos(lat), sin(lat), -cos(lon) * cos(lat)) * r;
  p.y += uLift;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const CARD_FRAG = /* glsl */ `
uniform sampler2D uTex; uniform float uTexAspect; uniform float uCardAspect; uniform float uReady;
uniform float uFocus; uniform float uVelocity; uniform vec3 uAccent;
varying vec2 vUv;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  // object-fit: cover
  float k = uCardAspect / uTexAspect;
  vec2 s = k > 1.0 ? vec2(1.0, 1.0 / k) : vec2(k, 1.0);
  vec2 uv = (vUv - 0.5) * s + 0.5;

  float split = 0.0005 + abs(uVelocity) * 0.018;
  vec3 tex = vec3(
    texture2D(uTex, uv + vec2(split, 0.0)).r,
    texture2D(uTex, uv).g,
    texture2D(uTex, uv - vec2(split, 0.0)).b
  );
  vec3 col = mix(uAccent * 0.25, tex, uReady);
  col *= mix(0.32, 1.0, uFocus);

  vec2 p = (vUv - 0.5) * vec2(uCardAspect, 1.0);
  float d = roundedBox(p, vec2(uCardAspect, 1.0) * 0.5, 0.025);
  float fw = fwidth(d);
  float alpha = 1.0 - smoothstep(-fw, fw, d);
  // Thin glassy rim, brightest on the focused card.
  col += (1.0 - smoothstep(0.0, 0.012, abs(d))) * mix(0.05, 0.22, uFocus);
  gl_FragColor = vec4(col, alpha);
}`;

/* ------------------------------------------------------------- component */

const RADIUS = 5;
const FOV = 38;
/** Ring tilt around the view axis (rad), ~11.5°; negative = next card lower right. */
const TILT = -0.2;

const CurvedReel = forwardRef<CurvedReelHandle, Props>(function CurvedReel(
  { items, activeIndex, paused = false, dpr = 1.5, onError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const target = useRef(0);
  const live = useRef({ paused, activeIndex, onError, start: null as null | (() => void), syncVideo: null as null | (() => void) });

  useImperativeHandle(ref, () => ({
    setProgress: (p) => {
      target.current = Math.min(1, Math.max(0, p));
      live.current.start?.();
    },
  }));

  useEffect(() => {
    live.current.paused = paused;
    live.current.activeIndex = activeIndex;
    live.current.onError = onError;
    live.current.syncVideo?.();
    if (!paused) live.current.start?.();
  }, [paused, activeIndex, onError]);

  useEffect(() => {
    const container = containerRef.current;
    const state = live.current;
    if (!container) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'block size-full opacity-0 transition-opacity duration-700 data-[ready]:opacity-100';
    container.appendChild(canvas);

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
      renderer.setClearColor(0x000000, 0);
    } catch {
      canvas.remove();
      live.current.onError?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, dpr));
    renderer.autoClear = false;
    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    /* room */
    const res = new Vector2();
    const glowColor = new Color('#a594ff');
    const roomMat = new ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: ROOM_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uRes: { value: res },
        uTurn: { value: 0 },
        uTime: { value: 0 },
        uGlowColor: { value: glowColor },
        uLift: { value: 0.06 },
        uTilt: { value: TILT },
      },
    });
    const quadGeo = new PlaneGeometry(2, 2);
    const roomQuad = new Mesh(quadGeo, roomMat);
    roomQuad.frustumCulled = false;
    const roomScene = new Scene().add(roomQuad);
    const quadCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

    /* the glass D behind the reel (alche's A in works): room + posters are drawn to
       bgTarget first, so the glass refracts them; the posters are drawn again on top */
    const bgTarget = new WebGLRenderTarget(1, 1, { minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
    const copyMat = new ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: COPY,
      depthTest: false,
      depthWrite: false,
      uniforms: { uTex: { value: bgTarget.texture } },
    });
    const copyQuad = new Mesh(quadGeo, copyMat);
    copyQuad.frustumCulled = false;
    const copyScene = new Scene().add(copyQuad);
    const noFluid = new DataTexture(new Uint8Array(4), 1, 1);
    noFluid.needsUpdate = true;
    const glassCenter = new Vector2(0.5, 0.5);
    const glassGeo = createD();
    const glassMat = new ShaderMaterial({
      vertexShader: GLASS_VERT,
      fragmentShader: GLASS_FRAG,
      transparent: true,
      premultipliedAlpha: true,
      uniforms: {
        uBg: { value: bgTarget.texture },
        uVel: { value: noFluid },
        uRes: { value: res },
        uCenter: { value: glassCenter },
        uTime: { value: 0 },
        uAlpha: { value: 0 },
      },
    });
    const glass = new Mesh(glassGeo, glassMat);
    const glassScene = new Scene().add(glass);
    const glassEuler = new Euler();
    const glassQuat = new Quaternion();
    const projected = new Vector3();
    let glassAlpha = 0;

    /* cards */
    const scene = new Scene();
    const camera = new PerspectiveCamera(FOV, 1, 0.1, 50);
    const cardGeo = new PlaneGeometry(1, 1, 48, 16);
    const size = new Vector2(3, 1.9);
    const loader = new TextureLoader();
    let step = 0.74;
    const accents = items.map((it) => new Color(it.accent));

    const cards = items.map((item, i) => {
      const material = new ShaderMaterial({
        vertexShader: CARD_VERT,
        fragmentShader: CARD_FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uTex: { value: null as Texture | null },
          uTexAspect: { value: 1.6 },
          uCardAspect: { value: size.x / size.y },
          uReady: { value: 0 },
          uFocus: { value: 0 },
          uVelocity: { value: 0 },
          uAccent: { value: accents[i] },
          uAngle: { value: 0 },
          uRadius: { value: RADIUS },
          uSize: { value: size },
          uLift: { value: 0.32 },
          uTilt: { value: TILT },
        },
      });
      const mesh = new Mesh(cardGeo, material);
      mesh.frustumCulled = false;
      scene.add(mesh);
      const card = { mesh, material, poster: null as Texture | null, readyAt: 0 };
      loader.load(item.image, (tex) => {
        tex.anisotropy = maxAniso;
        tex.minFilter = LinearFilter;
        tex.generateMipmaps = false;
        card.poster = tex;
        material.uniforms.uTex.value = tex;
        material.uniforms.uTexAspect.value = tex.image.width / Math.max(1, tex.image.height);
        card.readyAt = performance.now();
        live.current.start?.();
      });
      return card;
    });

    /* one video, only for the active card */
    let video: { el: HTMLVideoElement; tex: VideoTexture; index: number } | null = null;
    const dropVideo = () => {
      if (!video) return;
      video.el.pause();
      video.el.removeAttribute('src');
      video.el.replaceChildren();
      video.el.load();
      video.tex.dispose();
      const card = cards[video.index];
      if (card) card.material.uniforms.uTex.value = card.poster;
      video = null;
    };
    const syncVideo = () => {
      const { paused: p, activeIndex: i } = live.current;
      const sources = items[i]?.video ?? [];
      if (p || sources.length === 0) return dropVideo();
      if (video?.index === i) return void video.el.play().catch(() => {});
      dropVideo();
      const el = document.createElement('video');
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.preload = 'auto';
      sources.forEach((s) => el.append(Object.assign(document.createElement('source'), { src: s.src, type: s.type })));
      const tex = new VideoTexture(el);
      tex.minFilter = LinearFilter;
      tex.generateMipmaps = false;
      const v = { el, tex, index: i };
      video = v;
      el.addEventListener('loadeddata', () => {
        if (video !== v) return;
        const card = cards[i];
        card.material.uniforms.uTex.value = tex;
        card.material.uniforms.uTexAspect.value = el.videoWidth / Math.max(1, el.videoHeight);
      });
      el.play().catch(() => {});
    };
    live.current.syncVideo = syncVideo;

    /* sizing: the focused card fills ~55% of the width, capped at ~52% of the height */
    const resize = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      renderer.setSize(w, h, false);
      renderer.getDrawingBufferSize(res);
      bgTarget.setSize(res.x, res.y);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const tanV = Math.tan((FOV * Math.PI) / 360);
      const tanH = tanV * camera.aspect;
      const cardAspect = 1.6;
      let cw = 2 * RADIUS * Math.atan(0.55 * tanH);
      const maxH = 2 * RADIUS * 0.52 * tanV;
      if (cw / cardAspect > maxH) cw = maxH * cardAspect;
      size.set(cw, cw / cardAspect);
      step = cw / RADIUS + 0.12;
      cards.forEach((c) => (c.material.uniforms.uCardAspect.value = cardAspect));
      // The D sits further back than the wall the cards hang on and stands ~1.3x as tall
      // as the focused card on screen, so it peeks out above, below and between cards.
      const depth = RADIUS * 1.5;
      glass.position.set(0, 0.32 * 1.5, -depth);
      glass.scale.setScalar((1.3 * size.y * depth) / (RADIUS * 2.3));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    /* subtle parallax toward the cursor */
    const look = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      look.tx = (e.clientX / window.innerWidth) * 2 - 1;
      look.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    /* loop */
    const last = items.length - 1;
    let shown = target.current * last;
    let velocity = 0;
    let time = 0;
    let prev = performance.now();
    let raf = 0;
    let first = true;
    const tmp = new Color();
    const violet = new Color('#a594ff');

    const frame = (now: number) => {
      raf = 0;
      if (live.current.paused) return;
      const dt = Math.min((now - prev) / 1000, 1 / 30);
      prev = now;
      time += dt;

      // Ease the displayed position toward the scroll position (weighty, not bouncy).
      const goal = target.current * last;
      const next = shown + (goal - shown) * (1 - Math.exp(-dt * 7));
      const instant = (next - shown) / Math.max(dt, 1e-3);
      velocity += (Math.max(-6, Math.min(6, instant)) - velocity) * (1 - Math.exp(-dt * 10));
      shown = next;
      const vNorm = Math.max(-1, Math.min(1, velocity / 4));

      look.x += (look.tx - look.x) * (1 - Math.exp(-dt * 3));
      look.y += (look.ty - look.y) * (1 - Math.exp(-dt * 3));
      camera.rotation.set(-look.y * 0.025, -look.x * 0.04, 0);
      camera.updateMatrixWorld();

      const nearest = Math.round(shown);
      // Glow = half site violet, half the active project's accent.
      tmp.copy(accents[Math.max(0, Math.min(last, nearest))]).lerp(violet, 0.5);
      glowColor.lerp(tmp, 1 - Math.exp(-dt * 3));

      cards.forEach((card, i) => {
        const offset = i - shown;
        const u = card.material.uniforms;
        u.uAngle.value = offset * step;
        u.uFocus.value = Math.max(0, 1 - Math.abs(offset));
        u.uVelocity.value = vNorm;
        if (card.readyAt) u.uReady.value = Math.min(1, (now - card.readyAt) / 600);
        card.mesh.visible = Math.abs(offset) < 2.5;
      });

      roomMat.uniforms.uTurn.value = -shown * step * 6.5;
      roomMat.uniforms.uTime.value = time;

      // The D turns as you move through the projects, drifts on its own, leans with the
      // cursor and tips with scroll speed.
      glassEuler.set(
        Math.sin(time * 0.3) * 0.15 + look.y * 0.25 + vNorm * 0.35,
        shown * 1.1 + time * 0.15 + look.x * 0.4,
        Math.sin(time * 0.2) * 0.06,
      );
      glass.quaternion.slerp(glassQuat.setFromEuler(glassEuler), 1 - Math.exp(-dt * 4));
      glass.updateMatrixWorld();
      projected.setFromMatrixPosition(glass.matrixWorld).project(camera);
      glassCenter.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5);
      glassAlpha = Math.min(1, glassAlpha + dt / 1.2);
      glassMat.uniforms.uAlpha.value = glassAlpha;
      glassMat.uniforms.uTime.value = time;

      // room + posters → bgTarget; copy; glass (refracting it); posters again on top
      renderer.setRenderTarget(bgTarget);
      renderer.clear();
      renderer.render(roomScene, quadCam);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(copyScene, quadCam);
      renderer.clearDepth();
      renderer.render(glassScene, camera);
      renderer.render(scene, camera);

      if (first) {
        first = false;
        canvas.dataset.ready = '';
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf || live.current.paused) return;
      prev = performance.now();
      raf = requestAnimationFrame(frame);
    };
    live.current.start = start;
    syncVideo();
    start();

    return () => {
      state.start = null;
      state.syncVideo = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      dropVideo();
      cards.forEach((c) => {
        c.poster?.dispose();
        c.material.dispose();
      });
      cardGeo.dispose();
      glassGeo.dispose();
      glassMat.dispose();
      copyMat.dispose();
      bgTarget.dispose();
      noFluid.dispose();
      quadGeo.dispose();
      roomMat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [items, dpr]);

  return <div ref={containerRef} className="absolute inset-0" />;
});

export default CurvedReel;
