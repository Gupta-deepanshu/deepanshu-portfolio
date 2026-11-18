'use client';

/**
 * Scroll choreography for a section, driven by data attributes on server-rendered
 * markup. Sections stay server components (all text is in the HTML); this wrapper
 * only adds motion. Everything lives inside gsap.matchMedia(MEDIA.motion), so with
 * prefers-reduced-motion nothing is created and the content is simply static.
 *
 *   data-bg                section background layer: fades in/out with the section
 *   data-reveal            fades up once when it enters (batched, staggered)
 *   data-split="heading"   heading lines rise out of a mask (SplitText)
 *   data-scrub-lines       paragraph lines brighten as you scroll (SplitText + scrub)
 *   data-parallax="0.15"   drifts against scroll by that fraction of its height
 *   data-draw              scaleY 0→1 scrubbed across the section (timeline spine)
 *
 * SplitText accessibility: headings use aria:'auto' (GSAP puts the full text in
 * aria-label on the heading and hides the fragments). Paragraphs are split into
 * whole lines only with aria:'none', so screen readers still read intact words.
 * autoSplit re-splits on resize/font load; useGSAP reverts everything on unmount.
 */
import { useRef, type ReactNode } from 'react';
import { EASE, gsap, MEDIA, ScrollTrigger, SplitText, useGSAP } from '@/lib/gsap';

interface Props {
  id: string;
  className?: string;
  children: ReactNode;
  /** Accessible name for the landmark, usually the visible heading text. */
  labelledBy?: string;
  as?: 'section' | 'footer';
}

export function SectionChoreography({ id, className, children, labelledBy, as: Tag = 'section' }: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();

      mm.add(MEDIA.motion, () => {
        // Background cross-fade: in as the section arrives, out as it leaves.
        q('[data-bg]').forEach((bg) => {
          gsap
            .timeline({ scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: true } })
            .fromTo(bg, { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.25 })
            .to(bg, { opacity: 1, duration: 0.5 })
            .to(bg, { opacity: 0, ease: 'none', duration: 0.25 });
        });

        // Headings: lines rise from a mask.
        q('[data-split="heading"]').forEach((el) => {
          SplitText.create(el, {
            type: 'lines',
            mask: 'lines',
            aria: 'auto',
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.lines, {
                yPercent: 110,
                duration: 1.1,
                ease: EASE,
                stagger: 0.08,
                scrollTrigger: { trigger: el, start: 'top 88%', once: true },
              }),
          });
        });

        // Paragraphs: line-by-line brightening tied to scroll position.
        q('[data-scrub-lines]').forEach((el) => {
          SplitText.create(el, {
            type: 'lines',
            aria: 'none',
            autoSplit: true,
            onSplit: (self) =>
              gsap.fromTo(
                self.lines,
                { opacity: 0.18, y: 12 },
                {
                  opacity: 1,
                  y: 0,
                  ease: 'none',
                  stagger: 0.4,
                  scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
                },
              ),
          });
        });

        // Generic reveals, batched so items entering together stagger together.
        const reveals = q('[data-reveal]');
        if (reveals.length) {
          gsap.set(reveals, { opacity: 0, y: 40 });
          ScrollTrigger.batch(reveals, {
            start: 'top 88%',
            once: true,
            onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1, ease: EASE, stagger: 0.08, overwrite: true }),
          });
        }

        q('[data-parallax]').forEach((el) => {
          const amount = Number((el as HTMLElement).dataset.parallax) || 0.15;
          gsap.fromTo(
            el,
            { yPercent: amount * 100 },
            { yPercent: -amount * 100, ease: 'none', scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: true } },
          );
        });

        q('[data-draw]').forEach((el) => {
          gsap.fromTo(
            el,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: 'none',
              transformOrigin: 'top center',
              scrollTrigger: { trigger: el.parentElement ?? root, start: 'top 70%', end: 'bottom 70%', scrub: true },
            },
          );
        });
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref as never} id={id} aria-labelledby={labelledBy} className={className}>
      {children}
    </Tag>
  );
}
