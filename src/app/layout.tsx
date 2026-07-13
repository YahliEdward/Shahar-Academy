import type { Metadata } from "next"
import { Heebo } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import MathBackground from "@/components/MathBackground"
import { PHONE, SITE_URL } from "@/lib/constants"

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-heebo",
  display: "swap",
})
const TITLE = "שחר מורה פרטי"
const DESCRIPTION = "הדרך שלכם להצלחה במתמטיקה מתחילה כאן. קבוצות למידה קטנות ואישיות — עד 6 תלמידים בקבוצה."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/',
    siteName: TITLE,
    locale: 'he_IL',
    type: 'website',
    // WhatsApp won't show preview images over ~600KB — this one is a 58KB JPEG.
    images: [{ url: '/og-image.jpg', width: 512, height: 512, alt: TITLE }],
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.jpg'],
  },
}

// Structured data so Google understands this is a tutoring business.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: TITLE,
  description: DESCRIPTION,
  url: SITE_URL,
  logo: `${SITE_URL}/og-image.jpg`,
  telephone: PHONE,
  areaServed: { '@type': 'Country', name: 'Israel' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="min-h-screen bg-[#ece8db] text-slate-800 font-[family-name:var(--font-heebo)]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <MathBackground />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
