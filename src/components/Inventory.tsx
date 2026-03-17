import { useState, useEffect } from 'react'
import { AlertTriangle, TrendingDown, Package, DollarSign, Minus, Plus } from 'lucide-react'

export const Inventory = () => {
    const [products, setProducts] = useState<any[]>([])
    const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all')

    useEffect(() => { loadInventory() }, [])

    const loadInventory = async () => {
        const res = await window.api.db.all(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.stock ASC`)
        if (res.success) setProducts(res.rows || [])
    }

    const handleStockAdjust = async (id: number, currentStock: number, delta: number) => {
        const newStock = Math.max(0, currentStock + delta)
        await window.api.db.run(`UPDATE products SET stock = ? WHERE id = ?`, [newStock, id])
        loadInventory()
    }

    const outOfStock = products.filter(p => p.stock === 0)
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.min_stock_alert)
    const totalValue = products.reduce((acc, p) => acc + (p.cost_price * p.stock), 0)

    const filtered = filter === 'all' ? products : filter === 'low' ? lowStock : outOfStock

    return (
        <div className="p-4 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h1 className="text-sm font-bold text-slate-800">Inventory Management</h1>
                    <p className="text-xs text-slate-500">Track and adjust stock levels</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-3">
                {[
                    { label: 'Total Products', value: products.length, icon: <Package size={16} />, color: 'bg-blue-50 text-blue-600' },
                    { label: 'Stock Value', value: `Rs.${totalValue.toLocaleString()}`, icon: <DollarSign size={16} />, color: 'bg-green-50 text-green-600' },
                    { label: 'Out of Stock', value: outOfStock.length, icon: <AlertTriangle size={16} />, color: 'bg-red-50 text-red-600' },
                    { label: 'Low Stock', value: lowStock.length, icon: <TrendingDown size={16} />, color: 'bg-orange-50 text-orange-600' },
                ].map(s => (
                    <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>{s.icon}</div>
                        <div>
                            <div className="text-[11px] text-slate-500 font-medium leading-tight">{s.label}</div>
                            <div className="text-sm font-bold text-slate-800">{s.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1.5 mb-3 bg-white border border-slate-200 rounded-lg p-1 w-fit shadow-sm">
                {([['all', `All (${products.length})`], ['low', `Low (${lowStock.length})`], ['out', `Out of Stock (${outOfStock.length})`]] as const).map(([key, label]) => (
                    <button key={key} onClick={() => setFilter(key)} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${filter === key ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
                ))}
            </div>

            {/* Table */}
            <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                {['Product', 'Category', 'Barcode', 'Status', 'Stock', 'Min Alert', 'Adjust'].map(h => (
                                    <th key={h} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(p => {
                                const status = p.stock === 0 ? 'out' : p.stock <= p.min_stock_alert ? 'low' : 'ok'
                                return (
                                    <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${status === 'out' ? 'bg-red-50/40' : ''}`}>
                                        <td className="px-3 py-2 text-xs font-semibold text-slate-800">{p.name}</td>
                                        <td className="px-3 py-2"><span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">{p.category_name || '—'}</span></td>
                                        <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{p.barcode || '—'}</td>
                                        <td className="px-3 py-2">
                                            {status === 'out' && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">OUT OF STOCK</span>}
                                            {status === 'low' && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">LOW STOCK</span>}
                                            {status === 'ok' && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">HEALTHY</span>}
                                        </td>
                                        <td className="px-3 py-2 text-xs font-bold text-slate-800">{p.stock}</td>
                                        <td className="px-3 py-2 text-xs text-slate-500">{p.min_stock_alert}</td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleStockAdjust(p.id, p.stock, -1)} className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"><Minus size={11} /></button>
                                                <button onClick={() => handleStockAdjust(p.id, p.stock, 1)} className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors"><Plus size={11} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {filtered.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-xs">No products in this category.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
