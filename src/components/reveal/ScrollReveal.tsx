'use client'

import { useRef, ReactNode } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap, EASE, prefersReducedMotion } from '@/lib/gsap'

export default function ScrollReveal({
  children,
  selector = ':scope > *',
  stagger = 0.12,
  className = '',
  id,
}: {
  children: ReactNode
  selector?: string
  stagger?: number
  className?: string
  id?: string
}) {
  const scope = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (prefersReducedMotion() || !scope.current) return

    const targets = scope.current.querySelectorAll(selector)
    if (!targets.length) return

    gsap.set(targets, { opacity: 0, y: 24 })

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        gsap.to(targets, { opacity: 1, y: 0, stagger, duration: 0.6, ease: EASE })
        observer.disconnect()
      },
      { threshold: 0, rootMargin: '0px 0px -15% 0px' }
    )
    observer.observe(scope.current)

    return () => observer.disconnect()
  }, { scope })

  return (
    <div ref={scope} id={id} className={className}>
      {children}
    </div>
  )
}
