interface EmptyStateProps {
  emoji: string
  title: string
  hint?: string
}

export default function EmptyState({ emoji, title, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 text-4xl">{emoji}</div>
      <p className="font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-muted">{hint}</p>}
    </div>
  )
}
