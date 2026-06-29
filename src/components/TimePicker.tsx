'use client'

export default function TimePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [hhStr, mmStr] = value.split(':')
  const hh = parseInt(hhStr, 10) || 0
  const mm = parseInt(mmStr, 10) || 0

  const pad = (n: number) => String(n).padStart(2, '0')

  const setHour = (raw: number) => {
    const h = Math.max(0, Math.min(23, raw))
    onChange(`${pad(h)}:${pad(mm)}`)
  }
  const setMinute = (raw: number) => {
    const m = Math.max(0, Math.min(59, raw))
    onChange(`${pad(hh)}:${pad(m)}`)
  }

  const inputStyle: React.CSSProperties = {
    width: 38,
    background: '#3f3f46',
    border: '1px solid #52525b',
    borderRadius: 6,
    padding: '3px 0',
    color: '#facc15',
    fontWeight: 700,
    fontSize: 14,
    textAlign: 'center',
    outline: 'none',
    direction: 'ltr',
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, direction: 'ltr' }}>
      <input
        type="number"
        min={0}
        max={23}
        value={pad(hh)}
        onChange={(e) => setHour(parseInt(e.target.value, 10))}
        style={inputStyle}
      />
      <span style={{ color: '#71717a', fontSize: 14 }}>:</span>
      <input
        type="number"
        min={0}
        max={59}
        value={pad(mm)}
        onChange={(e) => setMinute(parseInt(e.target.value, 10))}
        style={inputStyle}
      />
    </div>
  )
}
