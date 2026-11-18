import { site } from '@/content/site';
import { WebGLBackground } from '@/components/backgrounds/WebGLBackground';
import { HeroScroll } from './HeroScroll';

/**
 * Hero. The name is split into letters on the server and revealed with CSS
 * keyframes from first paint (see .hero-char in globals.css): no hydration wait, so
 * the largest text paints immediately for LCP and recruiters see it at once.
 * GSAP only handles the scroll-out (HeroScroll).
 */
export function Hero() {
  const words = site.name.split(' ');
  let i = 0;
  return (
    <section id="top" aria-labelledby="hero-title" className="relative isolate flex min-h-svh flex-col justify-end pb-16 pt-32 sm:pb-20">
      <WebGLBackground kind="silk" staticClassName="bg-hero-static" slotId="hero" />
      <HeroScroll>
        <div className="container-x">
          <p className="eyebrow hero-fade mb-6" style={{ '--d': 0 } as React.CSSProperties}>
            {site.role} · {site.location}
          </p>
          <h1
            id="hero-title"
            aria-label={site.name}
            data-hero-name=""
            className="font-display text-[clamp(3.6rem,15vw,14rem)] leading-[0.86] tracking-[-0.035em]"
          >
            {words.map((word, w) => (
              <span key={word} aria-hidden="true" className="block overflow-hidden pb-[0.06em]">
                {[...word].map((ch) => (
                  <span key={i} className="hero-char" style={{ '--i': i++ } as React.CSSProperties}>
                    {ch}
                  </span>
                ))}
                {w === words.length - 1 && <span className="hero-char text-accent" style={{ '--i': i++ } as React.CSSProperties}>.</span>}
              </span>
            ))}
          </h1>
          <div className="mt-10 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <p className="hero-fade max-w-xl text-lg text-fg/90 sm:text-2xl" style={{ '--d': 150 } as React.CSSProperties}>
              {site.intro}
            </p>
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
        </div>
      </HeroScroll>
    </section>
  );
}
