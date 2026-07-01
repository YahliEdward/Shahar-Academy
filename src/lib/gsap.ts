import { gsap } from 'gsap'

export const EASE = 'power3.out'
export const DURATION = 0.6

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export { gsap }
