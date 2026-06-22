import type { ReactNode } from 'react'
import { clamp } from '../lib/format'

interface ProgressRingProps {
  value: number // 0..1
  size?: number
  stroke?: number
  color?: string
  track?: string
  children?: ReactNode
}

export default function ProgressRing({
  value,
  size = 116,
  stroke = 12,
  color = '#cdb4f6',
  track = '#efe9f7',
  children,
}: ProgressRingProps) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - clamp(value))

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  )
}
