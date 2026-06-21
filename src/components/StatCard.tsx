import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string
  icon: ReactNode
  tint: string
  sub?: string
}

export default function StatCard({ label, value, icon, tint, sub }: StatCardProps) {
  return (
    <div className="card animate-fade-in p-5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ background: tint }}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {label}
          </p>
          <p className="text-2xl font-extrabold leading-tight">{value}</p>
        </div>
      </div>
      {sub && <p className="mt-3 text-xs text-muted">{sub}</p>}
    </div>
  )
}
