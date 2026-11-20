import Link from 'next/link';
import { site } from '@/content/site';
import { hrefOf } from '@/lib/placeholder';
import FoldText from '@/components/reactbits/FoldText';

const nav = [
  { href: '/#about', label: 'About' },
  { href: '/#experience', label: 'Experience' },
  { href: '/#projects', label: 'Work' },
];

/**
 * alche.studio-style header: wordmark on the left, plain mono links centred,
 * an outlined Contact pill on the right. A soft gradient (not a bar) keeps the
 * links readable over whatever scrolls underneath.
 */
export function Header() {
  const resume = hrefOf(site.links.resume);
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-bg/75 to-transparent" />
      <div className="container-x relative grid grid-cols-[1fr_auto] items-center py-6 md:grid-cols-[1fr_auto_1fr]">
        <Link
          href="/"
          className="type-wide pointer-events-auto w-fit text-lg leading-none text-fg sm:text-xl"
          aria-label={`${site.name}, home`}
        >
          {site.shortName}
          <span className="text-accent">.</span>
        </Link>

        <nav aria-label="Primary" className="pointer-events-auto hidden md:block">
          <ul className="flex items-center gap-10 font-mono text-[0.8rem] tracking-[0.06em]">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-fg/80 transition-colors hover:text-accent">
                  {/* Letters re-fold on hover/focus. Inherits the link's type so the nav's
                      mono size, weight and tracking are unchanged; accessible name comes
                      from FoldText's sr-only copy (the folding letters are aria-hidden). */}
                  <FoldText
                    text={item.label}
                    trigger="hover"
                    hinge="top"
                    duration={0.5}
                    stagger={0.03}
                    perspective={300}
                    creaseShading={0.35}
                    fontSize="inherit"
                    fontWeight="inherit"
                    style={{ letterSpacing: 'inherit', lineHeight: 'inherit' }}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="pointer-events-auto flex items-center justify-end gap-3">
          <Link href="/#projects" className="font-mono text-[0.8rem] tracking-[0.06em] text-fg/80 transition-colors hover:text-accent md:hidden">
            Work
          </Link>
          {resume && (
            <a href={resume} download className="hidden font-mono text-[0.8rem] tracking-[0.06em] text-fg/80 transition-colors hover:text-accent sm:block">
              Résumé
            </a>
          )}
          <Link
            href="/#contact"
            className="rounded-full border border-fg/50 px-5 py-2.5 font-mono text-[0.75rem] tracking-[0.06em] text-fg transition-colors hover:border-accent hover:text-accent"
          >
            Contact
          </Link>
        </div>
      </div>
    </header>
  );
}
