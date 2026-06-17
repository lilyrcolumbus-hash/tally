/** Tally tally-mark glyph: four gold strokes + a cyan strike = "keeping the count". */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <g stroke="#fbbf24" strokeWidth="6" strokeLinecap="round">
        <line x1="18" y1="20" x2="18" y2="44" />
        <line x1="27" y1="20" x2="27" y2="44" />
        <line x1="36" y1="20" x2="36" y2="44" />
        <line x1="45" y1="20" x2="45" y2="44" />
      </g>
      <line x1="14" y1="46" x2="49" y2="18" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}
