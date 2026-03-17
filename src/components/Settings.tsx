import { useState, useEffect } from 'react'
import { Save, ShieldCheck, Database, Store } from 'lucide-react'

export const SettingsPage = () => {
    const [storeName, setStoreName] = useState('')
    const [address1, setAddress1] = useState('')
    const [address2, setAddress2] = useState('')
    const [phone, setPhone] = useState('')
    const [taxRate, setTaxRate] = useState('0')
    const [dbPath] = useState('%APPDATA%/AlBarkatMart/al_barkat_mart.db')
    const [oldPin, setOldPin] = useState('')
    const [newPin, setNewPin] = useState('')
    const [pinMessage, setPinMessage] = useState('')
    const [saveMsg, setSaveMsg] = useState('')

    useEffect(() => { loadSettings() }, [])

    const loadSettings = async () => {
        const res = await window.api.db.all("SELECT * FROM settings")
        if (res.success && res.rows) {
            res.rows.forEach((r: any) => {
                if (r.key === 'store_name') setStoreName(r.value)
                if (r.key === 'address_line_1') setAddress1(r.value)
                if (r.key === 'address_line_2') setAddress2(r.value)
                if (r.key === 'phone') setPhone(r.value)
                if (r.key === 'tax_rate') setTaxRate(r.value)
            })
        }
    }

    const handleSaveInfo = async (e: React.FormEvent) => {
        e.preventDefault()
        await Promise.all([
            window.api.db.run("UPDATE settings SET value = ? WHERE key = 'store_name'", [storeName]),
            window.api.db.run("UPDATE settings SET value = ? WHERE key = 'address_line_1'", [address1]),
            window.api.db.run("UPDATE settings SET value = ? WHERE key = 'address_line_2'", [address2]),
            window.api.db.run("UPDATE settings SET value = ? WHERE key = 'phone'", [phone]),
            window.api.db.run("UPDATE settings SET value = ? WHERE key = 'tax_rate'", [taxRate]),
        ])
        setSaveMsg('Settings saved!'); setTimeout(() => setSaveMsg(''), 2500)
    }

    const handleChangePin = async (e: React.FormEvent) => {
        e.preventDefault(); setPinMessage('')
        if (newPin.length < 4) { setPinMessage('New PIN must be at least 4 digits'); return }
        const { row } = await window.api.db.get("SELECT pin_hash FROM owner LIMIT 1")
        if (row?.pin_hash) {
            const matchRes = await window.api.auth.compare(oldPin, row.pin_hash)
            if (matchRes.match) {
                const hashRes = await window.api.auth.hash(newPin)
                if (hashRes.success && hashRes.hash) {
                    await window.api.db.run("UPDATE owner SET pin_hash = ?", [hashRes.hash])
                    setPinMessage('✓ PIN changed successfully'); setOldPin(''); setNewPin('')
                }
            } else { setPinMessage('Old PIN is incorrect') }
        }
    }

    const LabelField = ({ label, children }: { label: string; children: React.ReactNode }) => (
        <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</label>
            {children}
        </div>
    )

    const Input = ({ value, onChange, type = 'text', placeholder = '', step }: any) => (
        <input type={type} step={step} value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none transition" />
    )

    return (
        <div className="p-4 h-full overflow-y-auto">
            <div className="max-w-3xl mx-auto">
                <div className="mb-4">
                    <h1 className="text-sm font-bold text-slate-800">System Settings</h1>
                    <p className="text-xs text-slate-500">Configure your store and security preferences</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Store Info */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
                            <Store size={14} className="text-green-600" />
                            <span className="text-xs font-bold text-slate-700">Store Profile</span>
                        </div>
                        <form onSubmit={handleSaveInfo} className="p-4 space-y-3">
                            <LabelField label="Store Name"><Input value={storeName} onChange={setStoreName} placeholder="Al-Barkat Mart" /></LabelField>
                            <LabelField label="Address Line 1"><Input value={address1} onChange={setAddress1} placeholder="Shop 1, Main Market" /></LabelField>
                            <LabelField label="Address Line 2"><Input value={address2} onChange={setAddress2} placeholder="Lahore, Pakistan" /></LabelField>
                            <LabelField label="Phone Number"><Input value={phone} onChange={setPhone} placeholder="+92-300-1234567" /></LabelField>
                            <LabelField label="Default Tax Rate (%)"><Input type="number" step="0.1" value={taxRate} onChange={setTaxRate} /></LabelField>
                            <div className="flex items-center gap-2 pt-1">
                                <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors shadow-sm">
                                    <Save size={12} /> Save Settings
                                </button>
                                {saveMsg && <span className="text-xs text-green-600 font-medium">{saveMsg}</span>}
                            </div>
                        </form>
                    </div>

                    <div className="space-y-4">
                        {/* Security */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
                                <ShieldCheck size={14} className="text-orange-500" />
                                <span className="text-xs font-bold text-slate-700">Change PIN</span>
                            </div>
                            <form onSubmit={handleChangePin} className="p-4 space-y-3">
                                {pinMessage && (
                                    <div className={`text-xs py-1.5 px-3 rounded-lg border font-medium ${pinMessage.includes('✓') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{pinMessage}</div>
                                )}
                                <LabelField label="Current PIN">
                                    <input type="password" value={oldPin} onChange={e => setOldPin(e.target.value.replace(/\D/g, ''))} maxLength={6} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs tracking-[0.5em] font-mono text-center focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none" placeholder="••••" />
                                </LabelField>
                                <LabelField label="New PIN">
                                    <input type="password" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} maxLength={6} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs tracking-[0.5em] font-mono text-center focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none" placeholder="••••" />
                                </LabelField>
                                <button type="submit" disabled={!oldPin || !newPin} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    <ShieldCheck size={12} /> Update PIN
                                </button>
                            </form>
                        </div>

                        {/* Database */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
                                <Database size={14} className="text-blue-500" />
                                <span className="text-xs font-bold text-slate-700">Local Database</span>
                            </div>
                            <div className="p-4">
                                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Storage Location</label>
                                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-600 break-all select-all">{dbPath}</div>
                                <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                                    The database is automatically stored in your AppData folder. To backup, copy <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-600">al_barkat_mart.db</code> to a USB drive.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
