export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill="var(--primary)" />
      <circle cx="47" cy="17" r="6.5" fill="var(--accent)" />
      <path
        d="M27 18.5a5 5 0 1 1 5 5v3.5L13.5 40.5c-1.6 1.2-.8 3.5 1.2 3.5h34.6c2 0 2.8-2.3 1.2-3.5L32 27"
        fill="none"
        stroke="var(--on-primary)"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
