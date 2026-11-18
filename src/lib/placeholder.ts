import { PLACEHOLDER, type MaybeUrl } from '@/content/types';

export const isPlaceholder = (value: unknown): value is typeof PLACEHOLDER =>
  value === PLACEHOLDER || value === '' || value == null;

/** Narrow a MaybeUrl to a usable href, or undefined if it is still a placeholder. */
export const hrefOf = (value: MaybeUrl): string | undefined => (isPlaceholder(value) ? undefined : value);
