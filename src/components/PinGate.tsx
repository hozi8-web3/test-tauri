import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { Shield, Delete } from 'lucide-react'

/**
 * PinGate — wraps sensitive pages (Reports, CashDrawer, Settings).
 * Once verified in a session, shows the page until the user navigates away.
 */
export const PinGate = ({ children }: { children: React.ReactNode }) => {
    const [pin, setPin] = useState('')
    const [verified, setVerified] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { } = useStore()

    const handleSubmit = async (currentPin = pin) => {
        if (currentPin.length < 4 || loading) return
        setLoading(true); setError('')
        const ownerRes = await window.api.db.get('SELECT pin_hash FROM owner LIMIT 1')
        if (!ownerRes.success || !ownerRes.row) { setError('System error'); setLoading(false); return }
        const { match } = await window.api.auth.compare(currentPin, ownerRes.row.pin_hash)
        if (match) { setVerified(true) }
        else { setError('Incorrect PIN'); setPin('') }
        setLoading(false)
    }

    const handleKey = (key: string) => {
        if (key === 'CLR') { setPin(''); return }
        if (key === 'OK') { handleSubmit(pin); return }
        if (pin.length < 4) setPin(p => p + key)
    }

    // Physical keyboard support — must be after all state/handler declarations, before early return
    useEffect(() => {
        if (verified) return
        const handler = (e: KeyboardEvent) => {
            if (e.key >= '0' && e.key <= '9') {
                setPin(p => p.length < 4 ? p + e.key : p)
            } else if (e.key === 'Backspace') {
                setPin(p => p.slice(0, -1))
            } else if (e.key === 'Enter') {
                setPin(p => { if (p.length >= 4) handleSubmit(p); return p })
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [verified])

    const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'OK']

    // Early return AFTER all hooks — this is required by React's Rules of Hooks
    if (verified) return <>{children}</>

    return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 20, padding: '28px 30px', width: 240, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
                {/* Icon + title */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
                    <Shield size={16} color="#4ade80" />
                    <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>PIN Required</span>
                </div>

                {/* PIN dots */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} style={{
                            width: 14, height: 14, borderRadius: '50%',
                            background: i < pin.length ? '#4ade80' : 'transparent',
                            border: `2px solid ${i < pin.length ? '#4ade80' : '#475569'}`,
                            boxShadow: i < pin.length ? '0 0 8px rgba(74,222,128,0.5)' : 'none',
                            transition: 'all 0.1s',
                        }} />
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div style={{ textAlign: 'center', fontSize: 11, color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '5px 8px', marginBottom: 12 }}>
                        {error}
                    </div>
                )}

                {/* Keypad */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7 }}>
                    {KEYS.map(key => {
                        if (key === 'CLR') return (
                            <button key="CLR" onClick={() => handleKey('CLR')}
                                style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', cursor: 'pointer' }}>
                                <Delete size={14} />
                            </button>
                        )
                        if (key === 'OK') return (
                            <button key="OK" onClick={() => handleSubmit()}
                                disabled={pin.length < 4 || loading}
                                style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: 'none', background: pin.length >= 4 ? '#16a34a' : '#374151', color: pin.length >= 4 ? 'white' : '#6b7280', fontWeight: 700, fontSize: 12, cursor: pin.length < 4 ? 'not-allowed' : 'pointer' }}>
                                {loading ? '…' : 'OK'}
                            </button>
                        )
                        return (
                            <button key={key} onClick={() => handleKey(key)}
                                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid #374151', background: '#334155', color: 'white', fontWeight: 600, fontSize: 18, cursor: 'pointer', transition: 'transform 0.05s' }}>
                                {key}
                            </button>
                        )
                    })}
                </div>

                <p style={{ textAlign: 'center', marginTop: 14, fontSize: 10, color: '#475569' }}>
                    Enter manager PIN to access this section
                </p>
            </div>
        </div>
    )
}
