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
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  TextureLoader,
  Vector2,
  VideoTexture,
  WebGLRenderer,
} from 'three';
import { QUAD_VERT, ROOM_CHUNK } from './room';

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
uniform vec2 uRes; uniform float uTurn; uniform float uTime; uniform vec3 uGlowColor; uniform float uLift;
varying vec2 vUv;
${ROOM_CHUNK}
void main() {
  float aspect = uRes.x / uRes.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) * 1.1;
  vec2 g = cylinderWall(p) * vec2(6.5, 6.5) + vec2(uTurn, uTime * 0.01);
  float major = gridLines(g, 0.25);
  float minor = gridLines(g * 5.0, 0.0);
  vec2 q = (vUv - vec2(0.5, 0.5 + uLift)) * vec2(aspect, 1.0);
  float glow = exp(-dot(q, q) * 2.6);
  vec3 col = vec3(0.010, 0.009, 0.020) + uGlowColor * glow * 0.16;
  col += (major * 0.3 + minor * 0.045) * (vec3(0.055, 0.05, 0.09) + uGlowColor * glow * 0.5);
  vec2 v = vUv - 0.5;
  col *= 1.0 - dot(v, v) * 1.1;
  gl_FragColor = vec4(col, 1.0);
}`;

const CARD_VERT = /* glsl */ `
uniform float uAngle; uniform float uRadius; uniform vec2 uSize; uniform float uFocus;
uniform float uVelocity; uniform float uLift;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec2 local = position.xy * uSize * mix(0.84, 1.0, uFocus);
  // Wrap the plane onto the cylinder wall; scroll speed bulges it toward the camera.
  float a = uAngle + local.x / uRadius;
  float r = uRadius - sin(uv.x * 3.14159) * abs(uVelocity) * 0.35;
  vec3 p = vec3(sin(a) * r, local.y + uLift, -cos(a) * r);
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
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
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
      },
    });
    const quadGeo = new PlaneGeometry(2, 2);
    const roomQuad = new Mesh(quadGeo, roomMat);
    roomQuad.frustumCulled = false;
    const roomScene = new Scene().add(roomQuad);
    const quadCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

    /* cards */
    const scene = new Scene();
    const camera = new PerspectiveCamera(FOV, 1, 0.1, 50);
    const cardGeo = new PlaneGeometry(1, 1, 48, 1);
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

      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(roomScene, quadCam);
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
