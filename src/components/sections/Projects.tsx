import { SectionChoreography } from '@/components/motion/SectionChoreography';
import { ProjectsShowcase } from '@/components/projects/ProjectsShowcase';

export function Projects() {
  return (
    <SectionChoreography id="projects" labelledBy="projects-title" className="relative isolate pt-32 sm:pt-44">
      <div aria-hidden="true" data-bg="" className="section-bg bg-stars" />
      <div className="container-x mb-6 grid gap-6 lg:grid-cols-12">
        <p className="eyebrow lg:col-span-3" data-reveal="">
          03 / Selected work
        </p>
        <div className="lg:col-span-9">
          <h2 id="projects-title" data-split="heading" className="font-display text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.95] tracking-[-0.02em]">
            Things I’ve built on my own time.
          </h2>
          <p className="mt-6 max-w-xl text-muted" data-reveal="">
            Three recent products, then earlier work. Scroll to turn the reel, use the arrow keys, or switch to a list.
          </p>
        </div>
      </div>
      <ProjectsShowcase />
    </SectionChoreography>
  );
}
