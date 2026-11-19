# Deepanshu Gupta — Portfolio

Personal portfolio for a Senior Frontend Engineer applying to SDE 2 frontend roles at product companies.
Dark, cinematic, scroll-driven "studio" feel (inspired by alche.studio, brandappart.com, 109ichiki.com — take the feel, never their assets, text or code) **and** fast, accessible, recruiter-readable in 30 s, with code the owner can explain in interviews.

## Commands
- `pnpm dev` — dev server
- `pnpm build` / `pnpm start` — production build / serve
- `pnpm typecheck` — `tsc --noEmit` (strict)
- `pnpm lint` — ESLint
- `pnpm test:e2e` — Playwright smoke tests; `pnpm shots` — screenshots to `artifacts/`; `pnpm lighthouse` — mobile Lighthouse report
- Run typecheck + lint after every major piece; keep both passing.

## Stack
- Next.js (App Router, current stable), TypeScript strict, Tailwind CSS v4, static where possible, deploy to Vercel. pnpm.
- Lenis smooth scroll (enhances native scroll: scrollbar, keyboard, anchors, screen readers must keep working), using the official Lenis + ScrollTrigger setup: `lenis.on('scroll', ScrollTrigger.update)`, Lenis `raf` driven by `gsap.ticker`, `lagSmoothing(0)`.
- **GSAP + ScrollTrigger (+ SplitText)** own everything scroll-driven: pinning/scrubbing the projects carousel, section entrance/exit choreography, line-by-line text reveals, background transitions. Always via `useGSAP` (scoped, auto cleanup). Reduced motion via `gsap.matchMedia()`.
- **Motion** (`motion/react`) owns component/state animation: hovers, buttons, toggles, toasts, list/carousel view switch, page transitions, and Kokonut / React Bits components that depend on it.
- **Never animate the same element with both libraries** (wrap: Motion on outer, GSAP on inner).
- SplitText must stay accessible (original text via `aria-label`, split pieces `aria-hidden`) and revert on resize/unmount.
- shadcn CLI to vendor components into the repo: React Bits (`@react-bits/<Name>-TS-TW`), Kokonut UI (`@kokonutui/<slug>`).
- three.js (plain, no R3F) for the hero glass D scene and the projects reel. React Bits backgrounds are raw WebGL2.
- Projects carousel = CurvedReel (three.js; camera inside a cylindrical grid room, active poster large and centred, neighbours peeking; WebGL posters/videos only; rotation driven by pinned, scrubbed, snapping ScrollTrigger; all text/links/counter are HTML overlay; counts in the WebGL budget). Mobile/reduced motion/no WebGL2 = swipeable HTML scroll-snap carousel.
- Dev: Playwright (Chromium) for screenshots (to gitignored `artifacts/`), console-error checks, smoke tests and Lighthouse runs.
- **Ask before adding any dependency** not already agreed.

## Content (edit without touching components)
- `src/content/site.ts` — name, role, location, intro, summary, email, links (LinkedIn/GitHub/resume = PLACEHOLDER)
- `src/content/experience.ts`, `projects.ts` (6 projects, carousel order), `skills.ts`, `education.ts`
- Placeholder values use the `PLACEHOLDER` sentinel. A placeholder link is never rendered as a broken link: disabled "Coming soon" or hidden.
- Project media auto-detected from `public/projects/<slug>/` (poster image, optional muted loop video); otherwise a generated gradient/noise poster using the project accent + title.
- Never show the phone number. Email via mailto.

## Structure
Loader (<1 s, skippable, skipped for returning visitors & reduced motion) → Hero → About → Experience (self-drawing timeline) → Projects (pinned curved reel of 6, 1/6…6/6, "View as list", swipe carousel on mobile) → Skills (pinned card deck of skill groups, dealt once by scroll; Education alongside) → Contact → Footer.
`/projects/[slug]`: featured = full case study; earlier = short template. Smooth page transitions.

## Section backgrounds
- WebGL: Hero (glass D + cursor fluid, desktop only; SVG D fallback), Projects carousel (CurvedReel), Contact (Liquid Ether, desktop only). CSS/SVG/noise backgrounds: About, Experience, Projects (star vignette), Skills.
- Animate only in/near viewport (IntersectionObserver); off-screen pauses rAF; far off-screen releases context. Max 2 WebGL contexts rendering at once.
- Seamless blends between sections. Mobile: lower DPR, no cursor effects, CSS fallback for at least one WebGL section.
- Reduced motion / no WebGL: static gradient per section. Never reduce text contrast — scrim behind text.

## Design direction
Near-black bg, off-white text, one restrained accent, subtle film grain, generous spacing, large wide display type (Archivo at 125% width: semibold uppercase titles, regular for large reading text) + clean body (Geist), all via next/font. Motion smooth and weighty, not bouncy. One standout effect per section. Native cursor only (no custom cursor).

## Non-negotiables
- Mobile: no pinned ring; test at 375 px.
- `prefers-reduced-motion`: no Lenis smoothing, scroll-linked transforms, loader, cursor or background animation; content static.
- A11y: semantic HTML/headings, visible focus, skip link, keyboard carousel (arrows + buttons), alt text, contrast. All content is real HTML text, never only in canvas.
- Perf: animate transform/opacity only; lazy images/videos; only the active project video plays (muted, looped, compressed, poster). Lighthouse mobile 90+ in all four categories — simplify a background first if it costs performance.
- SEO: titles, meta descriptions, OG image, sitemap, robots, favicon.
- Name, role, experience, projects findable within 30 s without waiting for animation.

## Working style
Small reviewable steps. Conventional commits at checkpoints. Never push unless asked. Briefly explain non-obvious technical decisions.
