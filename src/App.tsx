import { useState } from 'react'
import { LogOut, Cloud, HardDrive, Lock } from 'lucide-react'
import { Sidebar, BottomNav, type Page } from './components/Nav'
import Login from './components/Login'
import PinSetup from './components/PinSetup'
import PinLock from './components/PinLock'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import ToBuy from './pages/ToBuy'
import SettingsPage from './pages/Settings'
import { DataProvider } from './context/DataContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { isSupabaseConfigured } from './lib/supabase'

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

function Gate() {
  const { phase } = useAuth()

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">Loading…</div>
    )
  }
  if (phase === 'login') return <Login />
  if (phase === 'setpin') return <PinSetup />
  if (phase === 'lock') return <PinLock />

  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  )
}

function Shell() {
  const [page, setPage] = useState<Page>('dashboard')
  const { signOut, lock } = useAuth()

  return (
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
          <AccountBadge onSignOut={signOut} onLock={lock} />
        </div>

        {/* Desktop top-right badge */}
        <div className="mb-2 hidden justify-end md:flex">
          <AccountBadge onSignOut={signOut} onLock={lock} />
        </div>

        <div key={page} className="animate-fade-in">
          {page === 'dashboard' && <Dashboard go={setPage} />}
          {page === 'transactions' && <Transactions />}
          {page === 'budgets' && <Budgets />}
          {page === 'goals' && <Goals />}
          {page === 'tobuy' && <ToBuy />}
          {page === 'settings' && <SettingsPage />}
        </div>
      </main>

      <BottomNav page={page} onChange={setPage} />
    </div>
  )
}

function AccountBadge({ onSignOut, onLock }: { onSignOut: () => void; onLock: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-muted shadow-card">
      {isSupabaseConfigured ? (
        <>
          <Cloud size={14} className="text-lavender" /> Synced
        </>
      ) : (
        <>
          <HardDrive size={14} className="text-lavender" /> On this device
        </>
      )}
      <button
        onClick={onLock}
        className="ml-1 flex items-center gap-1 text-muted hover:text-ink"
        title="Lock with PIN"
      >
        <Lock size={13} /> Lock
      </button>
      <button
        onClick={onSignOut}
        className="flex items-center gap-1 text-muted hover:text-rose-500"
      >
        <LogOut size={13} /> Sign out
      </button>
    </div>
  )
}
