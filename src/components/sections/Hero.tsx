import { site } from '@/content/site';
import { WebGLBackground } from '@/components/backgrounds/WebGLBackground';
import { HeroScroll } from './HeroScroll';
import { StaticD } from './StaticD';

/**
 * Hero. The name is split into letters on the server and revealed with CSS
 * keyframes from first paint (see .hero-char in globals.css): no hydration wait, so
 * the largest text paints immediately for LCP and recruiters see it at once.
 * GSAP only handles the scroll-out (HeroScroll).
 *
 * Layout: the name is centred and the glass D floats in front of it. On desktop
 * with WebGL the scene copies the name into the canvas (so the glass can refract
 * it) and the <h1> fades to opacity 0 but stays in the DOM; see GlassD.tsx.
 */
export function Hero() {
  const words = site.name.split(' ');
  let i = 0;
  return (
    <section id="top" aria-labelledby="hero-title" className="relative isolate flex min-h-svh flex-col pb-12 pt-28 sm:pb-14">
      <WebGLBackground kind="glass" staticClassName="bg-hero-static" staticContent={<StaticD />} desktopOnly slotId="hero" />
      <HeroScroll className="flex flex-1 flex-col">
        <div className="container-x flex flex-1 flex-col items-center justify-center text-center">
          <h1
            id="hero-title"
            aria-label={site.name}
            data-hero-name=""
            className="font-display text-[21vw] leading-[0.86] tracking-[-0.035em] md:whitespace-nowrap md:text-[min(15vw,42vh)]"
          >
            {words.map((word, w) => (
              <span
                key={word}
                aria-hidden="true"
                className={`block overflow-hidden pb-[0.06em] md:inline-block ${w < words.length - 1 ? 'md:mr-[0.2em]' : ''}`}
              >
                {[...word].map((ch) => (
                  <span key={i} className="hero-char" style={{ '--i': i++ } as React.CSSProperties}>
                    {ch}
                  </span>
                ))}
                {w === words.length - 1 && <span className="hero-char text-accent" style={{ '--i': i++ } as React.CSSProperties}>.</span>}
              </span>
            ))}
          </h1>
        </div>
        <div className="container-x mt-10 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="hero-fade max-w-xl" style={{ '--d': 150 } as React.CSSProperties}>
            <p className="eyebrow mb-4">
              {site.role} · {site.location}
            </p>
            <p className="text-lg text-fg/90 sm:text-2xl">{site.intro}</p>
          </div>
          <div className="hero-fade flex items-center gap-6" style={{ '--d': 300 } as React.CSSProperties}>
            <a
              href="#projects"
              className="group inline-flex items-center gap-2 rounded-full bg-fg px-5 py-3 text-sm font-medium text-bg transition-colors hover:bg-accent"
            >
              Skip to projects
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 rotate-90 transition-transform group-hover:translate-y-0.5">
                <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </a>
            <a href="#about" className="hidden items-center gap-3 text-sm text-muted transition-colors hover:text-fg sm:inline-flex">
              <span className="scroll-cue relative block h-10 w-px overflow-hidden bg-line" aria-hidden="true" />
              Scroll
            </a>
          </div>
        </div>
      </HeroScroll>
    </section>
  );
}
