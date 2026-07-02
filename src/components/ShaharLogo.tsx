import Image from 'next/image'

export default function ShaharLogo({ size = 48, className = '' }: { size?: number; className?: string }) {
  // The source PNG is 1254×1254 — next/image serves a resized version instead
  // of shipping the full-size file for a ~40px logo.
  return (
    <Image
      src="/logo.png"
      alt="לוגו האקדמיה למתמטיקה של שחר"
      width={size}
      height={size}
      className={className}
    />
  )
}
