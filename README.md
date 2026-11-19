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
- **Motion** handles state animation: the page-transition curtain, the list/carousel switch, the toggle, the carousel caption, and the Kokonut toast.
- **No element is animated by both libraries.**
- **Lenis** uses the setup it recommends for ScrollTrigger: `lenis.on('scroll', ScrollTrigger.update)`, driven by `gsap.ticker`, with `lagSmoothing(0)`. It moves the real scroll position, so the scrollbar, keyboard, anchors and screen readers keep working. Anchor clicks also move focus.

### Hero
The name is split into letters on the server and animated with CSS keyframes from first paint. A JS split would hide the name until hydration, which hurts LCP and makes recruiters wait.

### Backgrounds and the WebGL budget (`src/lib/gl-budget.ts`)
**Hold zones** (`HoldZone.tsx`, after alche's intro/outro containers): empty stretches between Hero → About (60vh), About → Experience (80vh), Work → Skills and Skills → Contact (70vh each) where no content moves, only the fixed background and the D, which time their hand-offs to them. On desktop, stopping in the middle of a hold eases (~1 s) on in the direction you were scrolling, so the page never rests halfway through a hand-off and never pulls you back; no snapping near the ends or inside reading sections. Phones: shorter holds, no snapping. Reduced motion: no holds.

One fixed **ambient background** (`AmbientBackground.tsx`, CSS only) sits behind every section: near-black base, two soft glows and the hero room's faint grid. Each section has a mood (glow colours/positions, grid strength) and GSAP scrubs the layer's custom properties from one mood to the next as a section arrives, so the page never cuts to flat black. Section effects below fade in and out over it, and every section's content fades in as it arrives and gently out as it leaves (opacity only, so the pinned reel is unaffected; the entry fade starts only when a section reaches the viewport, so nothing off-screen is dimmed at load).

| Section | Background |
|---|---|
| Hero | Glass D scene (three.js, desktop): fluid sim + curved grid room + refractive D; static SVG D elsewhere |
| About | The hero's room stays (sticky stage shared with the hero): the D moves to the left column, the camera turns, the glow cools; fades out into Experience |
| Experience | The About room (with the glass D) dissolves into the ambient background; the outline D (a fixed layer) traces itself in the glass D's exact spot and size, overlapping only briefly, then glides to the centre behind the timeline; faint "+" crosshair grid |
| Projects | The outline D moves onto the reel glass D's exact screen frame (shared maths in `three/reel-layout.ts`), rides up with the stage over its last 25vh before the pin and cross-fades into the glass D (scroll-driven alpha, facing front) — only one D is ever visible: the same glass D (shared `three/glass.ts`) floats behind the cards, refracting the room and posters (drawn to a texture first, posters re-drawn on top), turning with the reel; faint star vignette |
| Skills | CSS dot grid lit by the cursor |
| Contact | React Bits **Liquid Ether** (WebGL2, desktop only) |

The Contact headline (`ContactHeadline.tsx`) comes in like alche.studio's mission copy: each line sits on a highlight bar (off-white; the accent word on violet) that wipes in from the left while its letters type in behind it, scrubbed with scroll. Server-rendered in its final state (no-JS, reduced motion); the <h2> has the full sentence as aria-label.

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
- **Room + name**: a grid mapped onto the inside of a cylinder, a violet glow, and the name, drawn to a render target. The fluid velocity offsets its UVs per colour channel, which gives the smeared chromatic trail through the grid and the letters.
- **Glass**: an extruded, bevelled `D` (built from a `Shape`, no model file), centred on the name. Its shader samples that texture behind it: magnified, bent by a noise-perturbed "liquid" normal, frosted in drifting patches (jittered samples), slight R/G/B dispersion, inner glow, thin-film colour, fresnel rim and specular. No transmission pass or env map, so it stays cheap.
- **Why the name is in the canvas**: the glass must refract it, and one canvas can't sit both behind and in front of HTML. The `<h1>` stays the source of truth: once fonts and its letter entrance finish, each `.hero-char` box is copied into a 2D-canvas texture at the exact position the browser laid it out, then the `<h1>` fades to `opacity: 0` (still in the DOM for screen readers, search and selection). The copy follows the `<h1>` rect and the scroll-out opacity every frame. Phones, reduced motion and no-WebGL never hide the `<h1>`.
- The D spins freely with momentum: cursor movement and scroll add angular velocity (quaternion integration with friction), so a flick tumbles it a full 360°; after ~2.5 s without input it eases back to face forward. It is sized like alche's A (~62% of the viewport height) over a one-line name (~86% of the width); the fluid barely moves the name itself so it stays readable. Desktop only. Phones, reduced motion and no-WebGL2 get `StaticD` (SVG, same outline).

### Projects reel (`src/components/three/CurvedReel.tsx`)
The camera stands inside a spherical grid room; posters sit on a ring tilted ~11.5° around the view axis, so the previous project waits up-left and the next down-right and each one arrives on a diagonal arc (alche's globe-like works carousel). Cards stay upright and level, and bulge toward you like a barrel (shape built in angular terms: the camera is at the sphere's centre, so moving vertices along sight lines would be invisible). The active project fills ~55% of the width.
- Rotation comes from a pinned, scrubbed, snapping ScrollTrigger (one viewport of scroll per project). The reel eases toward it. Scroll speed drives the card animation: each card swings about its vertical axis, pulls back slightly, splits its RGB channels, and its glass rim turns iridescent; a light band slides across each card as it passes the centre. It all settles when scrolling stops.
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
