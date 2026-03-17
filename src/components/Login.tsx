import { useState, useEffect, useRef } from 'react'
import { useStore, type User } from '../store'
import logo from '../assets/general-logo.jpeg'
import { Delete } from 'lucide-react'

export const Login = () => {
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [attempts, setAttempts] = useState(0)
    const [lockedUntil, setLockedUntil] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)
    const { setAuth } = useStore()

    const pinRef = useRef(pin)
    const attemptsRef = useRef(attempts)
    const lockedUntilRef = useRef(lockedUntil)
    pinRef.current = pin
    attemptsRef.current = attempts
    lockedUntilRef.current = lockedUntil

    useEffect(() => {
        if (!lockedUntil) return
        const interval = setInterval(() => {
            if (Date.now() >= (lockedUntilRef.current ?? 0)) {
                setLockedUntil(null); setAttempts(0); setError('')
            }
        }, 1000)
        return () => clearInterval(interval)
    }, [lockedUntil])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName
            if (tag === 'SELECT' || tag === 'TEXTAREA') return
            if (lockedUntilRef.current && Date.now() < lockedUntilRef.current) return
            if (e.key >= '0' && e.key <= '9') { e.preventDefault(); setPin(prev => prev.length < 4 ? prev + e.key : prev) }
            else if (e.key === 'Backspace') { e.preventDefault(); setPin(prev => prev.slice(0, -1)) }
            else if (e.key === 'Enter') { e.preventDefault(); if (pinRef.current.length >= 4) handleSubmit(pinRef.current) }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleSubmit = async (currentPin: string) => {
        if (!currentPin || currentPin.length < 4 || loading) return
        if (lockedUntilRef.current && Date.now() < lockedUntilRef.current) return
        setLoading(true); setError('')
        try {
            const userRes = await window.api.db.get("SELECT id, username, role, pin_hash FROM users ORDER BY id ASC LIMIT 1")
            if (!userRes.success || !userRes.row) { setError('No user found — run setup first'); setLoading(false); return }
            const matchRes = await window.api.auth.compare(currentPin, userRes.row.pin_hash as string)
            if (matchRes.match) {
                const loggedUser: User = { id: userRes.row.id as number, username: userRes.row.username as string, role: userRes.row.role as string }
                setPin(''); setAuth(true, loggedUser)
            } else {
                const na = attemptsRef.current + 1
                setAttempts(na); setPin('')
                if (na >= 5) { setLockedUntil(Date.now() + 60000); setError('Too many attempts. Locked 1 min.') }
                else setError(`Wrong PIN — ${5 - na} attempt${5 - na !== 1 ? 's' : ''} left`)
            }
        } finally { setLoading(false) }
    }

    const handleKey = (key: string) => {
        if (lockedUntil && Date.now() < lockedUntil) return
        if (key === 'CLR') { setPin(''); return }
        if (key === 'OK') { handleSubmit(pin); return }
        if (pin.length < 4) setPin(prev => prev + key)
    }

    const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'OK']
    const isLocked = !!(lockedUntil && Date.now() < lockedUntil)

    return (
        <div className="flex h-screen select-none" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #0a1628 100%)' }}>
            {/* LEFT — branding */}
            <div className="hidden md:flex flex-col items-center justify-center w-1/2 px-16 gap-8 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at 20% 60%, rgba(16,185,129,0.08) 0%, transparent 60%)' }} />
                {/* Decorative circles */}
                <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full opacity-5"
                    style={{ background: 'radial-gradient(circle, #10b981, transparent)' }} />

                <div className="relative z-10 flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-3xl blur-xl opacity-30" style={{ background: '#10b981', transform: 'scale(1.2)' }} />
                        <img src={logo} alt="Al-Barkat Mart" className="relative w-24 h-24 rounded-3xl object-contain shadow-2xl"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-white tracking-tight">Al-Barkat Mart</h1>
                        <p className="text-slate-500 text-sm mt-1">Enterprise Point of Sale</p>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs"
                        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-emerald-400 font-medium">System Online</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-500">{new Date().toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    </div>

                    {/* Keyboard hint */}
                    <div className="text-center px-6 py-4 rounded-2xl text-xs leading-relaxed"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="text-slate-500 mb-2">Keyboard shortcut</div>
                        <div className="flex items-center justify-center gap-2 text-slate-400">
                            <kbd className="px-2 py-1 rounded-md text-xs font-mono" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>0–9</kbd>
                            <span className="text-slate-600">Type</span>
                            <kbd className="px-2 py-1 rounded-md text-xs font-mono" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>⌫</kbd>
                            <span className="text-slate-600">Delete</span>
                            <kbd className="px-2 py-1 rounded-md text-xs font-mono" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>↵</kbd>
                            <span className="text-slate-600">Login</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT — PIN Keypad */}
            <div className="flex-1 flex flex-col items-center justify-center p-8"
                style={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-full max-w-[240px]">
                    <div className="text-center mb-8">
                        <h2 className="text-white font-bold text-lg">Enter PIN</h2>
                        <p className="text-slate-500 text-xs mt-1">Enter your PIN to access the system</p>
                    </div>

                    {/* PIN display */}
                    <div className="flex gap-3.5 justify-center mb-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="w-4 h-4 rounded-full transition-all duration-150"
                                style={i < pin.length
                                    ? { background: '#10b981', boxShadow: '0 0 12px rgba(16,185,129,0.6)', border: '2px solid #10b981' }
                                    : { background: 'transparent', border: '2px solid rgba(255,255,255,0.15)' }} />
                        ))}
                    </div>

                    {/* Error */}
                    {(error || isLocked) && (
                        <div className="text-center text-xs rounded-xl py-2 px-3 mb-5"
                            style={isLocked
                                ? { color: '#fb923c', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }
                                : { color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            {isLocked ? '🔒 Locked — wait 1 minute' : error}
                        </div>
                    )}

                    {/* Numpad */}
                    <div className="grid grid-cols-3 gap-2.5">
                        {KEYS.map(key => {
                            if (key === 'CLR') return (
                                <button key="CLR" onClick={() => handleKey('CLR')} disabled={isLocked}
                                    className="aspect-square flex items-center justify-center rounded-2xl transition-all duration-100 disabled:opacity-40 active:scale-90"
                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                                    <Delete size={16} />
                                </button>
                            )
                            if (key === 'OK') return (
                                <button key="OK" onClick={() => handleSubmit(pin)} disabled={pin.length < 4 || isLocked || loading}
                                    className="aspect-square flex items-center justify-center rounded-2xl font-bold text-sm transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed active:scale-90"
                                    style={pin.length >= 4 ? { background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' } : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#4b5563' }}>
                                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'OK'}
                                </button>
                            )
                            return (
                                <button key={key} onClick={() => handleKey(key)} disabled={isLocked}
                                    className="aspect-square flex items-center justify-center rounded-2xl text-white font-semibold text-xl transition-all duration-100 disabled:opacity-40 active:scale-90"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}>
                                    {key}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
