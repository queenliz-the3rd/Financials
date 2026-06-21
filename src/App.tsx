import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { LogOut, Cloud, HardDrive } from 'lucide-react'
import { Sidebar, BottomNav, type Page } from './components/Nav'
import Auth from './components/Auth'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import { DataProvider } from './context/DataContext'
import { supabase, isSupabaseConfigured } from './lib/supabase'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Loading…
      </div>
    )
  }

  if (isSupabaseConfigured && !session) {
    return <Auth />
  }

  return (
    <DataProvider>
      <div className="mx-auto flex min-h-screen w-full max-w-6xl">
        <Sidebar page={page} onChange={setPage} />

        <main className="flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10">
          {/* Mobile header */}
          <div className="mb-4 flex items-center justify-between md:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-lavender text-base font-extrabold text-white">
                P
              </div>
              <span className="text-lg font-extrabold">Penny</span>
            </div>
            <ModeBadge onSignOut={() => supabase?.auth.signOut()} />
          </div>

          {/* Desktop top-right mode badge */}
          <div className="mb-2 hidden justify-end md:flex">
            <ModeBadge onSignOut={() => supabase?.auth.signOut()} />
          </div>

          <div key={page} className="animate-fade-in">
            {page === 'dashboard' && <Dashboard go={setPage} />}
            {page === 'transactions' && <Transactions />}
            {page === 'budgets' && <Budgets />}
            {page === 'goals' && <Goals />}
          </div>
        </main>

        <BottomNav page={page} onChange={setPage} />
      </div>
    </DataProvider>
  )
}

function ModeBadge({ onSignOut }: { onSignOut: () => void }) {
  if (isSupabaseConfigured) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-muted shadow-card">
        <Cloud size={14} className="text-lavender" /> Synced
        <button
          onClick={onSignOut}
          className="ml-1 flex items-center gap-1 text-muted hover:text-rose-500"
        >
          <LogOut size={13} /> Sign out
        </button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-muted shadow-card">
      <HardDrive size={14} className="text-lavender" /> Saved on this device
    </div>
  )
}
