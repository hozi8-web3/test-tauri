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

interface AppState {
    isLocked: boolean
    isAuthenticated: boolean
    cart: CartItem[]
    taxRate: number
    discount: number
    setLock: (locked: boolean) => void
    setAuth: (auth: boolean) => void
    addToCart: (product: any, quantity?: number) => void
    removeFromCart: (cartItemId: number) => void
    updateCartQuantity: (cartItemId: number, quantity: number) => void
    clearCart: () => void
    setDiscount: (discount: number) => void
    setTaxRate: (rate: number) => void
}

export const useStore = create<AppState>((set) => ({
    isLocked: true,
    isAuthenticated: false,
    cart: [],
    taxRate: 0,
    discount: 0,

    setLock: (locked) => set({ isLocked: locked }),
    setAuth: (auth) => set({ isAuthenticated: auth, isLocked: !auth }),

    addToCart: (product, qty = 1) =>
        set((state) => {
            const existing = state.cart.find((item) => item.productId === product.id)
            if (existing) {
                return {
                    cart: state.cart.map((item) =>
                        item.productId === product.id
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
                        productId: product.id,
                        barcode: product.barcode,
                        name: product.name,
                        price: product.selling_price,
                        quantity: qty,
                        total: product.selling_price * qty
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
