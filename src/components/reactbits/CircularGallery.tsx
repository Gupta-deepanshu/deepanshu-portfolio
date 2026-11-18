'use client';

/**
 * Vendored from React Bits (CircularGallery-TS-TW), MIT + Commons Clause, and adapted
 * for the portfolio's pinned projects section. `git log -p` on this file shows the
 * original. Changes, and why:
 *
 * 1. Input removed. The original captured `wheel` with preventDefault (which fights
 *    Lenis and page scrolling), plus pointer drag and its own arrow-key handling.
 *    The gallery is now display-only: rotation comes from `setProgress(p)`, which the
 *    parent calls from a pinned, scrubbed ScrollTrigger. Keyboard and buttons live
 *    in the HTML overlay and move the *page* scroll, so scroll stays the single
 *    source of truth.
 * 2. No text in the canvas. The DOM title labels, caption, close button, open/zoom
 *    state and the Google Fonts request were removed; all text, links and the 1/6
 *    counter are real HTML in the overlay (accessible, selectable, indexable). The
 *    whole gallery is aria-hidden.
 * 3. Video textures. Items can carry muted loop sources; only the active card plays,
 *    and frames are uploaded to one shared texture only while it is playing.
 * 4. WebGL budget. A `paused` prop stops the render loop (and the video) without
 *    losing the context; unmounting releases the context. `onError` reports a failed
 *    context or a context loss so the parent can fall back to the HTML carousel.
 * 5. No picsum fallback (no third-party requests); hover/auto-scroll/keyboard-ring
 *    state removed as they no longer apply.
 *
 * Kept from the original: the curved layout (`bend`), inertia (`scrollEase`), the
 * velocity-driven wave, edge fades, shadows, texture fade-in and the intro.
 */
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, type CSSProperties } from 'react';

export type GalleryItem = {
  image: string;
  video?: { src: string; type: string }[];
};

export interface CircularGalleryHandle {
  /** 0 = first item centred, 1 = last item centred. */
  setProgress: (progress: number) => void;
}

export interface CircularGalleryProps {
  items: GalleryItem[];
  /** Index whose video (if any) should play. */
  activeIndex?: number;
  paused?: boolean;
  bend?: number;
  borderRadius?: number;
  scrollEase?: number;
  itemSize?: number;
  itemAspect?: number;
  gap?: number;
  wave?: number;
  fadeEdges?: number;
  shadow?: number;
  placeholderColor?: string;
  intro?: boolean;
  dpr?: number;
  onError?: () => void;
  className?: string;
  style?: CSSProperties;
}

type Settings = Required<Omit<CircularGalleryProps, 'className' | 'style' | 'dpr' | 'onError'>> & {
  dpr?: number;
  onError?: () => void;
};

type TextureEntry = { texture: WebGLTexture | null; aspect: number; ready: number; loaded: boolean };

type Card = {
  slot: number;
  index: number;
  entry: TextureEntry;
  x: number;
  y: number;
  angle: number;
  w: number;
  h: number;
  radius: number;
  alpha: number;
};

type Program = { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> };

const SEGMENTS_X = 32;
const SEGMENTS_Y = 24;
const INTRO_SECONDS = 1.4;
const WORLD_HEIGHT = 16.57;

