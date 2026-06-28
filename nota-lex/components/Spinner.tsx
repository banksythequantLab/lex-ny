/**
 * Spinner — small on-brand loading indicator: a gold arc rotating on a faint
 * navy track. Shown wherever the UI is waiting on data from Aurora (judge
 * search, judge profile, corpus queries) so the user can see a request is in
 * flight rather than staring at a blank panel during a cold-start.
 */
export function Spinner({
  size = 22,
  label,
  className = "",
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label || "Loading"}
      className={"inline-flex items-center gap-2.5 " + className}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin [animation-duration:0.8s]"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke="var(--color-rule)" strokeOpacity="0.15" strokeWidth="2.75" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="var(--color-seal)" strokeWidth="2.75" strokeLinecap="round" />
      </svg>
      {label && (
        <span className="font-[family-name:var(--font-mono)] text-[13px] tracking-wide text-[var(--color-ink-2)]">
          {label}
        </span>
      )}
    </span>
  );
}
