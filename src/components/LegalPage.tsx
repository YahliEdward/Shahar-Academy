import Link from 'next/link'
import Navbar from './Navbar'
import Footer from './Footer'

// Shared shell for the plain-text legal pages (accessibility statement,
// privacy policy): same chrome as /schedule, with a readable text column.
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  return (
    <main>
      <Navbar />
      <div className="pt-20 sm:pt-24 px-4">
        <div className="max-w-3xl mx-auto pt-4 pb-16">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <span aria-hidden>→</span> חזרה לדף הבית
          </Link>
          <article className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-10 text-slate-700 leading-relaxed [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pr-5 [&_ul]:space-y-1.5 [&_ul]:mb-3 [&_a]:text-blue-600 [&_a]:underline">
            <h1 className="text-3xl font-black text-slate-900 mb-2">{title}</h1>
            <p className="text-sm text-slate-400 mb-6">עודכן לאחרונה: {updated}</p>
            {children}
          </article>
        </div>
      </div>
      <Footer />
    </main>
  )
}
