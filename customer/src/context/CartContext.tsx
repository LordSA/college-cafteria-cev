'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category_name?: string;
  quantity: number;
}

export interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => Promise<{ success: boolean; error?: string }>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<{ success: boolean; error?: string }>;
  clearCart: () => Promise<void>;
  itemCount: number;
  subtotal: number;
  expiresAt: number | null;
  remainingSeconds: number;
  isExpired: boolean;
  sessionId: string;
}

const CART_STORAGE_KEY = 'cafteria_customer_cart';
const CART_EXPIRY_KEY = 'cafteria_cart_expires_at';
const CART_SESSION_KEY = 'cafteria_cart_session_id';
const LOCK_DURATION_SECONDS = 300;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let sid = '';
    try {
      sid = localStorage.getItem(CART_SESSION_KEY) || '';
      if (!sid) {
        sid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'sess_' + Date.now();
        localStorage.setItem(CART_SESSION_KEY, sid);
      }
      setSessionId(sid);

      const storedItems = localStorage.getItem(CART_STORAGE_KEY);
      if (storedItems) {
        const parsed = JSON.parse(storedItems);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }

      const storedExpiry = localStorage.getItem(CART_EXPIRY_KEY);
      if (storedExpiry) {
        const expTime = parseInt(storedExpiry, 10);
        if (!isNaN(expTime) && expTime > Date.now()) {
          setExpiresAt(expTime);
        } else if (!isNaN(expTime) && expTime <= Date.now()) {
          localStorage.removeItem(CART_STORAGE_KEY);
          localStorage.removeItem(CART_EXPIRY_KEY);
          setItems([]);
          setExpiresAt(null);
          setIsExpired(true);
        }
      }
    } catch {}
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      if (items.length === 0) {
        localStorage.removeItem(CART_EXPIRY_KEY);
        setExpiresAt(null);
        setRemainingSeconds(0);
      }
    } catch {}
  }, [items, isInitialized]);

  const syncBackendLock = async (menuItemId: string, quantity: number) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`${API_BASE_URL}/api/v1/cart/lock`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          menu_item_id: menuItemId,
          quantity,
          session_id: sessionId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error?.message || 'Item lock failed' };
      }
      return { success: true, data: data.data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error locking item' };
    }
  };

  const syncBackendUnlock = async (menuItemId: string) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      await fetch(`${API_BASE_URL}/api/v1/cart/unlock`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          menu_item_id: menuItemId,
          session_id: sessionId || undefined,
        }),
      });
    } catch {}
  };

  const syncBackendReleaseAll = async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      await fetch(`${API_BASE_URL}/api/v1/cart/release-all`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: sessionId || undefined,
        }),
      });
    } catch {}
  };

  const refreshExpiry = useCallback(() => {
    const newExpiry = Date.now() + LOCK_DURATION_SECONDS * 1000;
    setExpiresAt(newExpiry);
    setIsExpired(false);
    try {
      localStorage.setItem(CART_EXPIRY_KEY, newExpiry.toString());
    } catch {}
  }, []);

  const handleExpiryTimeout = useCallback(async () => {
    setIsExpired(true);
    setItems([]);
    setExpiresAt(null);
    setRemainingSeconds(0);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(CART_EXPIRY_KEY);
    } catch {}
    await syncBackendReleaseAll();
  }, [sessionId, session]);

  useEffect(() => {
    if (!expiresAt || items.length === 0) {
      setRemainingSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(diff);
      if (diff <= 0) {
        clearInterval(interval);
        handleExpiryTimeout();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, items.length, handleExpiryTimeout]);

  const addItem = useCallback(
    async (newItem: Omit<CartItem, 'quantity'>): Promise<{ success: boolean; error?: string }> => {
      const existing = items.find((i) => i.id === newItem.id);
      const targetQty = existing ? Math.min(50, existing.quantity + 1) : 1;

      const lockRes = await syncBackendLock(newItem.id, targetQty);
      if (!lockRes.success) {
        return { success: false, error: lockRes.error };
      }

      setItems((prev) => {
        const existingIndex = prev.findIndex((i) => i.id === newItem.id);
        if (existingIndex > -1) {
          return prev.map((item, idx) => (idx === existingIndex ? { ...item, quantity: targetQty } : item));
        }
        return [...prev, { ...newItem, quantity: 1 }];
      });

      refreshExpiry();
      return { success: true };
    },
    [items, sessionId, session, refreshExpiry]
  );

  const removeItem = useCallback(
    async (id: string) => {
      await syncBackendUnlock(id);
      setItems((prev) => {
        const remaining = prev.filter((item) => item.id !== id);
        if (remaining.length === 0) {
          setExpiresAt(null);
          try {
            localStorage.removeItem(CART_EXPIRY_KEY);
          } catch {}
        }
        return remaining;
      });
    },
    [sessionId, session]
  );

  const updateQuantity = useCallback(
    async (id: string, quantity: number): Promise<{ success: boolean; error?: string }> => {
      if (quantity <= 0) {
        await removeItem(id);
        return { success: true };
      }

      const cappedQty = Math.min(50, quantity);
      const lockRes = await syncBackendLock(id, cappedQty);
      if (!lockRes.success) {
        return { success: false, error: lockRes.error };
      }

      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: cappedQty } : item)));
      refreshExpiry();
      return { success: true };
    },
    [removeItem, sessionId, session, refreshExpiry]
  );

  const clearCart = useCallback(async () => {
    await syncBackendReleaseAll();
    setItems([]);
    setExpiresAt(null);
    setRemainingSeconds(0);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(CART_EXPIRY_KEY);
    } catch {}
  }, [sessionId, session]);

  const itemCount = useMemo(() => {
    return items.reduce((acc, item) => acc + item.quantity, 0);
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        expiresAt,
        remainingSeconds,
        isExpired,
        sessionId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
