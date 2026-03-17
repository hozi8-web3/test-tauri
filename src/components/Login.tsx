import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store'
import logo from '../assets/general-logo.jpeg'
import { Shield, Delete } from 'lucide-react'

export const Login = () => {
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [attempts, setAttempts] = useState(0)
    const [lockedUntil, setLockedUntil] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)
    const { setAuth } = useStore()

    // Use refs so event listeners always see latest state
    const pinRef = useRef(pin)
    const attemptsRef = useRef(attempts)
    const lockedUntilRef = useRef(lockedUntil)
    pinRef.current = pin
    attemptsRef.current = attempts
    lockedUntilRef.current = lockedUntil

    /* Lock countdown */
    useEffect(() => {
        if (!lockedUntil) return
        const interval = setInterval(() => {
            if (Date.now() >= (lockedUntilRef.current ?? 0)) {
                setLockedUntil(null)
                setAttempts(0)
                setError('')
            }
        }, 1000)
        return () => clearInterval(interval)
    }, [lockedUntil])

    /* Keyboard input — always uses refs for current values */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't capture if another input is focused (e.g. the amount-paid field during checkout)
            const tag = (e.target as HTMLElement).tagName
            if (tag === 'SELECT' || tag === 'TEXTAREA') return

            if (lockedUntilRef.current && Date.now() < lockedUntilRef.current) return

            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault()
                setPin(prev => prev.length < 4 ? prev + e.key : prev)
            } else if (e.key === 'Backspace') {
                e.preventDefault()
                setPin(prev => prev.slice(0, -1))
            } else if (e.key === 'Enter') {
                e.preventDefault()
                if (pinRef.current.length >= 4) handleSubmit(pinRef.current)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, []) // runs once — uses refs for current state

    const handleSubmit = async (currentPin: string) => {
        if (!currentPin || currentPin.length < 4 || loading) return
        if (lockedUntilRef.current && Date.now() < lockedUntilRef.current) return
        setLoading(true)
        setError('')
        try {
            const ownerRes = await window.api.db.get("SELECT pin_hash FROM owner LIMIT 1")
            if (!ownerRes.success || !ownerRes.row) {
                setError('System error: no owner configured')
                setLoading(false)
                return
            }
            const { match } = await window.api.auth.compare(currentPin, ownerRes.row.pin_hash)
            if (match) {
                setPin('')
                setAuth(true)
            } else {
                const na = attemptsRef.current + 1
                setAttempts(na)
                setPin('')
                if (na >= 5) {
                    setLockedUntil(Date.now() + 60000)
                    setError('Too many failed attempts. Locked for 1 minute.')
                } else {
                    setError(`Wrong PIN — ${5 - na} attempt${5 - na !== 1 ? 's' : ''} remaining`)
                }
            }
        } finally {
            setLoading(false)
        }
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
        <div className="flex h-screen" style={{ background: '#0f172a' }}>
            {/* Left: Branding */}
            <div className="hidden md:flex flex-col items-center justify-center w-1/2 px-12 gap-6">
                <img src={logo} alt="Al-Barkat Mart" className="max-w-48 h-auto max-h-32 object-contain mix-blend-screen opacity-90 drop-shadow-2xl" />
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white leading-tight">Al-Barkat Mart</h1>
                    <p className="text-slate-500 text-xs mt-1">Point of Sale System</p>
                </div>
                <div className="flex items-center gap-2 text-green-400 text-xs mt-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    System Online &middot; {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <div className="text-[11px] text-slate-700 bg-slate-800/50 border border-slate-700 rounded-xl px-5 py-3 text-center leading-relaxed max-w-xs">
                    <span className="text-slate-400">Keyboard shortcuts:</span><br />
                    <span className="text-slate-300"><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-xs">0-9</kbd> Type · <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-xs">⌫</kbd> Delete · <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-xs">Enter</kbd> Login</span>
                </div>
            </div>

            {/* Right: PIN Keypad */}
            <div
                className="flex-1 flex flex-col items-center justify-center p-8"
                style={{ background: '#1e293b', borderLeft: '1px solid #334155' }}
            >
                <div className="w-full max-w-[220px]">
                    {/* Title */}
                    <div className="flex items-center justify-center gap-2 mb-7">
                        <Shield size={16} className="text-green-400" />
                        <span className="text-white font-semibold text-sm">Enter PIN</span>
                    </div>

                    {/* PIN dots */}
                    <div className="flex gap-3 justify-center mb-5">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${i < pin.length
                                    ? 'bg-green-400 border-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]'
                                    : 'bg-transparent border-slate-600'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Error / Locked */}
                    {(error || isLocked) && (
                        <div className={`text-center text-xs rounded-lg py-2 px-3 mb-4 ${isLocked
                            ? 'text-orange-400 bg-orange-950/50 border border-orange-900'
                            : 'text-red-400 bg-red-950/50 border border-red-900'
                            }`}>
                            {isLocked ? `🔒 Locked — wait 1 minute` : error}
                        </div>
                    )}

                    {/* Numpad */}
                    <div className="grid grid-cols-3 gap-2">
                        {KEYS.map(key => {
                            if (key === 'CLR') return (
                                <button
                                    key="CLR"
                                    onClick={() => handleKey('CLR')}
                                    disabled={isLocked}
                                    className="aspect-square flex items-center justify-center rounded-xl border border-red-900/60 bg-red-950/40 text-red-400 hover:bg-red-900/60 transition-all disabled:opacity-40 active:scale-95"
                                >
                                    <Delete size={15} />
                                </button>
                            )
                            if (key === 'OK') return (
                                <button
                                    key="OK"
                                    onClick={() => handleSubmit(pin)}
                                    disabled={pin.length < 4 || isLocked || loading}
                                    className="aspect-square flex items-center justify-center rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-green-900/40 transition-all active:scale-95"
                                >
                                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'OK'}
                                </button>
                            )
                            return (
                                <button
                                    key={key}
                                    onClick={() => handleKey(key)}
                                    disabled={isLocked}
                                    className="aspect-square flex items-center justify-center rounded-xl bg-slate-700/70 hover:bg-slate-600 text-white font-semibold text-xl border border-slate-700/80 transition-all disabled:opacity-40 active:scale-95 select-none"
                                >
                                    {key}
                                </button>
                            )
                        })}
                    </div>

                    <p className="text-center text-[10px] text-slate-600 mt-4 leading-relaxed">
                        Also accepts keyboard input directly
                    </p>
                </div>
            </div>
        </div>
    )
}
