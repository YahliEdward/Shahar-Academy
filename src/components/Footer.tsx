import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 py-8 px-4 text-center text-sm text-zinc-600">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>© {new Date().getFullYear()} שחר מורה פרטי. כל הזכויות שמורות.</div>
        <Link
          href="/admin"
          className="text-zinc-700 hover:text-zinc-400 transition-colors text-xs"
        >
          כניסה למורה
        </Link>
      </div>
    </footer>
  )
}
