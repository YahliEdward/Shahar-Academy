export default function ShaharLogo({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <clipPath id="sl-top">
          <polygon points="0,0 200,0 200,78 0,128" />
        </clipPath>
        <clipPath id="sl-bot">
          <polygon points="0,148 200,98 200,200 0,200" />
        </clipPath>
      </defs>

      {/* Black rounded background */}
      <rect width="200" height="200" rx="44" fill="#111111" />

      {/* Bold S — top half (above diagonal cut) */}
      <text
        x="103"
        y="162"
        textAnchor="middle"
        fontSize="192"
        fill="#facc15"
        style={{ fontFamily: 'var(--font-heebo), "Arial Black", Impact, sans-serif', fontWeight: 900 }}
        clipPath="url(#sl-top)"
      >S</text>

      {/* Bold S — bottom half (below diagonal cut) */}
      <text
        x="103"
        y="162"
        textAnchor="middle"
        fontSize="192"
        fill="#facc15"
        style={{ fontFamily: 'var(--font-heebo), "Arial Black", Impact, sans-serif', fontWeight: 900 }}
        clipPath="url(#sl-bot)"
      >S</text>

      {/* + — upper-right counter area */}
      <line x1="156" y1="54" x2="156" y2="76" stroke="#facc15" strokeWidth="7" strokeLinecap="round" />
      <line x1="145" y1="65" x2="167" y2="65" stroke="#facc15" strokeWidth="7" strokeLinecap="round" />

      {/* ÷ — lower-left counter area */}
      <circle cx="46" cy="125" r="5.5" fill="#facc15" />
      <line x1="30" y1="137" x2="62" y2="137" stroke="#facc15" strokeWidth="7" strokeLinecap="round" />
      <circle cx="46" cy="149" r="5.5" fill="#facc15" />
    </svg>
  )
}
