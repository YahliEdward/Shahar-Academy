import type { MetadataRoute } from 'next'

// Web app manifest — lets the site be installed to a phone's home screen,
// which is what enables push notifications on iOS (16.4+) for the admin.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'שחר מורה פרטי',
    short_name: 'שחר',
    description: 'הדרך שלכם ל-5 יחידות מתחילה כאן',
    start_url: '/admin',
    display: 'standalone',
    dir: 'rtl',
    lang: 'he',
    background_color: '#1c2440',
    theme_color: '#1c2440',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
