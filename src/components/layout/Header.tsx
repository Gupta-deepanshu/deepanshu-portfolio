import Link from 'next/link';
import { site } from '@/content/site';
import { hrefOf } from '@/lib/placeholder';

const nav = [
  { href: '/#about', label: 'About' },
  { href: '/#experience', label: 'Experience' },
  { href: '/#projects', label: 'Work' },
  { href: '/#contact', label: 'Contact' },
];

export function Header() {
  const resume = hrefOf(site.links.resume);
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="container-x flex items-center justify-between py-5">
        <Link
          href="/"
          className="pointer-events-auto font-display text-xl tracking-tight text-fg"
          aria-label={`${site.name}, home`}
        >
          {site.shortName}
          <span className="text-accent">.</span>
        </Link>
        <nav aria-label="Primary" className="pointer-events-auto">
          <ul className="flex items-center gap-1 rounded-full border border-line bg-bg/60 px-2 py-1 text-sm backdrop-blur-md">
            {nav.map((item, i) => (
              <li key={item.href} className={i < 2 ? 'hidden sm:block' : undefined}>
                <Link href={item.href} className="block rounded-full px-3 py-1.5 text-muted transition-colors hover:text-fg">
                  {item.label}
                </Link>
              </li>
            ))}
            {resume && (
              <li>
                <a href={resume} download className="block rounded-full bg-fg px-3 py-1.5 text-bg transition-colors hover:bg-accent">
                  Résumé
                </a>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
