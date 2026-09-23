import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 py-8 px-4 text-center text-sm text-slate-400">
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>© {new Date().getFullYear()} שחר מורה פרטי. כל הזכויות שמורות.</div>
        <nav aria-label="קישורים משפטיים" className="flex items-center gap-4 text-xs">
          <Link href="/accessibility" className="hover:text-slate-600 transition-colors">
            הצהרת נגישות
          </Link>
          <Link href="/privacy" className="hover:text-slate-600 transition-colors">
            מדיניות פרטיות
          </Link>
          <Link href="/admin" className="text-slate-300 hover:text-slate-500 transition-colors">
            כניסה למורה
          </Link>
        </nav>
      </div>
    </footer>
  )
}
