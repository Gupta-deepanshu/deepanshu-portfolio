import { site } from '@/content/site';

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="container-x flex flex-col gap-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {site.name}. Built with Next.js, GSAP, Lenis, Motion and WebGL.
        </p>
        <a href="#top" className="group inline-flex items-center gap-2 text-fg transition-colors hover:text-accent">
          Back to top
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 -rotate-90 transition-transform group-hover:-translate-y-0.5">
            <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </a>
      </div>
    </footer>
  );
}
