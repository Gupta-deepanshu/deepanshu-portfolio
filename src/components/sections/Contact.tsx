import { site } from '@/content/site';
import { WebGLBackground } from '@/components/backgrounds/WebGLBackground';
import { SectionChoreography } from '@/components/motion/SectionChoreography';
import { LinkButton } from '@/components/ui/LinkButton';
import { CopyEmail } from './CopyEmail';

export function Contact() {
  return (
    <SectionChoreography id="contact" labelledBy="contact-title" className="relative isolate flex min-h-svh items-center py-32">
      {/* Liquid Ether on desktop; on phones the animated CSS gradient keeps scrolling smooth. */}
      <WebGLBackground kind="ether" staticClassName="bg-contact-static" desktopOnly slotId="contact" />
      <div className="container-x">
        <div className="scrim -mx-6 rounded-[3rem] px-6 py-10">
          <p className="eyebrow" data-reveal="">
            05 / Contact
          </p>
          <h2
            id="contact-title"
            data-split="heading"
            className="mt-6 max-w-5xl font-display text-[clamp(3rem,10vw,9rem)] leading-[0.9] tracking-[-0.03em]"
          >
            Let’s build something people <em className="text-accent">enjoy</em> using.
          </h2>
          <p className="mt-8 max-w-xl text-lg text-fg/85" data-reveal="">
            I’m open to SDE 2 frontend roles at product companies. The fastest way to reach me is email.
          </p>
          <div className="mt-10 flex flex-col gap-6" data-reveal="">
            <a
              href={`mailto:${site.email}`}
              className="group w-fit break-all font-display text-[clamp(1.6rem,4.2vw,3.4rem)] leading-tight text-fg underline decoration-line decoration-1 underline-offset-[0.2em] transition-colors hover:decoration-accent"
            >
              {site.email}
            </a>
            <div className="flex flex-wrap items-center gap-3">
              <CopyEmail email={site.email} />
              <LinkButton href={site.links.linkedin}>LinkedIn</LinkButton>
              <LinkButton href={site.links.github}>GitHub</LinkButton>
              <LinkButton href={site.links.resume} variant="solid" download>
                Download résumé
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    </SectionChoreography>
  );
}
