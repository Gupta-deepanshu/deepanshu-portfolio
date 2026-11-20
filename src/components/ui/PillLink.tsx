import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * The site's button look (after alche.studio's header buttons): an outlined pill
 * that, on hover or keyboard focus, fills white while its label rolls up and a
 * black copy rolls in from below. Pure CSS (`.pill*` in globals.css), so it
 * works before hydration.
 *
 * Usage: put `pill` (+ `pill-lg` for in-page buttons) on the <a>/<button> and wrap
 * its content in <PillSlot>. The content may include icons; it is rendered twice,
 * and the rolling copy is aria-hidden so the accessible name is read once.
 */
export function PillSlot({ children }: { children: ReactNode }) {
  return (
    <span className="pill-slot">
      <span className="pill-text">{children}</span>
      <span className="pill-text-hover" aria-hidden="true">
        {children}
      </span>
    </span>
  );
}

interface Props {
  href: string;
  children: ReactNode;
  className?: string;
  /** Plain <a download> (e.g. the résumé PDF) instead of a client-side Link. */
  download?: boolean;
}

/** Header-size pill link. */
export function PillLink({ href, children, className, download }: Props) {
  const cls = cn('pill', className);
  return download ? (
    <a href={href} download className={cls}>
      <PillSlot>{children}</PillSlot>
    </a>
  ) : (
    <Link href={href} className={cls}>
      <PillSlot>{children}</PillSlot>
    </Link>
  );
}
