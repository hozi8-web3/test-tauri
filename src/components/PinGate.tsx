import { useState, useEffect } from 'react'
import { Shield, Delete } from 'lucide-react'

export const PinGate = ({ children }: { children: React.ReactNode }) => {
    const [pin, setPin] = useState('')
    const [verified, setVerified] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (currentPin = pin) => {
        if (currentPin.length < 4 || loading) return
        setLoading(true); setError('')
        try {
            const userRes = await window.api.db.get("SELECT pin_hash FROM users WHERE role = 'Admin' LIMIT 1")
            if (!userRes.success || !userRes.row) { setError('System error'); setLoading(false); return }
            const matchRes = await window.api.auth.compare(currentPin, userRes.row.pin_hash as string)
            if (matchRes.match) { setVerified(true) }
            else { setError('Incorrect PIN'); setPin('') }
        } finally { setLoading(false) }
    }

    const handleKey = (key: string) => {
        if (key === 'CLR') { setPin(''); return }
        if (key === 'OK') { handleSubmit(pin); return }
        if (pin.length < 4) setPin(p => p + key)
    }

    useEffect(() => {
        if (verified) return
        const handler = (e: KeyboardEvent) => {
            if (e.key >= '0' && e.key <= '9') setPin(p => p.length < 4 ? p + e.key : p)
            else if (e.key === 'Backspace') setPin(p => p.slice(0, -1))
            else if (e.key === 'Enter') setPin(p => { if (p.length >= 4) handleSubmit(p); return p })
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [verified])

    const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'OK']
    if (verified) return <>{children}</>

    return (
        <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(10,15,30,0.92)', backdropFilter: 'blur(12px)', zIndex: 40 }}>
            <div className="w-72 rounded-3xl p-7"
                style={{ background: 'linear-gradient(145deg, rgba(30,41,59,0.95), rgba(15,23,42,0.95))', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                        style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                        <Shield size={22} className="text-emerald-400" />
                    </div>
                    <h3 className="text-white font-bold text-base">Manager PIN</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Required to access this section</p>
                </div>

                {/* PIN dots */}
                <div className="flex gap-4 justify-center mb-5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="w-3.5 h-3.5 rounded-full transition-all duration-150"
                            style={i < pin.length
                                ? { background: '#10b981', boxShadow: '0 0 12px rgba(16,185,129,0.6)', border: '2px solid #10b981' }
                                : { background: 'transparent', border: '2px solid rgba(255,255,255,0.12)' }} />
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div className="text-center text-xs rounded-xl py-2 px-3 mb-4"
                        style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                        {error}
                    </div>
                )}

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-2">
                    {KEYS.map(key => {
                        if (key === 'CLR') return (
                            <button key="CLR" onClick={() => handleKey('CLR')}
                                className="aspect-square flex items-center justify-center rounded-xl transition-all duration-100 active:scale-90"
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                                <Delete size={14} />
                            </button>
                        )
                        if (key === 'OK') return (
                            <button key="OK" onClick={() => handleSubmit()} disabled={pin.length < 4 || loading}
                                className="aspect-square flex items-center justify-center rounded-xl font-bold text-xs transition-all duration-100 disabled:opacity-40 active:scale-90"
                                style={pin.length >= 4
                                    ? { background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }
                                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#374151' }}>
                                {loading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'OK'}
                            </button>
                        )
                        return (
                            <button key={key} onClick={() => handleKey(key)}
                                className="aspect-square flex items-center justify-center rounded-xl text-white font-semibold text-lg transition-all duration-100 active:scale-90"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}>
                                {key}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
