import Link from 'next/link';
import { cn } from '@/lib/cn';

interface Props {
  href: string;
  children: string;
  className?: string;
  /** Plain <a download> (e.g. the résumé PDF) instead of a client-side Link. */
  download?: boolean;
}

/**
 * Outlined header pill with a "slot" hover (after alche.studio's header buttons):
 * the pill fills white while the label rolls up and a black copy rolls in from
 * below. Pure CSS (`.pill*` in globals.css), so it works before hydration.
 * The rolling copy is aria-hidden, so the accessible name is the label once.
 */
export function PillLink({ href, children, className, download }: Props) {
  const label = (
    <span className="pill-slot">
      <span className="pill-text">{children}</span>
      <span className="pill-text-hover" aria-hidden="true">
        {children}
      </span>
    </span>
  );
  const cls = cn('pill', className);
  return download ? (
    <a href={href} download className={cls}>
      {label}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {label}
    </Link>
  );
}
