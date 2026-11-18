'use client';

import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { useTransitionNavigate } from '@/components/providers/PageTransition';

type Props = LinkProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & { href: string };

/**
 * A real <Link> (prefetching, middle-click, open-in-new-tab all still work) that
 * plays the page-transition curtain on a plain left click.
 */
export function TransitionLink({ href, onClick, ...rest }: Props) {
  const navigate = useTransitionNavigate();
  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (href.startsWith('#') || /^https?:/.test(href)) return;
    event.preventDefault();
    navigate(href);
  };
  return <Link href={href} onClick={handle} {...rest} />;
}
