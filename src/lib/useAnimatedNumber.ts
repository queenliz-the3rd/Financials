import { useEffect, useRef, useState } from 'react'

// Smoothly animates a number toward `value` whenever it changes (easeOutCubic).
// Respects prefers-reduced-motion by jumping straight to the value.
export function useAnimatedNumber(value: number, duration = 700): number {
  const [display, setDisplay] = useState(value)
  const displayRef = useRef(value)
  const rafRef = useRef(0)

  useEffect(() => {
    const from = displayRef.current
    const to = value
    if (Math.abs(to - from) < 0.005) {
      displayRef.current = to
      setDisplay(to)
      return
    }

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      displayRef.current = to
      setDisplay(to)
      return
    }

    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = from + (to - from) * eased
      displayRef.current = v
      setDisplay(v)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else {
        displayRef.current = to
        setDisplay(to)
      }
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  return display
}
