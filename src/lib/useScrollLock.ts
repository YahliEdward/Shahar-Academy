import { useEffect } from 'react'

// Reference-counted so nested overlays (e.g. a confirm dialog opened from
// within another modal) don't release the lock until all of them are closed.
// Also pads for the vanishing scrollbar so hiding it doesn't shift page
// content sideways — that shift is what reads as the page "shaking".
let lockCount = 0
let savedOverflow = ''
let savedPaddingRight = ''

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return

    if (lockCount === 0) {
      savedOverflow = document.body.style.overflow
      savedPaddingRight = document.body.style.paddingRight
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      if (scrollbarWidth > 0) {
        const currentPadding = parseFloat(getComputedStyle(document.body).paddingRight) || 0
        document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`
      }
    }
    lockCount++

    return () => {
      lockCount--
      if (lockCount === 0) {
        document.body.style.overflow = savedOverflow
        document.body.style.paddingRight = savedPaddingRight
      }
    }
  }, [active])
}
