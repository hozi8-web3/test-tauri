import { useEffect, useState, type ReactNode } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useStore } from './store'
import logo from './assets/general-logo.jpeg'
import {
  Lock, ShoppingCart, Package, BarChart2,
  Layers, Banknote, Settings, Activity, FileText, LogOut
} from 'lucide-react'

import { SetupWizard } from './components/SetupWizard'
import { Login } from './components/Login'
import { POS } from './components/POS'
import { Products } from './components/Products'
import { Inventory } from './components/Inventory'
import { Reports } from './components/Reports'
import { Receipts } from './components/Receipts'
import { CashDrawer } from './components/CashDrawer'
import { SettingsPage } from './components/Settings'
import { PinGate } from './components/PinGate'

const NAV = [
  { icon: ShoppingCart, label: 'Point of Sale', shortcut: 'F2', path: '/pos' },
  { icon: Package, label: 'Products', path: '/products', locked: true },
  { icon: Layers, label: 'Inventory', path: '/inventory', locked: true },
  { icon: BarChart2, label: 'Reports', path: '/reports', locked: true },
  { icon: FileText, label: 'Receipts', path: '/receipts' },
  { icon: Banknote, label: 'Cash Drawer', path: '/cash-drawer', locked: true },
  { icon: Settings, label: 'Settings', path: '/settings', locked: true },
]

const SidebarItem = ({ icon: Icon, label, shortcut, path, active, locked }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string; shortcut?: string; path: string; active: boolean; locked?: boolean
}) => (
  <a href={`#${path}`}
    className="group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer"
    style={active
      ? { background: 'rgba(16,185,129,0.12)', color: 'white', border: '1px solid rgba(16,185,129,0.2)' }
      : { color: 'rgba(148,163,184,0.8)', border: '1px solid transparent' }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
  >
    {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: '#10b981' }} />}
    <Icon size={15} className={active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-400'} />
    <span className="flex-1 truncate">{label}</span>
    {locked && <Lock size={9} style={{ color: 'rgba(71,85,105,0.7)', flexShrink: 0 }} />}
    {shortcut && (
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md"
        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(100,116,139,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {shortcut}
      </span>
    )}
  </a>
)

const Layout = ({ children }: { children: ReactNode }) => {
  const { setAuth, currentUser } = useStore()
  const location = useLocation()
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }))
  const dateStr = new Date().toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })), 30000)
    return () => clearInterval(t)
  }, [])

  const currentPage = NAV.find(n => n.path === location.pathname)?.label ?? 'Dashboard'

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: '#f0f4f8' }}>
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 flex flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0d1425 0%, #0f172a 100%)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>

        {/* Subtle background glow */}
        <div className="absolute top-0 left-0 w-full h-48 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative z-10 flex flex-col items-center gap-2 px-4 py-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl blur-lg opacity-25" style={{ background: '#10b981' }} />
            <img src={logo} alt="Al-Barkat" className="relative w-12 h-12 rounded-2xl object-contain"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-white leading-tight">Al-Barkat Mart</div>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <Activity size={8} className="text-emerald-400 animate-pulse" />
              <span className="text-[10px] text-slate-500">POS Enterprise</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          <p className="px-2 mb-2.5 text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(71,85,105,0.8)' }}>Navigation</p>
          {NAV.map(item => (
            <SidebarItem key={item.path} {...item}
              active={location.pathname === item.path || (location.pathname === '/' && item.path === '/pos')} />
          ))}
        </nav>

        {/* Footer */}
        <div className="relative z-10 px-2.5 pb-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* User info */}
          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-2 mb-1 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                {currentUser.username[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white font-medium truncate">{currentUser.username}</div>
                <div className="text-[10px]" style={{ color: 'rgba(100,116,139,0.8)' }}>{currentUser.role}</div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-[10px] font-mono" style={{ color: 'rgba(71,85,105,0.8)' }}>{time} · {dateStr}</span>
          </div>
          <button onClick={() => setAuth(false)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
            style={{ color: 'rgba(100,116,139,0.7)', border: '1px solid transparent' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(100,116,139,0.7)'; e.currentTarget.style.borderColor = 'transparent' }}>
            <LogOut size={12} />
            <span>Lock Screen</span>
            <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(71,85,105,0.7)' }}>F12</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-10 bg-white flex items-center px-5 gap-3 flex-shrink-0"
          style={{ borderBottom: '1px solid #e8eef4', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <span className="text-slate-300 text-xs">/</span>
          <span className="text-xs font-semibold text-slate-700">{currentPage}</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[10px] font-medium px-2.5 py-1 rounded-lg"
              style={{ background: '#f0f9f5', color: '#059669', border: '1px solid #d1fae5' }}>
              PKR · {currentUser?.username ?? 'Al-Barkat'}
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-400" title="Online" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  )
}

const Page = ({ component: Comp }: { component: () => React.ReactElement }) => (
  <Layout><Comp /></Layout>
)

function AppRoutes() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)
  const { isLocked, setAuth } = useStore()

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await window.api.db.get("SELECT COUNT(*) as count FROM users WHERE role = 'Admin'")
        if (res.success && res.row) {
          const count = res.row.count as number
          setNeedsSetup(count === 0)
        } else {
          setNeedsSetup(true)
        }
      } catch {
        setNeedsSetup(true)
      }
    }
    checkSetup()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') { e.preventDefault(); setAuth(false); window.location.hash = '/login' }
      if (e.key === 'F2') { e.preventDefault(); window.location.hash = '/pos' }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setAuth])

  if (needsSetup === null) {
    return (
      <div className="flex h-screen items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a0f1e, #0f172a)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-slate-400 text-sm font-medium">Starting Al-Barkat POS…</span>
        </div>
      </div>
    )
  }

  if (needsSetup) return <Routes><Route path="*" element={<SetupWizard />} /></Routes>
  if (isLocked) return <Routes><Route path="*" element={<Login />} /></Routes>

  return (
    <Routes>
      <Route path="/" element={<Page component={POS} />} />
      <Route path="/pos" element={<Page component={POS} />} />
      <Route path="/products" element={<Page component={() => <PinGate><Products /></PinGate>} />} />
      <Route path="/inventory" element={<Page component={() => <PinGate><Inventory /></PinGate>} />} />
      <Route path="/reports" element={<Page component={() => <PinGate><Reports /></PinGate>} />} />
      <Route path="/receipts" element={<Page component={Receipts} />} />
      <Route path="/cash-drawer" element={<Page component={() => <PinGate><CashDrawer /></PinGate>} />} />
      <Route path="/settings" element={<Page component={() => <PinGate><SettingsPage /></PinGate>} />} />
      <Route path="*" element={<Navigate to="/pos" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}

export default App
