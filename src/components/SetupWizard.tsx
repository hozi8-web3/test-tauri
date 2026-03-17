import { useState } from 'react'

export const SetupWizard = () => {
    const [step, setStep] = useState(1)
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
        if (pin.length < 4 || pin !== confirmPin) {
            setError('PINs must match and be at least 4 digits.')
            return
        }
        setLoading(true)
        setError('')

        // Hash PIN
        const hashRes = await window.api.auth.hash(pin)
        if (!hashRes.success) {
            setError('Failed to secure PIN.')
            setLoading(false)
            return
        }

        // Save Owner
        await window.api.db.run("INSERT INTO owner (pin_hash) VALUES (?)", [hashRes.hash])

        // Save Settings
        await window.api.db.run("INSERT INTO settings (key, value) VALUES ('store_name', ?)", [storeName])
        await window.api.db.run("INSERT INTO settings (key, value) VALUES ('address_line_1', ?)", [address1])
        await window.api.db.run("INSERT INTO settings (key, value) VALUES ('address_line_2', ?)", [address2])
        await window.api.db.run("INSERT INTO settings (key, value) VALUES ('phone', ?)", [phone])
        await window.api.db.run("INSERT INTO settings (key, value) VALUES ('tax_rate', ?)", [taxRate])

        setLoading(false)
        window.location.reload() // Reload app to clear setup state
    }

    return (
        <div className="flex h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
                <div className="bg-brand-green text-white p-6 text-center">
                    <h1 className="text-2xl font-bold">Welcome to Al-Barkat Mart POS</h1>
                    <p className="text-green-100 mt-2">Let's get your store set up.</p>
                </div>

                <div className="p-8">
                    {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}

                    {step === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold mb-4">Store Information</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                                <input value={storeName} onChange={e => setStoreName(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-brand-green outline-none" placeholder="Al-Barkat Mart" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                                <input value={address1} onChange={e => setAddress1(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-brand-green outline-none" placeholder="Shop 1, Main Market" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2 (Optional)</label>
                                <input value={address2} onChange={e => setAddress2(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-brand-green outline-none" placeholder="Lahore, Pakistan" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-brand-green outline-none" placeholder="+92-300-1234567" />
                            </div>
                            <button onClick={() => setStep(2)} className="w-full py-3 mt-6 bg-brand-green text-white font-bold rounded-lg hover:bg-green-700 transition">Next Step</button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold mb-4">Security & Settings</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Owner PIN (4-6 digits for Login)</label>
                                <input type="password" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} className="w-full p-3 text-center tracking-[1em] font-mono text-xl border rounded-lg focus:ring-2 focus:ring-brand-green outline-none" placeholder="••••" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm PIN</label>
                                <input type="password" maxLength={6} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} className="w-full p-3 text-center tracking-[1em] font-mono text-xl border rounded-lg focus:ring-2 focus:ring-brand-green outline-none" placeholder="••••" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">Default Tax Rate (%)</label>
                                <input type="number" step="0.1" value={taxRate} onChange={e => setTaxRate(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-brand-green outline-none" placeholder="17" />
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button onClick={() => setStep(1)} className="flex-1 py-3 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 transition">Back</button>
                                <button onClick={handleFinish} disabled={loading} className="flex-1 py-3 bg-brand-green text-white font-bold rounded-lg hover:bg-green-700 transition disabled:opacity-50">
                                    {loading ? 'Saving...' : 'Finish Setup'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
