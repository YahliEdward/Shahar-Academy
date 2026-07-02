import type { Metadata } from "next"
import { Heebo } from "next/font/google"
import "./globals.css"
import MathBackground from "@/components/MathBackground"
import { PHONE, SITE_URL } from "@/lib/constants"

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-heebo",
  display: "swap",
})

const TITLE = "האקדמיה למתמטיקה של שחר"
const DESCRIPTION = "הדרך שלכם ל-5 יחידות מתחילה כאן. קבוצות למידה קטנות ואישיות — עד 6 תלמידים בקבוצה."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  icons: { icon: '/logo.png', apple: '/logo.png' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/',
    siteName: TITLE,
    locale: 'he_IL',
    type: 'website',
    images: [{ url: '/logo.png', width: 1254, height: 1254, alt: TITLE }],
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/logo.png'],
  },
}

// Structured data so Google understands this is a tutoring business.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: TITLE,
  description: DESCRIPTION,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  telephone: PHONE,
  areaServed: { '@type': 'Country', name: 'Israel' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="min-h-screen bg-[#0b0f19] text-slate-100 font-[family-name:var(--font-heebo)]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <MathBackground />
        {children}
      </body>
    </html>
  )
}
