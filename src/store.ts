import { create } from 'zustand'

export interface CartItem {
    id: number
    productId: number
    barcode: string | null
    name: string
    price: number
    quantity: number
    total: number
}

export interface User {
    id: number
    username: string
    role: string
}

interface AppState {
    isLocked: boolean
    isAuthenticated: boolean
    currentUser: User | null
    cart: CartItem[]
    taxRate: number
    discount: number
    setLock: (locked: boolean) => void
    setAuth: (auth: boolean, user?: User | null) => void
    addToCart: (product: Record<string, unknown>, quantity?: number) => void
    removeFromCart: (cartItemId: number) => void
    updateCartQuantity: (cartItemId: number, quantity: number) => void
    clearCart: () => void
    setDiscount: (discount: number) => void
    setTaxRate: (rate: number) => void
}

export const useStore = create<AppState>((set) => ({
    isLocked: true,
    isAuthenticated: false,
    currentUser: null,
    cart: [],
    taxRate: 0,
    discount: 0,

    setLock: (locked) => set({ isLocked: locked }),
    setAuth: (auth, user = null) => set({ isAuthenticated: auth, isLocked: !auth, currentUser: auth ? user : null }),

    addToCart: (product, qty = 1) =>
        set((state) => {
            const pid = product.id as number
            const price = product.selling_price as number
            const existing = state.cart.find((item) => item.productId === pid)
            if (existing) {
                return {
                    cart: state.cart.map((item) =>
                        item.productId === pid
                            ? {
                                ...item,
                                quantity: item.quantity + qty,
                                total: (item.quantity + qty) * item.price
                            }
                            : item
                    ).filter(item => item.quantity !== 0)
                }
            }
            return {
                cart: [
                    {
                        id: Date.now(),
                        productId: pid,
                        barcode: product.barcode as string | null,
                        name: product.name as string,
                        price,
                        quantity: qty,
                        total: price * qty
                    },
                    ...state.cart
                ]
            }
        }),

    removeFromCart: (id) =>
        set((state) => ({ cart: state.cart.filter((item) => item.id !== id) })),

    updateCartQuantity: (id, quantity) =>
        set((state) => ({
            cart: state.cart.map((item) =>
                item.id === id ? { ...item, quantity, total: quantity * item.price } : item
            ).filter(item => item.quantity !== 0)
        })),

    clearCart: () => set({ cart: [], discount: 0 }),
    setDiscount: (discount) => set({ discount }),
    setTaxRate: (rate) => set({ taxRate: rate })
}))
