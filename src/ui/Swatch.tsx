interface SwatchProps {
  hex: string
  name: string
  role?: string
}

export function Swatch({ hex, name, role }: SwatchProps) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <span
        className="h-11 w-11 rounded-full border border-black/10 shadow-sm dark:border-white/15"
        style={{ background: hex }}
        aria-hidden
      />
      <span className="max-w-20 truncate text-sm font-medium">{name}</span>
      {role && <span className="text-xs text-muted">{role}</span>}
    </div>
  )
}
