# Deepanshu Gupta: Portfolio

A dark, cinematic, scroll-driven portfolio built with Next.js 16, GSAP ScrollTrigger, Lenis, Motion and WebGL. Every word on the site is real HTML that renders before any JavaScript runs.

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # production build (also regenerates the project media manifest)
pnpm typecheck    # next typegen + tsc --noEmit
pnpm lint
pnpm test:e2e     # Playwright smoke tests   (run `pnpm build` first)
pnpm shots        # screenshots → artifacts/screenshots (gitignored)
pnpm lighthouse   # mobile Lighthouse for / and one project → artifacts/lighthouse
```

Playwright needs Chromium once: `pnpm exec playwright install chromium`. On machines without a GPU (CI), run with `PW_SWIFTSHADER=1`.

---

## Replace before launch

Search the repo for `PLACEHOLDER`. Placeholder links never render as links: they show a disabled **Coming soon** button.

| What | Where |
|---|---|
| LinkedIn URL | `src/content/site.ts` → `links.linkedin` |
| GitHub URL | `src/content/site.ts` → `links.github` |
| Résumé | add `public/resume.pdf`, then set `links.resume: '/resume.pdf'` in `src/content/site.ts` |
| Production domain (canonical URLs, sitemap, OG) | `src/content/site.ts` → `url` |
| Live + GitHub URL for each of the 6 projects | `src/content/projects.ts` → `links.live`, `links.github` |
| Case-study copy marked `// DRAFT` (Formsmith, Rewind, Soul Ledger) | `src/content/projects.ts` → `caseStudy` |
| Results for featured projects | `src/content/projects.ts` → `caseStudy.results` (shows “coming soon” until set) |
| Project screenshots | `public/projects/<slug>/poster.webp` (or `.avif`/`.jpg`/`.png`), ~1600×1000 |
| Optional looping videos | `public/projects/<slug>/loop.webm` and/or `loop.mp4` |

Slugs: `formsmith`, `rewind`, `soul-ledger`, `real-estate`, `crypto-tracker`, `travel`.

Media is picked up automatically: `scripts/scan-media.mjs` runs before `dev` and `build` and writes `src/content/media.generated.ts`. Until a poster exists, a gradient poster is generated from the project's `accent` and `title` (`src/app/posters/[slug]/route.tsx`).

Keep videos short, muted and small. For example:

```bash
ffmpeg -i in.mov -t 8 -an -vf "scale=1280:-2,fps=30" -c:v libvpx-vp9 -b:v 0 -crf 38 loop.webm
ffmpeg -i in.mov -t 8 -an -vf "scale=1280:-2,fps=30" -c:v libx264 -crf 28 -preset slow -movflags +faststart loop.mp4
```

---

## How it works

### Content
All copy lives in typed files in `src/content/` (`site.ts`, `experience.ts`, `projects.ts`, `skills.ts`), with types in `types.ts`. Components never hard-code copy.

### Animation split
- **GSAP + ScrollTrigger (+ SplitText)** handles everything scroll-driven: the pinned projects gallery, section entrances, line-by-line reveals and background cross-fades.
  - Sections are server components; `SectionChoreography` attaches motion to `data-*` attributes (`data-reveal`, `data-split`, `data-scrub-lines`, `data-bg`, `data-draw`).
  - Everything runs inside `gsap.matchMedia()`, so with reduced motion nothing is created.
  - `useGSAP` reverts everything on unmount.
- **Motion** handles state animation: the page-transition curtain, the list/carousel switch, the toggle, the carousel caption, the cursor ring, and the Kokonut toast.
- **No element is animated by both libraries.**
- **Lenis** uses the setup it recommends for ScrollTrigger: `lenis.on('scroll', ScrollTrigger.update)`, driven by `gsap.ticker`, with `lagSmoothing(0)`. It moves the real scroll position, so the scrollbar, keyboard, anchors and screen readers keep working. Anchor clicks also move focus.

