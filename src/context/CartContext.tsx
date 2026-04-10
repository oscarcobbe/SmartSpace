"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { ShopifyCart, createCart, addToCart, updateCartLine, removeFromCart, updateCartAttributes } from "@/lib/shopify";

interface CartContextType {
  cart: ShopifyCart | null;
  isOpen: boolean;
  isLoading: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (variantId: string, quantity?: number, attributes?: { key: string; value: string }[]) => Promise<void>;
  updateItem: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  setCartAttribute: (key: string, value: string) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<ShopifyCart | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize cart
  useEffect(() => {
    const savedCartId = localStorage.getItem("shopify_cart_id");
    if (!savedCartId) {
      createCart().then((newCart) => {
        setCart(newCart);
        localStorage.setItem("shopify_cart_id", newCart.id);
      }).catch(console.error);
    }
  }, []);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const getOrCreateCart = useCallback(async (): Promise<string> => {
    if (cart?.id) return cart.id;
    const newCart = await createCart();
    setCart(newCart);
    localStorage.setItem("shopify_cart_id", newCart.id);
    return newCart.id;
  }, [cart]);

  const addItem = useCallback(async (variantId: string, quantity = 1, attributes?: { key: string; value: string }[]) => {
    setIsLoading(true);
    try {
      const cartId = await getOrCreateCart();
      const updatedCart = await addToCart(cartId, variantId, quantity, attributes);
      setCart(updatedCart);
      setIsOpen(true);
    } catch (error) {
      console.error("Failed to add to cart:", error);
      const newCart = await createCart();
      localStorage.setItem("shopify_cart_id", newCart.id);
      const updatedCart = await addToCart(newCart.id, variantId, quantity, attributes);
      setCart(updatedCart);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, [getOrCreateCart]);

  const updateItem = useCallback(async (lineId: string, quantity: number) => {
    if (!cart?.id) return;
    setIsLoading(true);
    try {
      const updatedCart = await updateCartLine(cart.id, lineId, quantity);
      setCart(updatedCart);
    } catch (error) {
      console.error("Failed to update cart:", error);
    } finally {
      setIsLoading(false);
    }
  }, [cart]);

  const removeItem = useCallback(async (lineId: string) => {
    if (!cart?.id) return;
    setIsLoading(true);
    try {
      const updatedCart = await removeFromCart(cart.id, [lineId]);
      setCart(updatedCart);
    } catch (error) {
      console.error("Failed to remove from cart:", error);
    } finally {
      setIsLoading(false);
    }
  }, [cart]);

  const setCartAttribute = useCallback(async (key: string, value: string) => {
    if (!cart?.id) return;
    try {
      await updateCartAttributes(cart.id, [{ key, value }]);
    } catch (error) {
      console.error("Failed to set cart attribute:", error);
    }
  }, [cart]);

  return (
    <CartContext.Provider
      value={{ cart, isOpen, isLoading, openCart, closeCart, addItem, updateItem, removeItem, setCartAttribute }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
