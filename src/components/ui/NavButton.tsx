import { Arrow } from './LinkButton';

export function NavButton({ label, onClick, disabled, dir }: { label: string; onClick: () => void; disabled?: boolean; dir: 1 | -1 }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-11 place-items-center rounded-full border border-line text-fg transition-colors hover:border-fg disabled:opacity-35 disabled:hover:border-line"
    >
      <Arrow className={dir === -1 ? 'rotate-180' : undefined} />
    </button>
  );
}
