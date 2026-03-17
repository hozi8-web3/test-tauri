import { useState, useEffect } from 'react'
import {
    FileText, FolderOpen, Printer, Trash2, Search,
    RefreshCw, CheckCircle, XCircle, Receipt, ExternalLink
} from 'lucide-react'

type ReceiptFile = {
    filename: string
    invoiceNumber: string
    createdAt: string
    filePath: string
    size: number
}

export const Receipts = () => {
    const [receipts, setReceipts] = useState<ReceiptFile[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

    useEffect(() => { loadReceipts() }, [])

    const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 2500)
    }

    const loadReceipts = async () => {
        setLoading(true)
        const res = await window.api.receipt.list()
        if (res.success && res.files) setReceipts(res.files)
        setLoading(false)
    }

    const handleOpen = async (filePath: string) => {
        await window.api.receipt.openFile(filePath)
    }

    const handlePrint = async (filePath: string) => {
        const res = await window.api.receipt.printFile(filePath)
        if (res.success) showToast('Sent to printer', 'ok')
        else showToast('Print failed — is a printer connected?', 'err')
    }

    const handleDelete = async (filePath: string, invoiceNumber: string) => {
        if (!confirm(`Delete receipt ${invoiceNumber}? This only removes the file, not the sale record.`)) return
        const res = await window.api.receipt.delete(filePath)
        if (res.success) { showToast(`${invoiceNumber} deleted`, 'ok'); loadReceipts() }
        else showToast('Could not delete file', 'err')
    }

    const handleOpenFolder = async () => {
        await window.api.receipt.openFolder()
    }

    const filtered = receipts.filter(r =>
        !search || r.invoiceNumber.toLowerCase().includes(search.toLowerCase())
    )

    const totalSize = receipts.reduce((s, r) => s + r.size, 0)
    const kb = (n: number) => n < 1024 ? `${n}B` : `${(n / 1024).toFixed(1)}KB`

    return (
        <div className="p-4 h-full flex flex-col">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-3 right-3 z-50 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-xl border
          ${toast.type === 'ok' ? 'bg-green-900/90 text-green-200 border-green-700' : 'bg-red-900/90 text-red-200 border-red-700'}`}>
                    {toast.type === 'ok' ? <CheckCircle size={13} /> : <XCircle size={13} />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h1 className="text-sm font-bold text-slate-800">Saved Receipts</h1>
                    <p className="text-xs text-slate-500">
                        {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} · {kb(totalSize)} total
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadReceipts} disabled={loading} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={handleOpenFolder} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors shadow-sm">
                        <FolderOpen size={12} /> Open Folder
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-3 max-w-xs">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice number…"
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-green-400 outline-none" />
            </div>

            {/* List */}
            {receipts.length === 0 && !loading ? (
                <div className="flex-1 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-3 shadow-sm">
                    <Receipt size={40} className="text-slate-200" />
                    <div className="text-center">
                        <p className="text-sm font-semibold text-slate-600">No receipts saved yet</p>
                        <p className="text-xs text-slate-400 mt-1">Receipts are automatically saved after each sale</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    {['Invoice Number', 'Date & Time', 'Size', 'Actions'].map(h => (
                                        <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(r => (
                                    <tr key={r.filename} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <FileText size={13} className="text-green-600" />
                                                </div>
                                                <span className="font-mono text-xs font-semibold text-slate-800">{r.invoiceNumber}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</td>
                                        <td className="px-3 py-2 text-xs text-slate-400 font-mono">{kb(r.size)}</td>
                                        <td className="px-3 py-2 pr-4">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleOpen(r.filePath)} title="View receipt"
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <ExternalLink size={13} />
                                                </button>
                                                <button onClick={() => handlePrint(r.filePath)} title="Print receipt"
                                                    className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                                    <Printer size={13} />
                                                </button>
                                                <button onClick={() => handleDelete(r.filePath, r.invoiceNumber)} title="Delete"
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-xs">No receipts match your search.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between">
                        <span>Showing {filtered.length} of {receipts.length} receipts</span>
                        <span>Storage: {kb(totalSize)}</span>
                    </div>
                </div>
            )}

            {/* Info banner */}
            <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                <Receipt size={13} className="mt-0.5 flex-shrink-0 text-blue-500" />
                <div>
                    <strong>Local backup:</strong> Every receipt is saved as an HTML file in your AppData folder.
                    Even if the printer is offline, you can open, print, or share receipts later.
                    <button onClick={handleOpenFolder} className="ml-2 underline hover:text-blue-900 font-semibold">Open receipts folder →</button>
                </div>
            </div>
        </div>
    )
}
