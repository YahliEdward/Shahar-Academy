export default function MarkerUnderline({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 12"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Single clean marker swoosh — gentle arc with a slight tail lift */}
      <path
        d="M5 8.5 C 50 3.5, 105 2.5, 150 4.5 C 168 5.3, 184 6.5, 195 7.5"
        stroke="#2563eb"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}
