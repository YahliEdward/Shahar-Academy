import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import TrustBar from '@/components/TrustBar'
import Features from '@/components/Features'
import WhyChooseUs from '@/components/WhyChooseUs'
import AboutShahar from '@/components/AboutShahar'
import Testimonials from '@/components/Testimonials'
import FAQ from '@/components/FAQ'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'

// TrustBar and Testimonials are async server components reading live data, so
// the page must not stay frozen at its build-time prerender: without this it
// served whatever the last deploy computed, and an approved review never
// reached the public site. Five minutes keeps the page fast and static-ish
// while bounding staleness; review moderation additionally calls
// revalidatePath('/') for an immediate refresh.
export const revalidate = 300

// Note: an admin session no longer auto-redirects "/" to /admin — the admin
// header's "לאתר" link (and the logo) must be able to reach the public site.
export default function HomePage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <TrustBar />
      <Features />
      <WhyChooseUs />
      <AboutShahar />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  )
}
