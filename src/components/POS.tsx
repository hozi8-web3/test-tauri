import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'
import { generateReceiptHTML, type ReceiptData } from '../utils/receiptGenerator'
import receiptLogoUrl from '../assets/receipt-logo.jpeg'
import {
    Search, Trash2, CreditCard, Banknote, QrCode,
    ShoppingCart, X, Plus, Minus,
    CheckCircle, AlertCircle, Zap
} from 'lucide-react'

/* ── Beep (Web Audio API) ─────────────────────────────────────── */
const beep = (type: 'success' | 'error' | 'remove' = 'success') => {
    try {
        const ctx = new AudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        if (type === 'success') {
            osc.type = 'square'
            osc.frequency.setValueAtTime(2600, ctx.currentTime)
            gain.gain.setValueAtTime(0.1, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
            osc.start(); osc.stop(ctx.currentTime + 0.08)
        } else if (type === 'error') {
            osc.type = 'sawtooth'
            osc.frequency.setValueAtTime(250, ctx.currentTime)
            gain.gain.setValueAtTime(0.2, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
            osc.start(); osc.stop(ctx.currentTime + 0.3)
        } else {
            osc.type = 'square'
            osc.frequency.setValueAtTime(1200, ctx.currentTime)
            gain.gain.setValueAtTime(0.08, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)
            osc.start(); osc.stop(ctx.currentTime + 0.06)
        }
    } catch { /* ignore */ }
}

type Toast = { id: number; msg: string; type: 'ok' | 'err' }

export const POS = () => {
    const [products, setProducts] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [search, setSearch] = useState('')
    const [selectedCat, setSelectedCat] = useState<number | null>(null)
    const [barcodeInput, setBarcodeInput] = useState('')
    const [showPayment, setShowPayment] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'JazzCash' | 'EasyPaisa'>('Cash')
    const [amountPaid, setAmountPaid] = useState('')
    const [toasts, setToasts] = useState<Toast[]>([])
    const [lastAdded, setLastAdded] = useState<number | null>(null)
    const [isReturnMode, setIsReturnMode] = useState(false)

    const { cart, addToCart, removeFromCart, updateCartQuantity, clearCart, taxRate, discount, setDiscount } = useStore()
    const barcodeRef = useRef<HTMLInputElement>(null)
    const searchRef = useRef<HTMLInputElement>(null)
    const scanBufferRef = useRef('')
    const lastKeyTimeRef = useRef(0)
    const productsRef = useRef<any[]>([])

    const toast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
        const id = Date.now()
        setToasts(t => [...t.slice(-3), { id, msg, type }])
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500)
    }, [])

    useEffect(() => { loadProducts(); loadCategories() }, [])

    /* auto-focus barcode on keypress outside inputs & background scanner */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

            if (e.key === 'F9') { e.preventDefault(); if (cart.length > 0) setShowPayment(true); return }
            if (e.key === 'F3') { e.preventDefault(); searchRef.current?.focus(); return }

            // Hardware scanner tracking
            const now = Date.now()
            if (now - lastKeyTimeRef.current > 100) {
                scanBufferRef.current = '' // Reset if it's slow human typing
            }
            lastKeyTimeRef.current = now

            if (e.key === 'Enter') {
                if (scanBufferRef.current.length > 0) {
                    processBarcode(scanBufferRef.current)
                    scanBufferRef.current = ''
                }
            } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                scanBufferRef.current += e.key
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, []) // empty dep array is intentional — refs keep values current without re-registering

    const loadProducts = async () => {
        const res = await window.api.db.all(
            'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.name ASC'
        )
        if (res.success) {
            setProducts(res.rows || [])
            productsRef.current = res.rows || []
        }
    }

    const loadCategories = async () => {
        const res = await window.api.db.all('SELECT * FROM categories ORDER BY name ASC')
        if (res.success) setCategories(res.rows || [])
    }

    const processBarcode = (codeTarget: string) => {
        const code = codeTarget.trim()
        if (!code) return

        // Use productsRef to avoid closure issues in the global listener
        const product = productsRef.current.find(p => p.barcode === code)
        if (product) {
            const qty = isReturnMode ? -1 : 1
            if (qty > 0 && product.stock <= 0) { beep('error'); toast(`${product.name} — Out of Stock!`, 'err'); return }
            beep('success'); addToCart(product, qty)
            setLastAdded(product.id); toast(`✓ ${product.name} ${isReturnMode ? '(Returned)' : ''}`, 'ok')
            setTimeout(() => setLastAdded(null), 600)
        } else {
            beep('error'); toast(`Barcode "${code}" not found`, 'err')
        }
    }

    const handleBarcodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        processBarcode(barcodeInput)
        setBarcodeInput('')
        barcodeRef.current?.focus()
    }

    const handleAddProduct = (p: any) => {
        const qty = isReturnMode ? -1 : 1
        if (qty > 0 && p.stock <= 0) { beep('error'); toast(`${p.name} out of stock`, 'err'); return }
        beep('success'); addToCart(p, qty)
        setLastAdded(p.id); toast(`✓ ${p.name} ${isReturnMode ? '(Returned)' : ''}`, 'ok')
        setTimeout(() => setLastAdded(null), 600)
    }

    const filtered = products.filter(p => {
        const q = search.toLowerCase()
        const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q))
        const matchCat = selectedCat === null || p.category_id === selectedCat
        return matchSearch && matchCat
    })

    /* totals */
    const subtotal = cart.reduce((s, i) => s + i.total, 0)
    const discountAmt = Math.min(discount, Math.abs(subtotal))
    const taxable = subtotal - (subtotal < 0 ? 0 : discountAmt)
    const taxAmount = taxable * (taxRate / 100)
    const grandTotal = taxable + taxAmount
    const change = Math.max(0, (parseFloat(amountPaid) || 0) - grandTotal)

    /* checkout */
    const handleCheckout = async () => {
        if (cart.length === 0) return
        const paid = parseFloat(amountPaid) || grandTotal
        const ch = Math.max(0, paid - grandTotal)
        const d = new Date()
        const inv = `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${d.getTime().toString().slice(-5)}`

        const saleRes = await window.api.db.run(
            `INSERT INTO sales (invoice_number,subtotal,discount,tax_amount,total,payment_method,amount_paid,change_amount) VALUES (?,?,?,?,?,?,?,?)`,
            [inv, subtotal, discountAmt, taxAmount, grandTotal, paymentMethod, paid, ch]
        )
        if (!saleRes.success || !saleRes.info) { toast('Sale save failed', 'err'); return }

        const saleId = saleRes.info.lastInsertRowid
        for (const item of cart) {
            await window.api.db.run(
                `INSERT INTO sale_items (sale_id,product_id,product_name,quantity,price,total) VALUES (?,?,?,?,?,?)`,
                [saleId, item.productId, item.name, item.quantity, item.price, item.total]
            )
            await window.api.db.run(`UPDATE products SET stock=MAX(0,stock-?) WHERE id=?`, [item.quantity, item.productId])
        }

        /* receipt */
        const settingsRes = await window.api.db.all('SELECT key,value FROM settings')
        const S: Record<string, string> = {}
        if (settingsRes.success) settingsRes.rows?.forEach((r: any) => { S[r.key] = r.value })

        let logoBase64 = ''
        try {
            const resp = await fetch(receiptLogoUrl)
            const blob = await resp.blob()
            logoBase64 = await new Promise<string>(resolve => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result as string)
                reader.readAsDataURL(blob)
            })
        } catch { /* logo optional */ }

        const receiptData: ReceiptData = {
            invoiceNumber: inv,
            date: d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            storeName: S['store_name'] || 'Al-Barkat Mart',
            address1: S['address_line_1'] || '',
            address2: S['address_line_2'] || '',
            phone: S['phone'] || '',
            items: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, total: i.total })),
            subtotal, discount: discountAmt, taxRate, taxAmount, grandTotal,
            paymentMethod, amountPaid: paid, change: ch, logoBase64,
        }
        const html = await generateReceiptHTML(receiptData)
        const saveRes = await window.api.receipt.save(inv, html)

        beep('success'); clearCart(); setShowPayment(false); setAmountPaid(''); setDiscount(0); loadProducts()
        if (saveRes.success && saveRes.filePath) await window.api.receipt.printFile(saveRes.filePath)
        else window.api.printReceipt()
        toast(`✓ ${inv} — receipt saved`, 'ok')
    }

    return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', overflow: 'hidden', background: isReturnMode ? '#fef2f2' : '#f1f5f9', border: isReturnMode ? '4px solid #ef4444' : 'none' }}>

            {/* ── Toasts (always on top) ── */}
            <div style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 9999, display: 'flex', flexDirection: 'column-reverse', gap: 6, pointerEvents: 'none' }}>
                {toasts.map(t => (
                    <div key={t.id} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 12px', borderRadius: 10,
                        fontSize: 12, fontWeight: 600,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                        background: t.type === 'ok' ? '#14532d' : '#7f1d1d',
                        color: t.type === 'ok' ? '#bbf7d0' : '#fecaca',
                        border: `1px solid ${t.type === 'ok' ? '#166534' : '#991b1b'}`,
                    }}>
                        {t.type === 'ok' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                        {t.msg}
                    </div>
                ))}
            </div>

            {/* ══ LEFT: Products ══ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Top bar */}
                <div className="bg-white border-b border-slate-200 shadow-sm shrink-0" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Barcode */}
                    <form onSubmit={handleBarcodeSubmit}>
                        <div style={{ position: 'relative' }}>
                            <QrCode size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#22c55e' }} />
                            <input
                                ref={barcodeRef}
                                value={barcodeInput}
                                onChange={e => setBarcodeInput(e.target.value)}
                                placeholder="Scan barcode…"
                                style={{ paddingLeft: 24, paddingRight: 8, paddingTop: 5, paddingBottom: 5, width: 160, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11, fontFamily: 'monospace', outline: 'none' }}
                                autoFocus
                            />
                        </div>
                    </form>

                    {/* Search */}
                    <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
                        <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            ref={searchRef}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search products… (F3)"
                            style={{ paddingLeft: 24, paddingRight: 8, paddingTop: 5, paddingBottom: 5, width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11, outline: 'none' }}
                        />
                    </div>

                    {/* Category pills */}
                    <div style={{ display: 'flex', gap: 4, overflow: 'hidden', flex: 1 }}>
                        {[{ id: null, name: 'All' }, ...categories].map(c => (
                            <button
                                key={c.id ?? 'all'}
                                onClick={() => setSelectedCat(c.id)}
                                style={{
                                    flexShrink: 0, padding: '3px 9px', borderRadius: 20, fontSize: 10,
                                    fontWeight: 600, border: '1px solid',
                                    background: selectedCat === c.id ? (c.id ? '#16a34a' : '#1e293b') : 'white',
                                    color: selectedCat === c.id ? 'white' : '#64748b',
                                    borderColor: selectedCat === c.id ? (c.id ? '#16a34a' : '#1e293b') : '#e2e8f0',
                                    cursor: 'pointer',
                                }}
                            >{c.name}</button>
                        ))}
                    </div>

                    {/* Return Mode toggle + count */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
                        <button
                            type="button"
                            onClick={() => setIsReturnMode(!isReturnMode)}
                            style={{
                                padding: '4px 10px',
                                background: isReturnMode ? '#ef4444' : '#f1f5f9',
                                color: isReturnMode ? 'white' : '#64748b',
                                border: `1px solid ${isReturnMode ? '#dc2626' : '#e2e8f0'}`,
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {isReturnMode ? 'RETURN MODE ON' : 'Normal Sale'}
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Zap size={11} color="#f59e0b" />
                            <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{filtered.length} items</span>
                        </div>
                    </div>
                </div>{/* end top bar */}

                {/* Product grid */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                        {filtered.map(p => (
                            <button
                                key={p.id}
                                onClick={() => handleAddProduct(p)}
                                disabled={p.stock <= 0 && !isReturnMode}
                                style={{
                                    display: 'flex', flexDirection: 'column', background: lastAdded === p.id ? (isReturnMode ? '#fff1f2' : '#f0fdf4') : 'white',
                                    border: `1.5px solid ${lastAdded === p.id ? (isReturnMode ? '#fca5a5' : '#86efac') : '#e2e8f0'}`,
                                    borderRadius: 10, padding: '8px 10px', textAlign: 'left', cursor: (p.stock <= 0 && !isReturnMode) ? 'not-allowed' : 'pointer',
                                    opacity: (p.stock <= 0 && !isReturnMode) ? 0.5 : 1, transition: 'all 0.1s',
                                    boxShadow: lastAdded === p.id ? `0 0 0 2px ${isReturnMode ? '#fca5a5' : '#86efac'}` : 'none',
                                    minHeight: 80,
                                }}
                            >
                                {p.category_name && (
                                    <span style={{ fontSize: 9, color: '#94a3b8', background: '#f8fafc', borderRadius: 4, padding: '1px 4px', marginBottom: 4, alignSelf: 'flex-start' }}>
                                        {p.category_name}
                                    </span>
                                )}
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', lineHeight: 1.3, flex: 1, wordBreak: 'break-word' }}>{p.name}</span>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>Rs.{p.selling_price.toLocaleString()}</span>
                                    <span style={{
                                        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10,
                                        background: p.stock <= 0 ? '#fee2e2' : p.stock <= p.min_stock_alert ? '#fef3c7' : '#f1f5f9',
                                        color: p.stock <= 0 ? '#dc2626' : p.stock <= p.min_stock_alert ? '#d97706' : '#64748b',
                                    }}>{p.stock}</span>
                                </div>
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: '#cbd5e1' }}>
                                <ShoppingCart size={36} />
                                <p style={{ marginTop: 8, fontSize: 13, fontWeight: 500 }}>No products found</p>
                                <p style={{ fontSize: 11, marginTop: 4 }}>Try different search or category</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>{/* end LEFT column */}

            {/* ══ RIGHT: Cart ══ */}
            <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'white', borderLeft: '1px solid #e2e8f0', boxShadow: '-2px 0 8px rgba(0,0,0,0.04)' }}>
                {/* Cart header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#334155' }}>
                        <ShoppingCart size={13} color="#16a34a" />
                        Current Sale
                        {cart.length > 0 && (
                            <span style={{ background: '#16a34a', color: 'white', fontSize: 9, fontWeight: 700, borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {cart.reduce((s, i) => s + i.quantity, 0)}
                            </span>
                        )}
                    </div>
                    {cart.length > 0 && (
                        <button onClick={() => { clearCart(); beep('remove'); setDiscount(0) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, borderRadius: 6 }}>
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>

                {/* Items */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {cart.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#cbd5e1' }}>
                            <ShoppingCart size={28} />
                            <p style={{ fontSize: 11, marginTop: 8 }}>Scan or click a product</p>
                        </div>
                    ) : cart.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: '1px solid #f8fafc', background: item.quantity < 0 ? '#fff1f2' : 'transparent' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 11, fontWeight: 600, color: item.quantity < 0 ? '#ef4444' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.quantity < 0 ? '↩ ' : ''}{item.name}
                                </p>
                                <p style={{ fontSize: 10, color: '#16a34a', fontWeight: 700 }}>Rs.{item.price.toLocaleString()}</p>
                            </div>
                            {/* Qty stepper */}
                            <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: 8, padding: '0 2px' }}>
                                <button onClick={() => { updateCartQuantity(item.id, item.quantity - 1); beep('remove') }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Minus size={9} />
                                </button>
                                <span style={{ fontSize: 11, fontWeight: 700, color: item.quantity < 0 ? '#ef4444' : '#1e293b', minWidth: 18, textAlign: 'center' }}>{item.quantity}</span>
                                <button onClick={() => { updateCartQuantity(item.id, item.quantity + 1); beep('success') }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Plus size={9} />
                                </button>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: item.quantity < 0 ? '#ef4444' : '#1e293b', minWidth: 52, textAlign: 'right' }}>Rs.{item.total.toLocaleString()}</span>
                            <button onClick={() => { removeFromCart(item.id); beep('remove') }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 2 }}>
                                <X size={11} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div style={{ padding: '10px 12px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                        <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                        <span style={{ fontWeight: 600, color: '#334155' }}>Rs.{subtotal.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                        <span>Discount (Rs.)</span>
                        <input
                            type="number" min={0} max={subtotal}
                            value={discount || ''}
                            onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0"
                            style={{ width: 70, padding: '2px 6px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, textAlign: 'right', outline: 'none' }}
                        />
                    </div>
                    {taxRate > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                            <span>Tax ({taxRate}%)</span><span>Rs.{taxAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: '#15803d', paddingTop: 8, borderTop: '1.5px solid #e2e8f0', marginTop: 4 }}>
                        <span>TOTAL</span>
                        <span>Rs.{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <button
                        onClick={() => setShowPayment(true)}
                        disabled={cart.length === 0}
                        style={{
                            width: '100%', marginTop: 8, padding: '9px 0', background: cart.length === 0 ? '#e2e8f0' : (grandTotal < 0 ? '#ef4444' : '#16a34a'),
                            color: cart.length === 0 ? '#94a3b8' : 'white', border: 'none', borderRadius: 10, fontSize: 12,
                            fontWeight: 700, cursor: cart.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                    >
                        <Banknote size={14} />
                        {grandTotal < 0 ? 'Refund Customer' : 'Collect Payment'} · Rs.{Math.abs(grandTotal).toFixed(2)}
                        <span style={{ marginLeft: 'auto', fontSize: 9, fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '1px 5px', borderRadius: 4 }}>F9</span>
                    </button>
                </div>
            </div>

            {/* ══ Payment Modal ══ */}
            {
                showPayment && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                        <div style={{ background: 'white', width: '100%', maxWidth: 420, borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
                            {/* Header */}
                            <div style={{ background: '#0f172a', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{grandTotal < 0 ? 'Process Refund' : 'Collect Payment'}</div>
                                    <div style={{ fontSize: 10, color: '#64748b' }}>{cart.reduce((s, i) => s + i.quantity, 0)} items</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: grandTotal < 0 ? '#ef4444' : '#4ade80' }}>Rs.{Math.abs(grandTotal).toFixed(2)}</div>
                                    <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{grandTotal < 0 ? 'Refund Total' : 'Grand Total'}</div>
                                </div>
                            </div>

                            <div style={{ padding: '16px 20px' }}>
                                {/* Payment methods */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 14 }}>
                                    {(['Cash', 'Card', 'JazzCash', 'EasyPaisa'] as const).map(m => (
                                        <button key={m} onClick={() => setPaymentMethod(m)} style={{
                                            padding: '8px 4px', borderRadius: 10, border: `2px solid ${paymentMethod === m ? '#16a34a' : '#e2e8f0'}`,
                                            background: paymentMethod === m ? '#f0fdf4' : 'white', color: paymentMethod === m ? '#15803d' : '#64748b',
                                            fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                                        }}>
                                            {m === 'Cash' && <Banknote size={16} />}
                                            {m === 'Card' && <CreditCard size={16} />}
                                            {m === 'JazzCash' && <span style={{ fontSize: 13, fontWeight: 900 }}>JC</span>}
                                            {m === 'EasyPaisa' && <span style={{ fontSize: 13, fontWeight: 900 }}>EP</span>}
                                            {m}
                                        </button>
                                    ))}
                                </div>

                                {paymentMethod === 'Cash' ? (
                                    <>
                                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Cash Received (PKR)</label>
                                        <input
                                            type="number" value={amountPaid}
                                            onChange={e => setAmountPaid(e.target.value)}
                                            placeholder={grandTotal.toFixed(2)} autoFocus
                                            onKeyDown={e => e.key === 'Enter' && handleCheckout()}
                                            style={{ width: '100%', fontSize: 22, fontWeight: 800, padding: '10px 14px', border: '2px solid #4ade80', borderRadius: 10, outline: 'none', textAlign: 'center', marginBottom: 8 }}
                                        />
                                        {/* Quick amounts */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 5, marginBottom: 10 }}>
                                            {[100, 500, 1000, 2000, 5000].map(a => (
                                                <button key={a} onClick={() => setAmountPaid(a.toString())} style={{ padding: '5px 0', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#334155', background: 'white', cursor: 'pointer' }}>{a}</button>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: change > 0 ? '#eff6ff' : '#f8fafc', borderRadius: 10, border: `1px solid ${change > 0 ? '#bfdbfe' : '#e2e8f0'}`, marginBottom: 14 }}>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>Change to Return</span>
                                            <span style={{ fontSize: 18, fontWeight: 800, color: change > 0 ? '#1d4ed8' : '#94a3b8' }}>Rs.{change.toFixed(2)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '20px 0', marginBottom: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                        <CreditCard size={26} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                                        <div style={{ fontSize: 13, color: '#64748b' }}>Collect Rs.{grandTotal.toFixed(2)} via <strong>{paymentMethod}</strong></div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>then tap Confirm below</div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => { setShowPayment(false); setAmountPaid('') }}
                                        style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                                        Cancel
                                    </button>
                                    <button onClick={handleCheckout} disabled={cart.length === 0}
                                        style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#16a34a', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                                        ✓ Confirm & Print Receipt
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
