import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export interface CartItem {
  productId: string;
  variantId?: string;
  variantLabel?: string;
  name: string;
  sku: string;
  price: number;
  storeType: "bulk" | "staff";
  qty: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQty: (productId: string, qty: number, variantId?: string) => void;
  clear: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const getKey = (productId: string, variantId?: string) => variantId ? `${productId}__${variantId}` : productId;

  const addItem = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => getKey(i.productId, i.variantId) === getKey(item.productId, item.variantId));
      if (existing) {
        return prev.map((i) => getKey(i.productId, i.variantId) === getKey(item.productId, item.variantId) ? { ...i, qty: i.qty + qty } : i);
      }
      return [...prev, { ...item, qty }];
    });
  }, []);

  const removeItem = useCallback((productId: string, variantId?: string) => {
    const key = getKey(productId, variantId);
    setItems((prev) => prev.filter((i) => getKey(i.productId, i.variantId) !== key));
  }, []);

  const updateQty = useCallback((productId: string, qty: number, variantId?: string) => {
    const key = getKey(productId, variantId);
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => getKey(i.productId, i.variantId) !== key));
    } else {
      setItems((prev) => prev.map((i) => getKey(i.productId, i.variantId) === key ? { ...i, qty } : i));
    }
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clear, total, count }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
