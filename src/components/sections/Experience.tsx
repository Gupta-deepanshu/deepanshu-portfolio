import { experience } from '@/content/experience';
import { CssBackground } from '@/components/backgrounds/CssBackground';
import { SectionChoreography } from '@/components/motion/SectionChoreography';

/**
 * Experience timeline. The spine is a 1px element scaled 0→1 with scroll (transform
 * only, so it stays on the compositor). The section rides on OutlineStage's black
 * panel, with a faint crosshair grid as its own texture.
 */
export function Experience() {
  return (
    <SectionChoreography id="experience" labelledBy="experience-title" className="relative isolate py-32 sm:py-44">
      {/* alche-style panel texture: a faint "+" crosshair grid. The black panel itself and
          the outline D come from OutlineStage. */}
      <CssBackground className="bg-crosses" />

      <div className="container-x">
        <div className="mb-20 grid gap-6 lg:grid-cols-12">
          <p className="eyebrow lg:col-span-3" data-reveal="">
            02 / Experience
          </p>
          <h2
            id="experience-title"
            data-split="heading"
            className="font-display font-semibold uppercase text-[clamp(2rem,4.2vw,4rem)] leading-none lg:col-span-9"
          >
            Five years of shipping interfaces for products at scale.
          </h2>
        </div>

        <div className="relative">
          {/* timeline spine */}
          <div aria-hidden="true" className="absolute bottom-0 left-[7px] top-2 w-px bg-line lg:left-[calc(25%+7px)]">
            <div data-draw="" className="h-full w-full origin-top bg-accent" />
          </div>
          <ol className="grid gap-24">

          {experience.map((role) => (
            <li key={role.company} className="relative grid gap-8 pl-10 lg:grid-cols-12 lg:pl-0">
              <div className="lg:col-span-3 lg:pr-10">
                <div className="lg:sticky lg:top-28">
                  <p className="font-mono text-sm text-accent">
                    <time>{role.start}</time> – <time>{role.end}</time>
                  </p>
                  <h3 className="mt-2 font-display font-semibold uppercase text-2xl sm:text-3xl">{role.company}</h3>
                  <p className="text-sm text-muted">{role.location}</p>
                </div>
              </div>
              <span aria-hidden="true" className="absolute left-0 top-1.5 size-[15px] rounded-full border border-accent bg-bg lg:left-[calc(25%)]" />
              <div className="space-y-12 lg:col-span-9 lg:pl-12">
                <div data-reveal="">
                  <p className="text-xl text-fg">{role.title}</p>
                  {role.progression && <p className="mt-1 text-sm text-muted">{role.progression}</p>}
                </div>
                {role.engagements.map((e) => (
                  <article key={e.client} data-reveal="" className="rounded-2xl border border-line bg-bg/40 p-6 backdrop-blur-sm sm:p-8">
                    <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                      <h4 className="text-lg font-medium">
                        {e.client}
                        {e.current && (
                          <span className="ml-3 rounded-full bg-accent/15 px-2 py-0.5 align-middle font-mono text-[0.65rem] uppercase tracking-widest text-accent">
                            Current
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-muted">{e.context}</p>
                    </header>
                    <ul className="mt-5 space-y-3 text-fg/85">
                      {e.achievements.map((a) => (
                        <li key={a} className="relative pl-5 before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-2.5 before:bg-accent">
                          {a}
                        </li>
                      ))}
                    </ul>
                    <ul aria-label="Tech used" className="mt-6 flex flex-wrap gap-2">
                      {e.tech.map((t) => (
                        <li key={t} className="rounded-full border border-line px-3 py-1 font-mono text-xs text-muted">
                          {t}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </li>
          ))}
          </ol>
        </div>
      </div>
    </SectionChoreography>
  );
}
