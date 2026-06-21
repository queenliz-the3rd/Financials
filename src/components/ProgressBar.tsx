import { clamp } from '../lib/format'

interface ProgressBarProps {
  value: number // 0..1
  color?: string
  over?: boolean
}

export default function ProgressBar({ value, color = '#cdb4f6', over }: ProgressBarProps) {
  const pct = clamp(value) * 100
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-lilac/40">
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${pct}%`,
          background: over ? '#ff9aa8' : color,
        }}
      />
    </div>
  )
}
