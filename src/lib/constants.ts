export const STUDENTS_TAUGHT = 3000

export const PHONE = '+972503166659'
export const PHONE_DISPLAY = '050-316-6659'
export const WHATSAPP_NUMBER = '972503166659'
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`

// Production URL. Vercel injects the production host at build time; localhost is the dev fallback.
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000'
