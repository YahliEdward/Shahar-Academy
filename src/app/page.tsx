import { redirect } from 'next/navigation'
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
import { isAdmin } from '@/lib/auth'

export default async function HomePage() {
  if (await isAdmin()) {
    redirect('/admin')
  }

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
