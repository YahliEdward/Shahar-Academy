export default function MathBackground() {
  // Subtle, decorative math motifs scattered across the page background.
  const symbols = [
    { char: '∑', top: '8%', left: '6%', size: 'text-7xl', delay: '0s' },
    { char: 'π', top: '18%', left: '88%', size: 'text-6xl', delay: '1.2s' },
    { char: '∫', top: '34%', left: '14%', size: 'text-8xl', delay: '2.4s' },
    { char: '√', top: '46%', left: '78%', size: 'text-7xl', delay: '0.6s' },
    { char: '∞', top: '60%', left: '9%', size: 'text-6xl', delay: '1.8s' },
    { char: 'θ', top: '70%', left: '90%', size: 'text-7xl', delay: '3s' },
    { char: 'Δ', top: '82%', left: '20%', size: 'text-6xl', delay: '0.9s' },
    { char: 'ƒ', top: '90%', left: '70%', size: 'text-7xl', delay: '2.1s' },
    { char: 'φ', top: '26%', left: '50%', size: 'text-6xl', delay: '1.5s' },
    { char: '≈', top: '54%', left: '40%', size: 'text-6xl', delay: '2.7s' },
  ]

  const formulas = [
    { text: 'a² + b² = c²', top: '14%', left: '30%', delay: '0.4s' },
    { text: 'eⁱᵖ + 1 = 0', top: '40%', left: '60%', delay: '1.6s' },
    { text: 'f(x) = ax² + bx + c', top: '66%', left: '55%', delay: '2.8s' },
    { text: '∫ x dx', top: '78%', left: '40%', delay: '1.0s' },
    { text: 'sin²θ + cos²θ = 1', top: '30%', left: '74%', delay: '2.2s' },
  ]

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* Base color + grid texture */}
      <div className="absolute inset-0 bg-[#0b0f19] math-bg" />

      {/* Soft gold glow blobs */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-yellow-400/10 blur-[140px]" />
      <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full bg-yellow-500/[0.06] blur-[130px]" />
      <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] rounded-full bg-amber-500/[0.05] blur-[130px]" />

      {/* Subtle radial vignette to deepen edges */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55)_100%)]" />

      {/* Floating math symbols */}
      {symbols.map((s, i) => (
        <span
          key={i}
          className={`absolute ${s.size} font-black text-yellow-400/[0.05] math-float`}
          style={{ top: s.top, left: s.left, animationDelay: s.delay }}
        >
          {s.char}
        </span>
      ))}

      {/* Floating formulas */}
      {formulas.map((f, i) => (
        <span
          key={i}
          className="absolute text-2xl font-mono font-semibold text-yellow-400/[0.04] math-float whitespace-nowrap"
          style={{ top: f.top, left: f.left, animationDelay: f.delay }}
        >
          {f.text}
        </span>
      ))}
    </div>
  )
}
