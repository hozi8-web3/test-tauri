import { useState, useEffect } from 'react'
import { Banknote, TrendingDown, Plus, CheckCircle, XCircle } from 'lucide-react'

export const CashDrawer = () => {
    const [drawerInfo, setDrawerInfo] = useState<any>(null)
    const [startingCash, setStartingCash] = useState('')
    const [endingCash, setEndingCash] = useState('')
    const [actualCash, setActualCash] = useState('')
    const [expenses, setExpenses] = useState<any[]>([])
    const [newExpenseDesc, setNewExpenseDesc] = useState('')
    const [newExpenseAmt, setNewExpenseAmt] = useState('')

    useEffect(() => { loadDrawer() }, [])

    const loadDrawer = async () => {
        const res = await window.api.db.get("SELECT * FROM cash_drawer WHERE closed_at IS NULL ORDER BY opened_at DESC LIMIT 1")
        if (res.success && res.row) {
            setDrawerInfo(res.row)
            loadExpenses(res.row.opened_at)
            const salesRes = await window.api.db.get(`SELECT SUM(total) as cash_sales FROM sales WHERE payment_method = 'Cash' AND created_at >= ?`, [res.row.opened_at])
            const expRes = await window.api.db.get(`SELECT SUM(amount) as total_exp FROM expenses WHERE created_at >= ?`, [res.row.opened_at])
            const salesAmount = salesRes.success && salesRes.row?.cash_sales ? salesRes.row.cash_sales : 0
            const expAmount = expRes.success && expRes.row?.total_exp ? expRes.row.total_exp : 0
            setEndingCash((res.row.starting_cash + salesAmount - expAmount).toFixed(2))
        } else {
            setDrawerInfo(null)
        }
    }

    const loadExpenses = async (since: string) => {
        const res = await window.api.db.all("SELECT * FROM expenses WHERE created_at >= ? ORDER BY created_at DESC", [since])
        if (res.success) setExpenses(res.rows || [])
    }

    const handleOpenDrawer = async () => {
        if (!startingCash) return
        await window.api.db.run("INSERT INTO cash_drawer (starting_cash) VALUES (?)", [parseFloat(startingCash)])
        setStartingCash(''); loadDrawer()
    }

    const handleCloseDrawer = async () => {
        if (!actualCash) return
        const actual = parseFloat(actualCash), expected = parseFloat(endingCash), variance = actual - expected
        await window.api.db.run("UPDATE cash_drawer SET closed_at = CURRENT_TIMESTAMP, expected_cash = ?, actual_cash = ?, variance = ? WHERE id = ?", [expected, actual, variance, drawerInfo.id])
        window.print(); setActualCash(''); loadDrawer()
    }

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newExpenseDesc || !newExpenseAmt) return
        await window.api.db.run("INSERT INTO expenses (description, amount) VALUES (?, ?)", [newExpenseDesc, parseFloat(newExpenseAmt)])
        setNewExpenseDesc(''); setNewExpenseAmt(''); loadDrawer()
    }

    /* ── Closed / No shift ── */
    if (!drawerInfo) return (
        <div className="flex h-full items-center justify-center p-8">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
                <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Banknote size={28} className="text-green-600" />
                </div>
                <h2 className="text-base font-bold text-slate-800 mb-1">Register Closed</h2>
                <p className="text-xs text-slate-500 mb-6">Enter starting float to open a new shift</p>
                <div className="mb-4">
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1 text-left">Starting Cash (PKR)</label>
                    <input type="number" value={startingCash} onChange={e => setStartingCash(e.target.value)} className="w-full text-2xl font-bold p-3 bg-slate-50 border-2 border-green-400 rounded-xl focus:ring-2 focus:ring-green-200 outline-none text-center" placeholder="0.00" />
                </div>
                <button onClick={handleOpenDrawer} disabled={!startingCash} className="w-full py-2.5 bg-green-600 text-white font-bold text-sm rounded-xl hover:bg-green-700 transition disabled:opacity-50 shadow-sm">
                    Open Register
                </button>
            </div>
        </div>
    )

    const variance = actualCash ? parseFloat(actualCash) - parseFloat(endingCash) : null

    /* ── Open shift ── */
    return (
        <div className="p-4 h-full flex flex-col gap-3 overflow-y-auto">
            {/* Header */}
            <div>
                <h1 className="text-sm font-bold text-slate-800">Cash Drawer Management</h1>
                <p className="text-xs text-slate-500">Shift opened at {new Date(drawerInfo.opened_at).toLocaleString()}</p>
            </div>

            <div className="flex gap-3 flex-1">
                {/* Left: Drawer status */}
                <div className="flex-1 flex flex-col gap-3">
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Starting Float', value: `Rs.${drawerInfo.starting_cash.toFixed(2)}`, color: 'text-slate-700 bg-slate-50' },
                            { label: 'Expected Cash', value: `Rs.${endingCash}`, color: 'text-green-700 bg-green-50' },
                        ].map(s => (
                            <div key={s.label} className={`rounded-xl border border-slate-200 p-3 shadow-sm ${s.color}`}>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{s.label}</div>
                                <div className="text-xl font-bold mt-0.5">{s.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Close Register */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                            <XCircle size={15} className="text-red-500" />
                            <span className="text-xs font-bold text-slate-700">Close Register / Z-Report</span>
                        </div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Actual Cash Counted (PKR)</label>
                        <input type="number" value={actualCash} onChange={e => setActualCash(e.target.value)} className="w-full text-xl font-bold p-3 bg-slate-50 border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-200 outline-none mb-2 text-center" placeholder="0.00" />
                        {variance !== null && (
                            <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg mb-3 ${variance < 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                {variance < 0 ? <XCircle size={13} /> : <CheckCircle size={13} />}
                                Variance: Rs.{variance.toFixed(2)} {variance < 0 ? '(Shortage)' : '(Surplus)'}
                            </div>
                        )}
                        <button onClick={handleCloseDrawer} disabled={!actualCash} className="w-full py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition disabled:opacity-50 shadow-sm">
                            Close Drawer & Print Z-Report
                        </button>
                    </div>
                </div>

                {/* Right: Expenses */}
                <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <TrendingDown size={14} className="text-orange-500" />
                        <span className="text-xs font-bold text-slate-700">Pay-outs & Expenses</span>
                    </div>
                    <form onSubmit={handleAddExpense} className="flex gap-2 p-3 border-b border-slate-100">
                        <input required value={newExpenseDesc} onChange={e => setNewExpenseDesc(e.target.value)} placeholder="Description…" className="flex-[2] px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none" />
                        <input required type="number" value={newExpenseAmt} onChange={e => setNewExpenseAmt(e.target.value)} placeholder="Amount" className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none" />
                        <button type="submit" className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 transition flex-shrink-0">
                            <Plus size={12} /> Add
                        </button>
                    </form>
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                        {expenses.length === 0 ? (
                            <div className="flex items-center justify-center h-24 text-xs text-slate-400">No expenses this shift</div>
                        ) : expenses.map(e => (
                            <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                                <div className="flex-1">
                                    <div className="text-xs font-semibold text-slate-700">{e.description}</div>
                                    <div className="text-[10px] text-slate-400">{new Date(e.created_at).toLocaleTimeString()}</div>
                                </div>
                                <div className="text-xs font-bold text-red-600">-Rs.{e.amount.toFixed(2)}</div>
                            </div>
                        ))}
                    </div>
                    <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-xs font-semibold text-slate-600 flex justify-between">
                        <span>Total Expenses</span>
                        <span className="text-red-600">-Rs.{expenses.reduce((s, e) => s + e.amount, 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