### Hero
The name is split into letters on the server and animated with CSS keyframes from first paint. A JS split would hide the name until hydration, which hurts LCP and makes recruiters wait.

### Backgrounds and the WebGL budget (`src/lib/gl-budget.ts`)
| Section | Background |
|---|---|
| Hero | Glass D scene (three.js, desktop): fluid sim + curved grid room + refractive D; static SVG D elsewhere |
| About | CSS spotlight following the cursor |
| Experience | SVG contour lines drifting by transform |
| Projects | CSS star vignette; the reel itself is WebGL (same grid room) |
| Skills | CSS dot grid lit by the cursor |
| Contact | React Bits **Liquid Ether** (WebGL2, desktop only) |

- Two IntersectionObservers sort each WebGL surface into one of three states:
  - **active**: near the viewport; mounted and rendering
  - **paused**: within ~2 viewports; context kept, render loop stopped
  - **released**: further away; unmounted, context freed
- At most 2 surfaces render at once.
- I chose separate canvases over one shared scissor canvas because the three pipelines (hero glass + fluid, reel, Liquid Ether) would have to be merged into one renderer, and the budget already gives the same practical cost.
- Every WebGL background sits on a static CSS gradient. That gradient is what shows with reduced motion, without WebGL2, and for Contact on phones.

### Hero glass D (`src/components/three/GlassD.tsx`)
One three.js renderer, three stages per frame:
- **Fluid**: a 128px stable-fluids sim (advect, splat, divergence, Jacobi pressure, gradient subtract). Cursor movement and scroll speed push velocity into it.
- **Room**: a grid mapped onto the inside of a cylinder plus a violet glow, drawn to a render target. The fluid velocity offsets its UVs per colour channel, which gives the smeared chromatic trail.
- **Glass**: an extruded, bevelled `D` (built from a `Shape`, no model file). Its shader samples the room texture behind it, magnified and bent by the normal with R/G/B at different offsets, plus fresnel rim and a reflection band. No transmission pass or env map, so it stays cheap.
- The D eases toward the cursor and turns further as you scroll. Desktop only. Phones, reduced motion and no-WebGL2 get `StaticD` (SVG, same outline).

### Projects reel (`src/components/three/CurvedReel.tsx`)
The camera stands inside the same grid room; posters hang on the wall. The active project fills ~55% of the width and its neighbours peek in, bent around the curve.
- Rotation comes from a pinned, scrubbed, snapping ScrollTrigger (one viewport of scroll per project). The reel eases toward it; scroll speed bulges the cards and splits their RGB channels.
- The glow behind the reel blends the site violet with the active project's accent.
- The canvas draws only posters and videos. Title, links, tech, the "Earlier work" label and the 1/6 counter are HTML.
- Arrow keys and Prev/Next scroll the page to that project's snap point, so scroll stays the single source of truth.
- Only the active project's video is decoded and uploaded as a texture.
- It is paused or released by the WebGL budget, and falls back to the HTML carousel if WebGL fails.
- On mobile, with reduced motion, or without WebGL, you get a native scroll-snap swipe carousel. There is also a **View as list** toggle.

### Tests
- `tests/smoke.spec.ts` checks that pages load, keyboard carousel navigation works, and placeholders show "Coming soon".
- `tests/visual.spec.ts` covers screenshots at 1440 and 375, the 6 carousel positions, the WebGL budget (≤2 active), reduced-motion rendering, and that each section's background is visible.
- Both fail on any console error.

### Third-party components
| Source | Component | Use |
|---|---|---|
| React Bits (MIT + Commons Clause) | Liquid Ether, Decrypted Text | Contact background, active title |
| Kokonut UI (MIT) | Attract Button, Promise Toast | "Copy email" and its toast |

They are vendored via the shadcn CLI. The only change to every vendored file is that "latest props" refs now sync in `useLayoutEffect` (the React Compiler lint rule forbids writing refs during render). Other edits are marked `[portfolio]`.
