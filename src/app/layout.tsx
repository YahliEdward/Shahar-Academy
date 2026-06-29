import type { Metadata } from "next"
import { Heebo } from "next/font/google"
import "./globals.css"
import MathBackground from "@/components/MathBackground"

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-heebo",
  display: "swap",
})

export const metadata: Metadata = {
  title: "האקדמיה למתמטיקה של שחר",
  description: "הדרך שלכם ל-5 יחידות מתחילה כאן. קבוצות למידה קטנות ואישיות.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="min-h-screen bg-[#0b0f19] text-slate-100 font-[family-name:var(--font-heebo)]">
        <MathBackground />
        {children}
      </body>
    </html>
  )
}
