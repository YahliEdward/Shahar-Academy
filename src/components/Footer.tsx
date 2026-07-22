import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 py-8 px-4 text-center text-sm text-slate-400">
      <div className="max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>© {new Date().getFullYear()} שחר מורה פרטי. כל הזכויות שמורות.</div>
        <Link
          href="/admin"
          className="text-slate-300 hover:text-slate-500 transition-colors text-xs"
        >
          כניסה למורה
        </Link>
      </div>
    </footer>
  )
}
