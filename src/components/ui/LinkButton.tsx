import type { ReactNode } from 'react';
import type { MaybeUrl } from '@/content/types';
import { hrefOf } from '@/lib/placeholder';
import { cn } from '@/lib/cn';

interface Props {
  href: MaybeUrl;
  children: ReactNode;
  variant?: 'solid' | 'ghost';
  /** What to do while the URL is still a PLACEHOLDER. */
  whenMissing?: 'disable' | 'hide';
  download?: boolean;
  className?: string;
  icon?: ReactNode;
}

const base =
  'group inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-[background-color,color,border-color,opacity] duration-300';
const variants = {
  solid: 'bg-fg text-bg hover:bg-accent',
  ghost: 'border border-line text-fg hover:border-fg',
};

/**
 * Link rendered as a button. A PLACEHOLDER href is never rendered as a link: it
 * becomes a disabled "Coming soon" control (or nothing), so there are no dead links.
 */
export function LinkButton({ href, children, variant = 'ghost', whenMissing = 'disable', download, className, icon }: Props) {
  const url = hrefOf(href);
  if (!url) {
    if (whenMissing === 'hide') return null;
    return (
      <span
        role="link"
        aria-disabled="true"
        data-placeholder=""
        title="Coming soon"
        className={cn(base, 'cursor-not-allowed border border-dashed border-line text-muted', className)}
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
      className={cn(base, variants[variant], className)}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...(download ? { download: '' } : {})}
    >
      {children}
      {icon ?? <Arrow external={external} />}
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