const VERTEX = `#version 300 es
in vec2 aPosition;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform vec2 uSize;
uniform float uAngle;
uniform float uPad;
uniform float uWave;
uniform float uWaveTime;
uniform float uFocal;
out vec2 vLocal;
void main() {
  vec2 local = aPosition * (uSize + 2.0 * uPad);
  vec2 unit = local / max(uSize, vec2(1.0));
  float z = uWave * (sin(unit.x * 4.0 + uWaveTime) + cos(unit.y * 2.0 + uWaveTime)) * 0.5;
  float depth = uFocal / max(uFocal - z, 1.0);
  float c = cos(uAngle);
  float s = sin(uAngle);
  vec2 turned = vec2(c * local.x - s * local.y, s * local.x + c * local.y);
  vLocal = local;
  gl_Position = vec4((uCenter + turned * depth) / (uResolution * 0.5), 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uSize;
uniform float uRadius;
uniform float uImageAspect;
uniform float uReady;
uniform vec3 uPlaceholder;
uniform float uAlpha;
uniform float uFade;
uniform float uShadow;
uniform float uBlur;
uniform vec2 uShadowOffset;
in vec2 vLocal;
out vec4 outColor;

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float smoother(float x) {
  x = clamp(x, 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

float edgeFade() {
  if (uFade <= 0.0) return 1.0;
  float u = gl_FragCoord.x / uResolution.x;
  return smoother(u / uFade) * smoother((1.0 - u) / uFade);
}

void main() {
  vec2 extent = uSize * 0.5;
  if (uShadow > 0.0) {
    float d = roundBox(vLocal - uShadowOffset, extent, uRadius);
    float a = uShadow * (1.0 - smoothstep(-uBlur, uBlur, d)) * uAlpha * edgeFade();
    outColor = vec4(0.0, 0.0, 0.0, a);
    return;
  }
  float d = roundBox(vLocal, extent, uRadius);
  float pixel = max(length(vec2(dFdx(d), dFdy(d))), 1e-4);
  float cover = clamp(0.5 - d / pixel, 0.0, 1.0);
  vec2 uv = vLocal / uSize + 0.5;
  float aspect = uSize.x / uSize.y;
  vec2 crop = aspect > uImageAspect ? vec2(1.0, uImageAspect / aspect) : vec2(aspect / uImageAspect, 1.0);
  vec3 image = texture(uTexture, (uv - 0.5) * crop + 0.5).rgb;
  vec3 color = mix(uPlaceholder, image, uReady);
  float body = cover * mix(0.08, 1.0, uReady);
  outColor = vec4(color * body, body) * uAlpha * edgeFade();
}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const ease = (value: number) => value * value * (3 - 2 * value);
const wrap = (value: number, length: number) => ((value % length) + length) % length;

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

const link = (gl: WebGL2RenderingContext): Program | null => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
};

const CircularGallery = forwardRef<CircularGalleryHandle, CircularGalleryProps>(function CircularGallery(
  {
    items,
    activeIndex = 0,
    paused = false,
    bend = 3,
    borderRadius = 0.05,
    scrollEase = 0.08,
    itemSize = 1,
    itemAspect = 1.6,
    gap = 0.26,
    wave = 1,
    fadeEdges = 0.12,
    shadow = 0.25,
    placeholderColor = '#1a1a1f',
    intro = true,
    dpr,
    onError,
    className = '',
    style,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<{ wake: () => void; setProgress: (p: number) => void } | null>(null);
  const pendingProgress = useRef(0);

  const settings: Settings = {
    items,
    activeIndex,
    paused,
    bend,
    borderRadius: clamp(borderRadius, 0, 0.5),
    scrollEase: clamp(scrollEase, 0.001, 1),
    itemSize: clamp(itemSize, 0.2, 2),
    itemAspect: clamp(itemAspect, 0.2, 5),
    gap: Math.max(0, gap),
    wave: Math.max(0, wave),
    fadeEdges: clamp(fadeEdges, 0, 0.5),
    shadow: clamp(shadow, 0, 1),
    placeholderColor,
    intro,
    dpr,
    onError,
  };
  const settingsRef = useRef(settings);
  useLayoutEffect(() => {
    settingsRef.current = settings;
    engineRef.current?.wake();
  });

  useImperativeHandle(ref, () => ({
    setProgress: (p: number) => {
      pendingProgress.current = clamp(p, 0, 1);
      engineRef.current?.setProgress(pendingProgress.current);
    },
  }));

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    });
    const program = gl ? link(gl) : null;
    if (!gl || !program) {
      settingsRef.current.onError?.();
      return undefined;
    }
    const u = program.uniforms;

    const vertices: number[] = [];
    for (let y = 0; y <= SEGMENTS_Y; y++) {
      for (let x = 0; x <= SEGMENTS_X; x++) vertices.push(x / SEGMENTS_X - 0.5, y / SEGMENTS_Y - 0.5);
    }
    const indices: number[] = [];
    for (let y = 0; y < SEGMENTS_Y; y++) {
      for (let x = 0; x < SEGMENTS_X; x++) {
        const a = y * (SEGMENTS_X + 1) + x;
        const b = a + 1;
        const c = a + SEGMENTS_X + 1;
        const d = c + 1;
        indices.push(a, b, d, a, d, c);
      }
    }
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    const anisotropy = gl.getExtension('EXT_texture_filter_anisotropic');
    const blank = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, blank);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const parse = (value: string): number[] => {
      if (!probe) return [0.1, 0.1, 0.12];
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = value;
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
      return [r / 255, g / 255, b / 255];
    };
    const placeholder = parse(settingsRef.current.placeholderColor);

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const textures = new Map<string, TextureEntry>();
    const view = { width: 1, height: 1, ratio: 1 };
    const state = {
      scroll: 0,
      target: 0,
      velocity: 0,
      intro: settingsRef.current.intro && !reduce ? 0 : 1,
      waveTime: 0,
      spacing: 1,
      progress: pendingProgress.current,
    };
    let cards: Card[] = [];
    let raf = 0;
    let last = 0;
    let visible = true;
    let lost = false;

    // [portfolio] one <video> + one texture, used only by the active card
    const video = {
      el: null as HTMLVideoElement | null,
      index: -1,
      texture: null as WebGLTexture | null,
      entry: { texture: null, aspect: 16 / 10, ready: 0, loaded: false } as TextureEntry,
    };

    const upload = (texture: WebGLTexture | null, source: TexImageSource, mip: boolean) => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      if (mip) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (mip && anisotropy) {
        const max = gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        gl.texParameterf(gl.TEXTURE_2D, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
      }
    };

    const textureFor = (url: string): TextureEntry => {
      const existing = textures.get(url);
      if (existing) return existing;
      const entry: TextureEntry = { texture: null, aspect: 1, ready: 0, loaded: false };
      textures.set(url, entry);
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        if (!textures.has(url) || lost) return;
        const texture = gl.createTexture();
        upload(texture, image, true);
        entry.texture = texture;
        entry.aspect = image.naturalWidth / Math.max(1, image.naturalHeight);
        entry.loaded = true;
        wake();
      };
      image.src = url;
      return entry;
    };

    const stopVideo = () => {
      if (!video.el) return;
      video.el.pause();
      video.el.removeAttribute('src');
      video.el.replaceChildren();
      video.el.load();
      video.el = null;
      video.index = -1;
      video.entry.loaded = false;
      video.entry.ready = 0;
    };

    const syncVideo = () => {
      const s = settingsRef.current;
      const sources = s.items[s.activeIndex]?.video ?? [];
      const wanted = !s.paused && visible && !reduce && sources.length > 0 ? s.activeIndex : -1;
      if (wanted === video.index) return;
      stopVideo();
      if (wanted < 0) return;
      const el = document.createElement('video');
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.preload = 'auto';
      sources.forEach(({ src, type }) => {
        const source = document.createElement('source');
        source.src = src;
        source.type = type;
        el.appendChild(source);
      });
      el.addEventListener('loadeddata', () => {
        if (video.el !== el) return;
        video.entry.aspect = el.videoWidth / Math.max(1, el.videoHeight);
        video.entry.loaded = true;
        wake();
      });
      video.el = el;
      video.index = wanted;
      if (!video.texture) video.texture = gl.createTexture();
      video.entry.texture = video.texture;
      el.play().catch(() => stopVideo());
    };

    const measure = () => {
      const s = settingsRef.current;
      const height = 0.6 * view.height * s.itemSize;
      const width = height * s.itemAspect;
      const scale = Math.min(1, (view.width * 0.82) / width);
      return { w: width * scale, h: height * scale, spacing: width * scale * (1 + s.gap) };
    };

    const arcOf = (x: number) => {
      const s = settingsRef.current;
      if (!s.bend) return { y: 0, angle: 0 };
      const depth = (Math.abs(s.bend) * view.height) / WORLD_HEIGHT;
      const half = Math.max(view.width, view.height * 1.9) / 2;
      const radius = (half * half + depth * depth) / (2 * depth);
      const reach = Math.min(Math.abs(x), half, radius * 0.999);
      const arc = radius - Math.sqrt(radius * radius - reach * reach);
      const angle = Math.sign(x) * Math.asin(reach / radius);
      return s.bend > 0 ? { y: -arc, angle: -angle } : { y: arc, angle };
    };

    const targetFor = (progress: number) => progress * (settingsRef.current.items.length - 1) * state.spacing;

    const layout = () => {
      const s = settingsRef.current;
      const count = s.items.length;
      const { w, h, spacing } = measure();
      state.spacing = spacing;
      const introEase = 1 - Math.pow(1 - state.intro, 3);
      const scroll = state.scroll + (1 - introEase) * spacing * 1.6;
      const first = Math.floor((scroll - view.width / 2 - spacing * 2) / spacing);
      const lastSlot = Math.ceil((scroll + view.width / 2 + spacing * 2) / spacing);
      const next: Card[] = [];
      for (let slot = first; slot <= lastSlot; slot++) {
        const index = wrap(slot, count);
        const item = s.items[index];
        const useVideo = index === video.index && video.entry.loaded;
        const entry = useVideo ? video.entry : textureFor(item.image);
        const x = slot * spacing - scroll;
        const arc = arcOf(x);
        const order = Math.abs(slot * spacing - state.scroll) / spacing;
        const shown = ease(clamp(state.intro * 2.2 - order * 0.22, 0, 1));
        next.push({
          slot,
          index,
          entry,
          x,
          y: arc.y - (1 - shown) * h * 0.18,
          angle: arc.angle,
          w,
          h,
          radius: s.borderRadius * Math.min(w, h),
          alpha: shown,
        });
      }
      next.sort((a, b) => Math.abs(b.x) - Math.abs(a.x));
      cards = next;
      return { w, h, spacing };
    };

    const draw = (metrics: { h: number; spacing: number }) => {
      const s = settingsRef.current;
      const ratio = view.ratio;
      const speed = Math.min(Math.abs(state.velocity) / Math.max(metrics.spacing * 4, 1), 1);
      const wavePx = reduce ? 0 : s.wave * speed * view.height * 0.08 * ratio;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program.program);
      gl.bindVertexArray(vao);
      gl.uniform2f(u.uResolution, canvas.width, canvas.height);
      gl.uniform1f(u.uFocal, view.height * 1.207 * ratio);
      gl.uniform1f(u.uWaveTime, state.waveTime);
      gl.uniform1f(u.uFade, s.fadeEdges);
      gl.uniform3fv(u.uPlaceholder, placeholder);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(u.uTexture, 0);
      const count = SEGMENTS_X * SEGMENTS_Y * 6;
      const blur = Math.max(10, metrics.h * 0.09) * ratio;
      const place = (card: Card) => {
        gl.uniform2f(u.uCenter, card.x * ratio, card.y * ratio);
        gl.uniform2f(u.uSize, card.w * ratio, card.h * ratio);
        gl.uniform1f(u.uAngle, card.angle);
        gl.uniform1f(u.uRadius, Math.min(card.radius, card.w / 2, card.h / 2) * ratio);
        gl.uniform1f(u.uWave, wavePx);
        gl.uniform1f(u.uAlpha, card.alpha);
      };
      if (s.shadow > 0) {
        gl.uniform1f(u.uShadow, s.shadow);
        gl.uniform1f(u.uBlur, blur);
        gl.uniform2f(u.uShadowOffset, 0, -blur * 0.45);
        gl.uniform1f(u.uPad, blur * 1.6);
        gl.bindTexture(gl.TEXTURE_2D, blank);
        cards.forEach((card) => {
          place(card);
          gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
        });
      }
      gl.uniform1f(u.uShadow, 0);
      gl.uniform1f(u.uPad, 10 * ratio);
      cards.forEach((card) => {
        place(card);
        gl.bindTexture(gl.TEXTURE_2D, card.entry.texture || blank);
        gl.uniform1f(u.uImageAspect, card.entry.aspect);
        gl.uniform1f(u.uReady, card.entry.ready);
        gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
      });
    };

    let resizePending = false;
    const applyResize = () => {
      const s = settingsRef.current;
      view.width = Math.max(1, container.clientWidth);
      view.height = Math.max(1, container.clientHeight);
      view.ratio = Math.min(s.dpr || window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(view.width * view.ratio));
      canvas.height = Math.max(1, Math.round(view.height * view.ratio));
      const { spacing } = measure();
      state.spacing = spacing;
      state.target = targetFor(state.progress);
      if (!last) state.scroll = state.target;
    };

    const frame = (now: number) => {
      raf = 0;
      if (resizePending) {
        resizePending = false;
        applyResize();
      }
      const s = settingsRef.current;
      syncVideo();
      if (!visible || document.hidden || s.paused || lost) {
        last = 0;
        return;
      }
      const dt = last ? clamp((now - last) / 1000, 0.0005, 0.05) : 1 / 60;
      last = now;
      state.target = targetFor(state.progress);
      const follow = reduce ? 1 : 1 - Math.pow(1 - s.scrollEase, dt * 60);
      const before = state.scroll;
      state.scroll += (state.target - state.scroll) * follow;
      if (Math.abs(state.target - state.scroll) < 0.05) state.scroll = state.target;
      const velocity = (state.scroll - before) / dt;
      state.velocity += (velocity - state.velocity) * (1 - Math.exp(-dt / 0.08));
      if (Math.abs(state.velocity) < 0.5) state.velocity = 0;
      state.waveTime += dt * 2.4;
      if (state.intro < 1) state.intro = Math.min(1, state.intro + dt / INTRO_SECONDS);
      let settling = false;
      const fadeIn = (entry: TextureEntry) => {
        if (!entry.loaded || entry.ready >= 1) return;
        entry.ready = reduce ? 1 : Math.min(1, entry.ready + dt / 0.45);
        settling = true;
      };
      textures.forEach(fadeIn);
      fadeIn(video.entry);
      const playing = !!video.el && video.entry.loaded && !video.el.paused;
      if (playing && video.el && video.el.readyState >= 2) upload(video.texture, video.el, false);
      const metrics = layout();
      draw(metrics);
      const moving =
        state.scroll !== state.target || state.velocity !== 0 || state.intro < 1 || settling || playing;
      if (moving) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    function wake() {
      if (!raf && !lost) raf = requestAnimationFrame(frame);
    }

    const resize = () => {
      resizePending = true;
      wake();
    };

    const onVisibility = () => {
      last = 0;
      wake();
    };

    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      cancelAnimationFrame(raf);
      raf = 0;
      stopVideo();
      settingsRef.current.onError?.();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      last = 0;
      wake();
    });
    intersection.observe(container);
    document.addEventListener('visibilitychange', onVisibility);
    canvas.addEventListener('webglcontextlost', onLost);
    settingsRef.current.items.forEach((item) => textureFor(item.image));
    resize();

    engineRef.current = {
      wake,
      setProgress: (p) => {
        state.progress = p;
        wake();
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      engineRef.current = null;
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      stopVideo();
      if (!gl.isContextLost()) {
        textures.forEach((entry) => entry.texture && gl.deleteTexture(entry.texture));
        if (video.texture) gl.deleteTexture(video.texture);
        gl.deleteTexture(blank);
        gl.deleteProgram(program.program);
        gl.deleteBuffer(vertexBuffer);
        gl.deleteBuffer(indexBuffer);
        gl.deleteVertexArray(vao);
      }
      // [portfolio] release the context on unmount so the WebGL budget reclaims it
      if (!canvas.isConnected) gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative h-full w-full overflow-hidden ${className}`} style={style} aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
});

export default CircularGallery;
