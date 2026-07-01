export default function ShaharLogo({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="לוגו האקדמיה למתמטיקה של שחר"
      style={{ height: size, width: 'auto' }}
      className={className}
    />
  )
}
