import { education, skills } from '@/content/skills';
import { CssBackground } from '@/components/backgrounds/CssBackground';
import { SectionChoreography } from '@/components/motion/SectionChoreography';

/**
 * Skills: the grouped list is the real content (readable, screen-reader friendly);
 * the two marquee rows above it are decorative and aria-hidden. Each row is the
 * list duplicated once and translated -50% in a loop: a seamless, CSS-only marquee.
 */
export function Skills() {
  const all = skills.flatMap((g) => g.items);
  const half = Math.ceil(all.length / 2);
  const rows = [all.slice(0, half), all.slice(half)];

  return (
    <SectionChoreography id="skills" labelledBy="skills-title" className="relative isolate overflow-x-clip py-32 sm:py-44">
      <CssBackground className="bg-dots" />

      <div aria-hidden="true" className="marquee-wrap mb-24 space-y-4 [mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)]">
        {rows.map((row, r) => (
          <div key={r} className="overflow-hidden">
            <div className="marquee" data-reverse={r === 1 ? '' : undefined} style={{ '--duration': `${70 + r * 15}s` } as React.CSSProperties}>
              {[0, 1].map((copy) => (
                <div key={copy} data-dup={copy === 1 ? '' : undefined} className="flex shrink-0 items-center">
                  {row.map((s) => (
                    <span key={s} className="flex items-center whitespace-nowrap px-6 font-display font-semibold uppercase text-[clamp(1.8rem,4.5vw,3.8rem)] text-fg/80">
                      {s}
                      <span className="ml-12 size-2 rounded-full bg-accent/70" />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="container-x grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <p className="eyebrow" data-reveal="">
            04 / Skills
          </p>
          <h2 id="skills-title" data-split="heading" className="mt-4 font-display font-semibold uppercase text-3xl">
            Toolkit
          </h2>
        </div>
        <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:col-span-6 lg:grid-cols-3">
          {skills.map((g) => (
            <div key={g.label} data-reveal="">
              <dt className="eyebrow">{g.label}</dt>
              <dd className="mt-3 space-y-1 text-fg/90">
                {g.items.map((i) => (
                  <span key={i} className="block">
                    {i}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <aside aria-labelledby="edu-title" data-reveal="" className="self-start rounded-2xl border border-line bg-bg/50 p-6 backdrop-blur-sm lg:col-span-3">
          <h3 id="edu-title" className="eyebrow">
            Education
          </h3>
          <p className="mt-4 text-lg">{education.degree}</p>
          <p className="mt-1 text-muted">
            {education.school}, {education.location}
          </p>
          <p className="mt-4 flex justify-between font-mono text-sm text-muted">
            <span>
              {education.start}–{education.end}
            </span>
            <span className="text-accent">{education.grade}</span>
          </p>
        </aside>
      </div>
    </SectionChoreography>
  );
}
