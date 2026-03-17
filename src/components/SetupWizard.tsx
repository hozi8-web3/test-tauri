import { useState } from 'react'
import { Store, Shield, ChevronRight, ChevronLeft, Check } from 'lucide-react'

const STEPS = ['Store Info', 'Security']

export const SetupWizard = () => {
    const [step, setStep] = useState(0)
    const [storeName, setStoreName] = useState('Al-Barkat Mart')
    const [address1, setAddress1] = useState('')
    const [address2, setAddress2] = useState('')
    const [phone, setPhone] = useState('')
    const [pin, setPin] = useState('')
    const [confirmPin, setConfirmPin] = useState('')
    const [taxRate, setTaxRate] = useState('0')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleFinish = async () => {
        if (pin.length < 4) { setError('PIN must be at least 4 digits.'); return }
        if (pin !== confirmPin) { setError('PINs do not match.'); return }
        setLoading(true); setError('')
        try {
            const hashRes = await window.api.auth.hash(pin)
            const hash = hashRes.data ?? hashRes.hash
            if (!hashRes.success || !hash) {
                setError('Failed to secure PIN. Please try again.')
                setLoading(false); return
            }
            // Insert or replace Admin user
            await window.api.db.run(
                "INSERT OR REPLACE INTO users (username, pin_hash, role) VALUES ('Admin', ?, 'Admin')",
                [hash]
            )
            // Save settings with OR REPLACE so re-runs don't fail
            const settings: [string, string][] = [
                ['store_name', storeName],
                ['address_line_1', address1],
                ['address_line_2', address2],
                ['phone', phone],
                ['tax_rate', taxRate],
            ]
            for (const [key, value] of settings) {
                await window.api.db.run(
                    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                    [key, value]
                )
            }
            // Small delay to ensure DB writes are flushed before reload
            await new Promise(r => setTimeout(r, 300))
            window.location.reload()
        } catch (e) {
            setError(`Setup failed: ${e instanceof Error ? e.message : String(e)}`)
            setLoading(false)
        }
    }

    const inp = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-transparent transition-all"

    return (
        <div className="flex h-screen" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #0a1628 100%)' }}>
            {/* Left panel */}
            <div className="hidden md:flex flex-col items-center justify-center w-5/12 px-12 gap-8 relative">
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #10b981 0%, transparent 60%)' }} />
                <div className="relative z-10 text-center">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 40px rgba(16,185,129,0.3)' }}>
                        <Store size={36} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Al-Barkat Mart</h1>
                    <p className="text-slate-400 text-sm">Enterprise Point of Sale System</p>
                    <div className="mt-10 space-y-3">
                        {['Inventory Management', 'Sales Analytics', 'Secure PIN Login', 'Receipt Printing'].map(f => (
                            <div key={f} className="flex items-center gap-3 text-sm text-slate-400">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                                    <Check size={10} className="text-emerald-400" />
                                </div>
                                {f}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex flex-col items-center justify-center p-8"
                style={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-full max-w-md">
                    {/* Step indicator */}
                    <div className="flex items-center gap-2 mb-8">
                        {STEPS.map((s, i) => (
                            <div key={s} className="flex items-center gap-2">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${i <= step
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-white/5 text-slate-500 border border-white/10'}`}>
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-emerald-500/30 text-emerald-400' : 'bg-white/10 text-slate-500'}`}>
                                        {i < step ? <Check size={8} /> : i + 1}
                                    </div>
                                    {s}
                                </div>
                                {i < STEPS.length - 1 && <div className="w-8 h-px bg-white/10" />}
                            </div>
                        ))}
                    </div>

                    <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
                        {error && (
                            <div className="mb-5 px-4 py-3 rounded-xl text-sm text-red-300 flex items-center gap-2"
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                ⚠️ {error}
                            </div>
                        )}

                        {step === 0 && (
                            <div className="space-y-4">
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold text-white">Store Information</h2>
                                    <p className="text-slate-500 text-xs mt-1">Tell us about your store</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Store Name *</label>
                                    <input value={storeName} onChange={e => setStoreName(e.target.value)} className={inp} placeholder="Al-Barkat Mart" autoFocus />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Address Line 1</label>
                                    <input value={address1} onChange={e => setAddress1(e.target.value)} className={inp} placeholder="Shop 1, Main Market" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Address Line 2</label>
                                    <input value={address2} onChange={e => setAddress2(e.target.value)} className={inp} placeholder="Lahore, Pakistan" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                                    <input value={phone} onChange={e => setPhone(e.target.value)} className={inp} placeholder="+92-300-1234567" />
                                </div>
                                <button onClick={() => { if (!storeName.trim()) { setError('Store name is required.'); return } setError(''); setStep(1) }}
                                    className="w-full mt-2 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all"
                                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', boxShadow: '0 4px 20px rgba(16,185,129,0.25)' }}>
                                    Continue <ChevronRight size={16} />
                                </button>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Shield size={16} className="text-emerald-400" />
                                        <h2 className="text-xl font-bold text-white">Security Setup</h2>
                                    </div>
                                    <p className="text-slate-500 text-xs">Set a PIN to protect your POS</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Owner PIN (4–6 digits)</label>
                                    <input type="password" maxLength={6} value={pin}
                                        onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                                        className={`${inp} text-center tracking-[0.5em] text-xl font-mono`}
                                        placeholder="••••" autoFocus />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Confirm PIN</label>
                                    <input type="password" maxLength={6} value={confirmPin}
                                        onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                                        className={`${inp} text-center tracking-[0.5em] text-xl font-mono`}
                                        placeholder="••••" />
                                    {confirmPin && pin !== confirmPin && (
                                        <p className="text-xs text-red-400 mt-1.5">PINs do not match</p>
                                    )}
                                    {confirmPin && pin === confirmPin && pin.length >= 4 && (
                                        <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1"><Check size={10} /> PINs match</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Default Tax Rate (%)</label>
                                    <input type="number" step="0.1" value={taxRate}
                                        onChange={e => setTaxRate(e.target.value)}
                                        className={inp} placeholder="0" />
                                </div>
                                <div className="flex gap-3 mt-2">
                                    <button onClick={() => { setError(''); setStep(0) }}
                                        className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-semibold text-slate-400 transition-all"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <ChevronLeft size={15} /> Back
                                    </button>
                                    <button onClick={handleFinish} disabled={loading || pin.length < 4 || pin !== confirmPin}
                                        className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', boxShadow: '0 4px 20px rgba(16,185,129,0.25)' }}>
                                        {loading
                                            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Setting up…</>
                                            : <><Check size={15} /> Complete Setup</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <p className="text-center text-slate-600 text-xs mt-5">Al-Barkat Mart POS · Enterprise Edition</p>
                </div>
            </div>
        </div>
    )
}
