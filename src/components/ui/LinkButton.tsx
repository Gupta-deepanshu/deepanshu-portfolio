import type { ReactNode } from 'react';
import type { MaybeUrl } from '@/content/types';
import { hrefOf } from '@/lib/placeholder';
import { cn } from '@/lib/cn';
import { PillSlot } from './PillLink';

interface Props {
  /** undefined = no link at all (renders nothing), unlike a PLACEHOLDER, which shows "Coming soon". */
  href: MaybeUrl | undefined;
  children: ReactNode;
  /** What to do while the URL is still a PLACEHOLDER. */
  whenMissing?: 'disable' | 'hide';
  download?: boolean;
  className?: string;
  icon?: ReactNode;
}

const placeholderClass =
  'inline-flex items-center gap-2 rounded-full border border-dashed border-line px-5 py-2.5 font-mono text-[0.8rem] tracking-[0.06em] text-muted cursor-not-allowed';

/**
 * Link rendered as a pill button (slot hover, see PillLink). A PLACEHOLDER href is never rendered as a link: it
 * becomes a disabled "Coming soon" control (or nothing), so there are no dead links.
 */
export function LinkButton({ href, children, whenMissing = 'disable', download, className, icon }: Props) {
  if (href === undefined) return null;
  const url = hrefOf(href);
  if (!url) {
    if (whenMissing === 'hide') return null;
    return (
      <span
        role="link"
        aria-disabled="true"
        data-placeholder=""
        title="Coming soon"
        className={cn(placeholderClass, className)}
      >
        {children}
        <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">Coming soon</span>
      </span>
    );
  }
  const external = /^https?:/.test(url);
  return (
    <a
      href={url}
      className={cn('pill pill-lg group', className)}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...(download ? { download: '' } : {})}
    >
      <PillSlot>
        {children}
        {icon ?? <Arrow external={external} />}
      </PillSlot>
      {external && <span className="sr-only">(opens in a new tab)</span>}
    </a>
  );
}

export function Arrow({ external = false, className }: { external?: boolean; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={cn('size-3.5 transition-transform duration-300 group-hover:translate-x-0.5', external && '-rotate-45', className)}
    >
      <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
