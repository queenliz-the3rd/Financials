import { LayoutDashboard, ArrowLeftRight, PiggyBank, Target, Settings } from 'lucide-react'

export type Page = 'dashboard' | 'transactions' | 'budgets' | 'goals' | 'settings'

const ITEMS: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'transactions', label: 'Activity', icon: ArrowLeftRight },
  { id: 'budgets', label: 'Budgets', icon: PiggyBank },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar({
  page,
  onChange,
}: {
  page: Page
  onChange: (p: Page) => void
}) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-1 p-4 md:flex">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lavender text-lg font-extrabold text-white shadow-soft">
          P
        </div>
        <div>
          <p className="text-lg font-extrabold leading-none">Penny</p>
          <p className="text-xs text-muted">money, made calm</p>
        </div>
      </div>
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const active = page === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition ${
              active
                ? 'bg-white text-ink shadow-card'
                : 'text-muted hover:bg-white/60 hover:text-ink'
            }`}
          >
            <Icon size={18} className={active ? 'text-lavender' : ''} />
            {label}
          </button>
        )
      })}
    </aside>
  )
}

export function BottomNav({
  page,
  onChange,
}: {
  page: Page
  onChange: (p: Page) => void
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/70 bg-white/80 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-between">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const active = page === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${
                active ? 'text-lavender' : 'text-muted'
              }`}
            >
              <Icon size={20} />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
