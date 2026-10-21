import { cx } from './cx'

/** A labelled on/off switch with a short hint underneath. */
export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-control border border-border bg-surface-2 px-4 py-3 text-start"
    >
      <span className="flex flex-1 flex-col">
        <span className="font-semibold">{label}</span>
        {hint && <span className="text-sm text-muted">{hint}</span>}
      </span>
      <span className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-border')} aria-hidden>
        <span className={cx('absolute top-1 h-5 w-5 rounded-full bg-surface shadow transition-all', checked ? 'start-6' : 'start-1')} />
      </span>
    </button>
  )
}
