import { Arrow } from './LinkButton';

export function NavButton({ label, onClick, disabled, dir }: { label: string; onClick: () => void; disabled?: boolean; dir: 1 | -1 }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="pill pill-icon"
    >
      <Arrow className={dir === -1 ? 'rotate-180' : undefined} />
    </button>
  );
}
