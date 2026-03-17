import { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, Upload, Search, X, Save, Tag, Package, RefreshCw } from 'lucide-react'

type Category = { id: number; name: string }
type Product = {
    id: number; barcode: string; name: string; category_id: number | null
    category_name: string; cost_price: number; selling_price: number; stock: number; min_stock_alert: number
}
const EMPTY_FORM = { barcode: '', name: '', categoryId: '', costPrice: '', sellingPrice: '', stock: '', minStockAlert: '5' }

/* ─── Stable helper components (MUST be outside Products body) ───────────
   If defined inside the component, they are recreated on every render,
   causing React to remount their children and trigger autoFocus each time.
─────────────────────────────────────────────────────────────────────────── */
const inp = "w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none transition"

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">{label}</label>
        {children}
    </div>
)

export const Products = () => {
    const [tab, setTab] = useState<'products' | 'categories'>('products')
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [search, setSearch] = useState('')
    const [filterCat, setFilterCat] = useState<number | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

    // Product Modal
    const [showProdModal, setShowProdModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [keepOpen, setKeepOpen] = useState(false)

    const addBarcodeRef = useRef<HTMLInputElement>(null)

    /* Category modal */
    const [showCatModal, setShowCatModal] = useState(false)
    const [editingCat, setEditingCat] = useState<Category | null>(null)
    const [catName, setCatName] = useState('')

    useEffect(() => { loadAll() }, [])

    const loadAll = async () => {
        const [pRes, cRes] = await Promise.all([
            window.api.db.all(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.name ASC`),
            window.api.db.all(`SELECT * FROM categories ORDER BY name ASC`)
        ])
        if (pRes.success) setProducts(pRes.rows || [])
        if (cRes.success) setCategories(cRes.rows || [])
    }

    /* ── Product CRUD ── */
    const openAddProduct = () => {
        setEditingProduct(null)
        setForm(EMPTY_FORM)
        setShowProdModal(true)
    }
    const openEditProduct = (p: Product) => {
        setEditingProduct(p)
        setForm({
            barcode: p.barcode || '',
            name: p.name,
            categoryId: p.category_id?.toString() || '',
            costPrice: p.cost_price.toString(),
            sellingPrice: p.selling_price.toString(),
            stock: p.stock.toString(),
            minStockAlert: p.min_stock_alert.toString(),
        })
        setShowProdModal(true)
    }
    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const barcode = form.barcode.trim() || `${Date.now()}`
        const args = [barcode, form.name, form.categoryId || null, parseFloat(form.costPrice) || 0, parseFloat(form.sellingPrice) || 0, parseInt(form.stock) || 0, parseInt(form.minStockAlert) || 5]
        if (editingProduct) {
            await window.api.db.run(`UPDATE products SET barcode=?,name=?,category_id=?,cost_price=?,selling_price=?,stock=?,min_stock_alert=? WHERE id=?`, [...args, editingProduct.id])
        } else {
            await window.api.db.run(`INSERT INTO products (barcode,name,category_id,cost_price,selling_price,stock,min_stock_alert) VALUES (?,?,?,?,?,?,?)`, args)
        }
        setSaving(false)
        loadAll()

        if (keepOpen && !editingProduct) {
            setForm({ barcode: '', name: '', categoryId: '', costPrice: '', sellingPrice: '', stock: '0', minStockAlert: '5' })
            setTimeout(() => addBarcodeRef.current?.focus(), 50)
        } else {
            setShowProdModal(false)
        }
    }
    const handleDeleteProduct = async (id: number, name: string) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
        await window.api.db.run("DELETE FROM products WHERE id=?", [id])
        setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
        loadAll()
    }

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return
        if (!confirm(`Delete ${selectedIds.size} selected products? This cannot be undone.`)) return
        const ids = Array.from(selectedIds)
        const placeholders = ids.map(() => '?').join(',')
        await window.api.db.run(`DELETE FROM products WHERE id IN (${placeholders})`, ids)
        setSelectedIds(new Set())
        loadAll()
    }

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const n = new Set(prev)
            if (n.has(id)) n.delete(id)
            else n.add(id)
            return n
        })
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === filtered.length && filtered.length > 0) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filtered.map(p => p.id)))
        }
    }

    /* ── Category CRUD ── */
    const openAddCat = () => { setEditingCat(null); setCatName(''); setShowCatModal(true) }
    const openEditCat = (c: Category) => { setEditingCat(c); setCatName(c.name); setShowCatModal(true) }
    const handleSaveCat = async (e: React.FormEvent) => {
        e.preventDefault()
        const n = catName.trim()
        if (!n) return
        if (editingCat) {
            await window.api.db.run("UPDATE categories SET name=? WHERE id=?", [n, editingCat.id])
        } else {
            await window.api.db.run("INSERT OR IGNORE INTO categories (name) VALUES (?)", [n])
        }
        setShowCatModal(false)
        loadAll()
    }
    const handleDeleteCat = async (id: number, name: string) => {
        const count = products.filter(p => p.category_id === id).length
        if (!confirm(`Delete "${name}"? ${count > 0 ? `${count} product(s) will become uncategorized. ` : ''}This cannot be undone.`)) return
        await window.api.db.run("UPDATE products SET category_id=NULL WHERE category_id=?", [id])
        await window.api.db.run("DELETE FROM categories WHERE id=?", [id])
        loadAll()
    }

    /* ── Filtered products ── */
    const filtered = products.filter(p => {
        const q = search.toLowerCase()
        const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q))
        const matchCat = filterCat === null || p.category_id === filterCat
        return matchSearch && matchCat
    })


    return (
        <div className="absolute inset-0 flex flex-col overflow-hidden p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h1 className="text-sm font-bold text-slate-800">Catalog Management</h1>
                    <p className="text-xs text-slate-500">{products.length} products · {categories.length} categories</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadAll} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><RefreshCw size={14} /></button>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
                        <Upload size={12} /> Import CSV
                        <input type="file" accept=".csv" className="hidden" onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return
                            // Placeholder for actual CSV import logic
                            alert(`Selected ${file.name} for import (Not fully implemented yet)`)
                            e.target.value = ''
                        }} />
                    </label>
                    {tab === 'categories' ? (
                        <button onClick={openAddCat} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                            <Plus size={13} /> Add Category
                        </button>
                    ) : (
                        <button onClick={openAddProduct} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors shadow-sm">
                            <Plus size={13} /> Add Product
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-3 bg-slate-100 rounded-lg p-0.5 w-fit border border-slate-200">
                <button onClick={() => setTab('products')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === 'products' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Package size={13} /> Products ({products.length})
                </button>
                <button onClick={() => setTab('categories')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === 'categories' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Tag size={13} /> Categories ({categories.length})
                </button>
            </div>

            {/* ── PRODUCTS TAB ── */}
            {tab === 'products' && (
                <>
                    {/* Search + category filter */}
                    <div className="flex items-center gap-2 mb-3">
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" className="pl-8 pr-3 py-1.5 w-56 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-green-400 outline-none" />
                        </div>
                        <select value={filterCat ?? ''} onChange={e => setFilterCat(e.target.value ? Number(e.target.value) : null)} className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 focus:ring-2 focus:ring-green-400 outline-none">
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <span className="text-xs text-slate-400">{filtered.length} results</span>
                    </div>

                    <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-3 py-2 w-8 text-center border-r border-slate-100">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                                checked={filtered.length > 0 && selectedIds.size === filtered.length}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        {['Product Name', 'Barcode', 'Category', 'Cost', 'Sell Price', 'Stock', 'Alert', ''].map(h => (
                                            <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map(p => (
                                        <tr key={p.id} className={`transition-colors group ${selectedIds.has(p.id) ? 'bg-green-50/50' : 'hover:bg-slate-50/80'}`}>
                                            <td className="px-3 py-1.5 w-8 text-center border-r border-slate-50">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                                    checked={selectedIds.has(p.id)}
                                                    onChange={() => toggleSelect(p.id)}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-xs font-semibold text-slate-800">{p.name}</td>
                                            <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{p.barcode || '—'}</td>
                                            <td className="px-3 py-2">
                                                {p.category_name
                                                    ? <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded">{p.category_name}</span>
                                                    : <span className="text-[10px] text-slate-400 italic">None</span>}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-slate-500">Rs.{p.cost_price.toLocaleString()}</td>
                                            <td className="px-3 py-2 text-xs font-bold text-green-600">Rs.{p.selling_price.toLocaleString()}</td>
                                            <td className="px-3 py-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.stock <= 0 ? 'bg-red-100 text-red-700' : p.stock <= p.min_stock_alert ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{p.stock}</span>
                                            </td>
                                            <td className="px-3 py-2 text-xs text-slate-400">{p.min_stock_alert}</td>
                                            <td className="px-3 py-2 pr-4">
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEditProduct(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"><Edit2 size={13} /></button>
                                                    <button onClick={() => handleDeleteProduct(p.id, p.name)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-xs">No products match your search.</td></tr>}
                                </tbody>
                            </table>
                        </div>

                        {/* Batch Action Bar (floating) */}
                        {selectedIds.size > 0 && (
                            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 z-20">
                                <span className="text-sm font-semibold">{selectedIds.size} selected</span>
                                <div className="w-px h-4 bg-slate-700"></div>
                                <button onClick={() => setSelectedIds(new Set())} className="text-xs font-medium text-slate-400 hover:text-white transition-colors">Deselect</button>
                                <button onClick={handleBatchDelete} className="flex items-center gap-1.5 text-xs font-bold bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-colors ml-2 shadow-sm">
                                    <Trash2 size={13} /> Delete Selected
                                </button>
                            </div>
                        )}

                        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between z-10 relative">
                            <span>Showing {filtered.length} of {products.length}</span>
                            <span>Total Stock Value: <strong className="text-green-600">Rs.{products.reduce((s, p) => s + (p.cost_price * p.stock), 0).toLocaleString()}</strong></span>
                        </div>
                    </div>
                </>
            )}

            {/* ── CATEGORIES TAB ── */}
            {tab === 'categories' && (
                <div className="flex-1 flex flex-col gap-3">
                    {categories.length === 0 ? (
                        <div className="flex-1 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-3 shadow-sm">
                            <Tag size={36} className="text-slate-200" />
                            <div className="text-center">
                                <p className="text-sm font-semibold text-slate-600">No categories yet</p>
                                <p className="text-xs text-slate-400 mt-1">Categories help you organise products in the POS grid</p>
                            </div>
                            <button onClick={openAddCat} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                                <Plus size={13} /> Create First Category
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {categories.map(c => {
                                const count = products.filter(p => p.category_id === c.id).length
                                return (
                                    <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                                                <Tag size={18} className="text-blue-500" />
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditCat(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 size={12} /></button>
                                                <button onClick={() => handleDeleteCat(c.id, c.name)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                                            </div>
                                        </div>
                                        <p className="text-sm font-bold text-slate-800">{c.name}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{count} product{count !== 1 ? 's' : ''}</p>
                                    </div>
                                )
                            })}
                            {/* Add tile */}
                            <button onClick={openAddCat} className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-slate-400 hover:text-blue-500 min-h-[100px]">
                                <Plus size={20} />
                                <span className="text-xs font-semibold">Add Category</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ══ PRODUCT MODAL ══ */}
            {showProdModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-sm font-bold text-slate-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                            <button onClick={() => setShowProdModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"><X size={15} /></button>
                        </div>
                        <form onSubmit={handleSaveProduct} className="p-5 grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <Field label="Product Name *">
                                    <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inp} placeholder="e.g. Milk 1L Full Cream" autoFocus />
                                </Field>
                            </div>
                            <Field label="Barcode (blank = auto-generate)">
                                <input ref={addBarcodeRef} value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} className={`${inp} font-mono`} placeholder="Scan or type…" autoFocus />
                            </Field>
                            <Field label="Category">
                                <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className={inp}>
                                    <option value="">— No Category —</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </Field>
                            <Field label="Cost Price (Rs) *">
                                <input required type="number" step="0.01" min={0} value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} className={inp} placeholder="0.00" />
                            </Field>
                            <Field label="Selling Price (Rs) *">
                                <input required type="number" step="0.01" min={0} value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: e.target.value })} className={inp} placeholder="0.00" />
                            </Field>
                            <Field label="Current Stock *">
                                <input required type="number" min={0} value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className={inp} placeholder="0" />
                            </Field>
                            <Field label="Low Stock Alert Level">
                                <input required type="number" min={0} value={form.minStockAlert} onChange={e => setForm({ ...form, minStockAlert: e.target.value })} className={inp} placeholder="5" />
                            </Field>

                            {/* Margin preview */}
                            {form.costPrice && form.sellingPrice && (
                                <div className="col-span-2 bg-slate-50 rounded-lg px-3 py-2 flex items-center justify-between text-xs border border-slate-200">
                                    <span className="text-slate-500">Profit Margin</span>
                                    <span className={`font-bold ${(parseFloat(form.sellingPrice) - parseFloat(form.costPrice)) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        Rs.{(parseFloat(form.sellingPrice) - parseFloat(form.costPrice)).toFixed(2)} ({(((parseFloat(form.sellingPrice) - parseFloat(form.costPrice)) / parseFloat(form.sellingPrice)) * 100).toFixed(1)}%)
                                    </span>
                                </div>
                            )}


                            <div className="col-span-2 flex flex-col gap-3 mt-1">
                                {!editingProduct && (
                                    <label className="flex items-center gap-2 px-1 cursor-pointer w-fit text-sm text-slate-600 hover:text-slate-800 transition-colors">
                                        <input type="checkbox" checked={keepOpen} onChange={e => setKeepOpen(e.target.checked)} className="rounded border-slate-300 text-green-600 focus:ring-green-500" />
                                        <span><strong>Batch Mode:</strong> Keep window open to add another</span>
                                    </label>
                                )}
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setShowProdModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm disabled:opacity-60">
                                        <Save size={13} /> {saving ? 'Saving…' : (editingProduct ? 'Save Changes' : (keepOpen ? 'Save & Add Next' : 'Create Product'))}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══ CATEGORY MODAL ══ */}
            {showCatModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-sm font-bold text-slate-800">{editingCat ? 'Rename Category' : 'New Category'}</h2>
                            <button onClick={() => setShowCatModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"><X size={15} /></button>
                        </div>
                        <form onSubmit={handleSaveCat} className="p-5">
                            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Category Name *</label>
                            <input
                                required
                                value={catName}
                                onChange={e => setCatName(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-blue-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-200 outline-none mb-4"
                                placeholder="e.g. Beverages, Snacks, Dairy…"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setShowCatModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">
                                    <Save size={13} /> {editingCat ? 'Update' : 'Create Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
