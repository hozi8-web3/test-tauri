import { useEffect, useState, ReactNode } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useStore } from './store'
import logo from './assets/general-logo.jpeg'
import {
  Lock, ShoppingCart, Package, BarChart2,
  Layers, Banknote, Settings, ChevronRight, Activity, FileText
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

const NAV_ITEMS = [
  { icon: ShoppingCart, label: 'Point of Sale', shortcut: 'F2', path: '/pos' },
  { icon: Package, label: 'Products', path: '/products', locked: true },
  { icon: Layers, label: 'Inventory', path: '/inventory', locked: true },
  { icon: BarChart2, label: 'Reports', path: '/reports', locked: true },
  { icon: FileText, label: 'Receipts', path: '/receipts' },
  { icon: Banknote, label: 'Cash Drawer', path: '/cash-drawer', locked: true },
  { icon: Settings, label: 'Settings', path: '/settings', locked: true },
]

const SidebarItem = ({ icon: Icon, label, shortcut, path, active, locked }: {
  icon: any; label: string; shortcut?: string; path: string; active: boolean; locked?: boolean
}) => (
  <a
    href={`#${path}`}
    className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 relative
      ${active
        ? 'bg-slate-800 text-white'
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
      }`}
  >
    {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-green-400 rounded-r-full" />}
    <Icon size={15} className={active ? 'text-green-400' : 'text-slate-500 group-hover:text-slate-300'} />
    <span className="flex-1">{label}</span>
    {locked && <Lock size={9} className="text-slate-600 flex-shrink-0" />}
    {shortcut && (
      <span className="text-[10px] text-slate-600 bg-slate-800 px-1 py-0.5 rounded font-mono">{shortcut}</span>
    )}
    {active && <ChevronRight size={12} className="text-slate-600" />}
  </a>
)

const Layout = ({ children }: { children: ReactNode }) => {
  const { setAuth } = useStore()
  const location = useLocation()
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
  )
  const dateStr = new Date().toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })

  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }))
    }, 30000)
    return () => clearInterval(t)
  }, [])

  const currentPage = NAV_ITEMS.find(n => n.path === location.pathname)?.label ?? 'Dashboard'

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 flex flex-col bg-slate-900">
        {/* Logo */}
        <div className="flex flex-col items-center gap-1.5 px-4 py-4 border-b border-slate-800">
          <img src={logo} alt="Al-Barkat" className="w-16 h-16 object-contain mix-blend-screen opacity-95 drop-shadow-lg" />
          <div className="text-center">
            <div className="text-sm font-bold text-white leading-tight">Al-Barkat Mart</div>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <div className="text-[10px] text-slate-500 leading-tight">POS v1.0</div>
              <Activity size={9} className="text-green-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Menu</p>
          {NAV_ITEMS.map(item => (
            <SidebarItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              shortcut={item.shortcut}
              path={item.path}
              locked={item.locked}
              active={location.pathname === item.path || (location.pathname === '/' && item.path === '/pos')}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-2 pb-3 pt-2 border-t border-slate-800 space-y-1">
          <div className="flex items-center gap-2 px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-slate-500 font-mono">{time} · {dateStr}</span>
          </div>
          <button
            onClick={() => setAuth(false)}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Lock size={13} />
            <span>Lock Screen</span>
            <span className="ml-auto text-[10px] font-mono bg-slate-800 px-1 py-0.5 rounded text-slate-600">F12</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-9 bg-white border-b border-slate-200 flex items-center px-4 gap-2 shrink-0 shadow-sm">
          <span className="text-slate-300 text-xs">/</span>
          <span className="text-xs font-semibold text-slate-700">{currentPage}</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-mono">PKR · Al-Barkat Mart</span>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" title="Online" />
          </div>
        </header>

        {/* Content — pages are responsible for their own scroll */}
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  )
}

// Wrapper so each route gets Layout with its own component
const Page = ({ component: Comp }: { component: () => React.ReactElement }) => (
  <Layout><Comp /></Layout>
)

function AppRoutes() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)
  const { isLocked, setAuth } = useStore()

  useEffect(() => {
    const checkSetup = async () => {
      // window.api is injected by Electron's preload — it's undefined in a plain browser
      if (!window.api) {
        setNeedsSetup(false) // skip setup check; show "not in Electron" UI below
        return
      }
      const res = await window.api.db.get("SELECT COUNT(*) as count FROM owner")
      setNeedsSetup(res.success && res.row.count === 0)
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
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="flex items-center gap-3 text-white">
          <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Starting Al-Barkat POS…</span>
        </div>
      </div>
    )
  }

  // window.api is only available inside Electron — show a helpful message in browser
  if (!window.api) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-sm text-center shadow-2xl">
          <div className="text-4xl mb-4">🖥️</div>
          <h1 className="text-white font-bold text-base mb-2">Open in Electron</h1>
          <p className="text-slate-400 text-xs leading-relaxed">
            Al-Barkat POS requires the Electron app to access the database.<br /><br />
            Run <code className="bg-slate-700 text-green-400 px-1.5 py-0.5 rounded text-xs">npm run dev</code> and open the <strong className="text-white">desktop app window</strong>, not this browser tab.
          </p>
        </div>
      </div>
    )
  }

  if (needsSetup) return (
    <Routes>
      <Route path="*" element={<SetupWizard />} />
    </Routes>
  )

  if (isLocked) return (
    <Routes>
      <Route path="*" element={<Login />} />
    </Routes>
  )

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
