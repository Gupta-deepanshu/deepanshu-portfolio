import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProject, projects } from '@/content/projects';
import type { EarlierProject, FeaturedProject, Project } from '@/content/types';
import { mediaFor } from '@/lib/media';
import { isPlaceholder } from '@/lib/placeholder';
import { LinkButton, Arrow } from '@/components/ui/LinkButton';
import { TransitionLink } from '@/components/ui/TransitionLink';
import { SectionChoreography } from '@/components/motion/SectionChoreography';
import { EarlierLabel } from '@/components/projects/ProjectCard';
import { Footer } from '@/components/layout/Footer';

export function generateStaticParams() {
  return projects.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/projects/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.description,
    alternates: { canonical: `/projects/${slug}` },
    openGraph: { title: project.title, description: project.description, url: `/projects/${slug}`, type: 'article' },
  };
}

export default async function ProjectPage({ params }: PageProps<'/projects/[slug]'>) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const index = projects.indexOf(project);
  const next = projects[(index + 1) % projects.length];
  const media = mediaFor(project);

  return (
    <>
      <main id="main" tabIndex={-1} className="page-enter outline-none" style={{ '--project-accent': project.accent } as React.CSSProperties}>
        <SectionChoreography id="top" labelledBy="project-title" className="relative isolate pt-32 sm:pt-40">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 -z-10 h-[90vh]"
            style={{ background: `radial-gradient(ellipse at 70% 0%, ${project.accent}33, transparent 60%)` }}
          />
          <div className="container-x">
            <Link href="/#projects" className="group inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-fg">
              <Arrow className="rotate-180" /> All work
            </Link>

            <div className="mt-10 flex flex-wrap items-center gap-3 font-mono text-xs text-muted">
              <span>
                {String(index + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}
              </span>
              {project.category === 'earlier' ? <EarlierLabel /> : <span className="uppercase tracking-widest">Case study</span>}
            </div>
            <h1 id="project-title" className="mt-4 font-display text-[clamp(3.2rem,11vw,10rem)] leading-[0.9] tracking-[-0.03em]">
              {project.title}
            </h1>
            <p className="mt-6 max-w-2xl text-xl text-fg/85 sm:text-2xl">{project.oneLiner}</p>
            <div className="mt-8 flex flex-wrap gap-2">
              <LinkButton href={project.links.live} variant="solid">
                Visit live site
              </LinkButton>
              <LinkButton href={project.links.github}>Source on GitHub</LinkButton>
            </div>

            <div className="relative mt-16 aspect-[16/10] overflow-hidden rounded-2xl border border-line bg-raised" data-parallax="0.04">
              <Image src={media.poster} alt={project.posterAlt} fill preload fetchPriority="high" sizes="(min-width: 1400px) 1300px, calc(100vw - 2rem)" quality={70} className="object-cover" />
              {media.video.length > 0 && (
                <video className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden" autoPlay muted loop playsInline preload="metadata" poster={media.poster} aria-hidden="true">
                  {media.video.map((v) => (
                    <source key={v.src} src={v.src} type={v.type} />
                  ))}
                </video>
              )}
            </div>
          </div>
        </SectionChoreography>

        <SectionChoreography id="details" className="py-24 sm:py-32">
          <div className="container-x">
            {project.category === 'featured' ? <CaseStudy project={project} /> : <ShortStudy project={project} />}
          </div>
        </SectionChoreography>

        <nav aria-label="Next project" className="border-t border-line">
          <TransitionLink href={`/projects/${next.slug}`} className="group container-x flex items-end justify-between gap-6 py-20">
            <span>
              <span className="eyebrow block">Next project</span>
              <span className="mt-3 block font-display text-[clamp(2.4rem,7vw,6rem)] leading-none transition-colors group-hover:text-accent">
                {next.title}
              </span>
            </span>
            <Arrow className="size-8" />
          </TransitionLink>
        </nav>
      </main>
      <Footer />
    </>
  );
}

function Block({ title, children, n }: { title: string; children: React.ReactNode; n?: string }) {
  return (
    <section className="grid gap-6 border-t border-line py-12 lg:grid-cols-12" data-reveal="">
      <h2 className="eyebrow lg:col-span-3">
        {n && <span className="mr-3 text-accent">{n}</span>}
        {title}
      </h2>
      <div className="text-lg leading-relaxed text-fg/90 lg:col-span-9">{children}</div>
    </section>
  );
}

function TechList({ project }: { project: Project }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {project.tech.map((t) => (
        <li key={t} className="rounded-full border border-line px-3 py-1 font-mono text-sm text-muted">
          {t}
        </li>
      ))}
    </ul>
  );
}

function Links({ project }: { project: Project }) {
  return (
    <div className="flex flex-wrap gap-2">
      <LinkButton href={project.links.live} variant="solid">
        Live site
      </LinkButton>
      <LinkButton href={project.links.github}>GitHub</LinkButton>
    </div>
  );
}

function CaseStudy({ project }: { project: FeaturedProject }) {
  const c = project.caseStudy;
  return (
    <>
      <Block title="Overview" n="01">
        <p className="max-w-3xl font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-snug text-fg">{c.overview}</p>
      </Block>
      <Block title="My role" n="02">
        <p className="max-w-3xl">{c.role}</p>
      </Block>
      <Block title="The problem" n="03">
        <p className="max-w-3xl">{c.problem}</p>
      </Block>
      <Block title="Key decisions" n="04">
        <ol className="grid gap-8 md:grid-cols-2">
          {c.decisions.map((d, i) => (
            <li key={d.title} className="rounded-2xl border border-line bg-raised/50 p-6">
              <p className="font-mono text-xs text-accent">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="mt-3 text-xl text-fg">{d.title}</h3>
              <p className="mt-3 text-base text-fg/80">{d.body}</p>
            </li>
          ))}
        </ol>
      </Block>
      <Block title="Highlights" n="05">
        <ul className="space-y-3">
          {project.highlights.map((h) => (
            <li key={h} className="relative pl-6 before:absolute before:left-0 before:top-[0.75em] before:h-px before:w-3 before:bg-accent">
              {h}
            </li>
          ))}
        </ul>
      </Block>
      <Block title="Tech stack" n="06">
        <TechList project={project} />
      </Block>
      <Block title="Results" n="07">
        {isPlaceholder(c.results) ? <p className="text-muted">Results and metrics are coming soon.</p> : <p className="max-w-3xl">{c.results}</p>}
      </Block>
      <Block title="Links" n="08">
        <Links project={project} />
      </Block>
    </>
  );
}

function ShortStudy({ project }: { project: EarlierProject }) {
  return (
    <>
      <Block title="Overview" n="01">
        <p className="max-w-3xl font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-snug text-fg">{project.short.overview}</p>
      </Block>
      <Block title="What I built" n="02">
        <ul className="space-y-3">
          {project.short.built.map((b) => (
            <li key={b} className="relative pl-6 before:absolute before:left-0 before:top-[0.75em] before:h-px before:w-3 before:bg-accent">
              {b}
            </li>
          ))}
        </ul>
      </Block>
      <Block title="Tech" n="03">
        <TechList project={project} />
      </Block>
      <Block title="Links" n="04">
        <Links project={project} />
      </Block>
    </>
  );
}
