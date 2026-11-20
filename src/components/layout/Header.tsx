import Link from 'next/link';
import { site } from '@/content/site';
import { hrefOf } from '@/lib/placeholder';
import { PillLink } from '@/components/ui/PillLink';

const nav = [
  { href: '/#about', label: 'About' },
  { href: '/#experience', label: 'Experience' },
  { href: '/#projects', label: 'Work' },
];

/**
 * alche.studio-style header: wordmark on the left, outlined pills centred and on
 * the right (slot hover, see PillLink). A soft gradient (not a bar) keeps them
 * readable over whatever scrolls underneath.
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
          <ul className="flex items-center gap-2">
            {nav.map((item) => (
              <li key={item.href} className="flex">
                <PillLink href={item.href}>{item.label}</PillLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="pointer-events-auto flex items-center justify-end gap-2">
          <PillLink href="/#projects" className="md:hidden">
            Work
          </PillLink>
          {resume && (
            <PillLink href={resume} download className="hidden sm:block">
              Résumé
            </PillLink>
          )}
          <PillLink href="/#contact">Contact</PillLink>
        </div>
      </div>
    </header>
  );
}
