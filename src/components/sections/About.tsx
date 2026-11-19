import { site } from '@/content/site';
import { SectionChoreography } from '@/components/motion/SectionChoreography';

export function About() {
  return (
    <SectionChoreography id="about" labelledBy="about-title" className="relative isolate py-32 sm:py-44">
      {/* The hero's room stays behind this section (HeroStage). The scrim keeps the text at
          full contrast over it; the left column stays clear for the glass D. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_75%_65%_at_62%_50%,rgb(10_10_11/0.6),transparent_78%)]"
      />
      <div className="container-x grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <p className="eyebrow" data-reveal="">
            01 / About
          </p>
        </div>
        <div className="lg:col-span-9">
          <h2 id="about-title" className="sr-only">
            About me
          </h2>
          <div className="space-y-8 font-display text-[clamp(1.8rem,3.6vw,3.4rem)] leading-[1.15] tracking-[-0.01em]">
            {site.summary.map((paragraph) => (
              <p key={paragraph} data-scrub-lines="">
                {paragraph}
              </p>
            ))}
          </div>
          <dl className="mt-20 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-line pt-10 md:grid-cols-4">
            {site.facts.map((fact) => (
              <div key={fact.label} data-reveal="">
                <dt className="sr-only">{fact.label}</dt>
                <dd className="font-display text-5xl text-fg sm:text-6xl">
                  {fact.value}
                  <span aria-hidden="true" className="mt-2 block font-sans text-sm text-muted">{fact.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </SectionChoreography>
  );
}
