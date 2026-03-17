import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, ShoppingBag, Receipt, Printer } from 'lucide-react'

export const Reports = () => {
    const [sales, setSales] = useState<any[]>([])
    const [chartData, setChartData] = useState<any[]>([])
    const [summary, setSummary] = useState({ totalSales: 0, revenue: 0, tax: 0 })

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        const res = await window.api.db.all(`SELECT * FROM sales WHERE created_at >= date('now', '-30 days') ORDER BY created_at DESC`)
        if (res.success && res.rows) {
            setSales(res.rows)
            const totalRev = res.rows.reduce((s: number, r: any) => s + r.total, 0)
            const totalTax = res.rows.reduce((s: number, r: any) => s + r.tax_amount, 0)
            setSummary({ totalSales: res.rows.length, revenue: totalRev, tax: totalTax })
            const dailyMap: Record<string, number> = {}
            res.rows.forEach((s: any) => {
                const date = s.created_at.split(' ')[0]
                dailyMap[date] = (dailyMap[date] || 0) + s.total
            })
            const data = Object.keys(dailyMap).sort().map(date => ({ date: date.substring(5), revenue: Math.round(dailyMap[date]) }))
            setChartData(data)
        }
    }

    const STATS = [
        { label: '30-Day Revenue', value: `Rs.${summary.revenue.toLocaleString()}`, sub: 'Total sales revenue', icon: <TrendingUp size={16} />, color: 'text-green-600 bg-green-50' },
        { label: 'Total Transactions', value: summary.totalSales, sub: 'Completed sales', icon: <ShoppingBag size={16} />, color: 'text-blue-600 bg-blue-50' },
        { label: 'Tax Collected', value: `Rs.${summary.tax.toLocaleString()}`, sub: 'Total tax amount', icon: <Receipt size={16} />, color: 'text-purple-600 bg-purple-50' },
    ]

    return (
        <div className="p-4 h-full flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h1 className="text-sm font-bold text-slate-800">Financial Reports</h1>
                    <p className="text-xs text-slate-500">Sales and revenue overview · Last 30 days</p>
                </div>
                <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors shadow-sm">
                    <Printer size={13} /> Print Report
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                {STATS.map(s => (
                    <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>{s.icon}</div>
                        <div>
                            <div className="text-[11px] text-slate-500 font-medium">{s.label}</div>
                            <div className="text-base font-bold text-slate-800 leading-tight">{s.value}</div>
                            <div className="text-[10px] text-slate-400">{s.sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-4" style={{ height: 260 }}>
                <div className="text-xs font-semibold text-slate-700 mb-3">Revenue Trend (30 Days)</div>
                <ResponsiveContainer width="100%" height="85%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={6} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `${v}`} width={50} />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 11, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: any) => [`Rs. ${value}`, 'Revenue']}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} dot={{ r: 3, fill: '#16a34a', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Transactions Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-1">
                <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Recent Transactions</span>
                    <span className="text-[11px] text-slate-400">Showing last {Math.min(sales.length, 50)}</span>
                </div>
                <div className="overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                {['Invoice #', 'Date & Time', 'Method', 'Subtotal', 'Discount', 'Total'].map(h => (
                                    <th key={h} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sales.slice(0, 50).map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-3 py-2 font-mono text-[11px] font-semibold text-slate-700">{s.invoice_number}</td>
                                    <td className="px-3 py-2 text-xs text-slate-500">{new Date(s.created_at).toLocaleString()}</td>
                                    <td className="px-3 py-2">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">{s.payment_method}</span>
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-500">Rs.{s.subtotal?.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-xs text-slate-500">{s.discount > 0 ? `-Rs.${s.discount.toFixed(2)}` : '—'}</td>
                                    <td className="px-3 py-2 text-xs font-bold text-green-600">Rs.{s.total.toFixed(2)}</td>
                                </tr>
                            ))}
                            {sales.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-xs">No sales data yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
