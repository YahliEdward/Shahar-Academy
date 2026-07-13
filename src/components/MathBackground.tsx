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

  const formulas: { text: React.ReactNode; top: string; left: string; delay: string }[] = [
    { text: 'a² + b² = c²', top: '14%', left: '30%', delay: '0.4s' },
    { text: <>e<sup>iπ</sup> + 1 = 0</>, top: '40%', left: '60%', delay: '1.6s' },
    { text: 'f(x) = ax² + bx + c', top: '66%', left: '55%', delay: '2.8s' },
    { text: '∫ x dx', top: '78%', left: '40%', delay: '1.0s' },
    { text: 'sin²θ + cos²θ = 1', top: '30%', left: '74%', delay: '2.2s' },
  ]

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* Whiteboard base + graph-paper grid texture */}
      <div className="absolute inset-0 bg-[#fafbfc] math-bg" />

      {/* Soft blue glow blobs — radial-gradient instead of filter:blur, which is expensive to
          rasterize on mobile GPUs at this size and can visibly delay first paint */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px]"
        style={{ background: 'radial-gradient(closest-side, rgba(37,99,235,0.07), transparent 70%)' }}
      />
      <div
        className="absolute top-1/2 -right-40 w-[500px] h-[500px]"
        style={{ background: 'radial-gradient(closest-side, rgba(59,130,246,0.05), transparent 70%)' }}
      />
      <div
        className="absolute bottom-0 -left-40 w-[500px] h-[500px]"
        style={{ background: 'radial-gradient(closest-side, rgba(37,99,235,0.04), transparent 70%)' }}
      />

      {/* Floating math symbols — faint blue marker strokes */}
      {symbols.map((s, i) => (
        <span
          key={i}
          className={`absolute ${s.size} font-black text-blue-600/[0.14] math-float`}
          style={{ top: s.top, left: s.left, animationDelay: s.delay }}
        >
          {s.char}
        </span>
      ))}

      {/* Floating formulas */}
      {formulas.map((f, i) => (
        <span
          key={i}
          className="absolute text-2xl font-mono font-semibold text-blue-600/[0.12] math-float whitespace-nowrap"
          style={{ top: f.top, left: f.left, animationDelay: f.delay }}
        >
          {f.text}
        </span>
      ))}
    </div>
  )
}
