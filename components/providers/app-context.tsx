'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Product } from '@/lib/products-data';

interface CartItem {
  id: string;
  product: Product;
  quantity: number;
}

interface AppContextType {
  user: any | null;
  isLoading: boolean;
  cart: CartItem[];
  wishlist: Product[];
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  addToCart: (productId: string, quantity?: number) => Promise<boolean>;
  updateCartQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [productsList, setProductsList] = useState<Product[]>([]);

  // Load products list locally to resolve anonymous wishlist product IDs
  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProductsList(data);
        }
      })
      .catch(err => console.error("Failed to load products in context", err));
  }, []);

  // Sync wishlist from LocalStorage on mount (or when products list loads)
  useEffect(() => {
    if (!user && productsList.length > 0) {
      const local = localStorage.getItem('shopnow_wishlist');
      if (local) {
        try {
          const ids: string[] = JSON.parse(local);
          const items = productsList.filter(p => ids.includes(p.id));
          setWishlist(items);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [user, productsList]);

  // Auth Listener
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      setIsLoading(false);

      if (activeUser) {
        // Sync Guest Wishlist to DB upon login
        const local = localStorage.getItem('shopnow_wishlist');
        if (local) {
          try {
            const ids: string[] = JSON.parse(local);
            if (ids.length > 0) {
              await fetch('/api/wishlist', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-user-id': activeUser.id
                },
                body: JSON.stringify({ productIds: ids })
              });
              localStorage.removeItem('shopnow_wishlist');
            }
          } catch (e) {
            console.error("Failed to sync guest wishlist on login", e);
          }
        }
        
        // Refresh User States
        refreshUserStates(activeUser.id);
      } else {
        // Clear User States
        setCart([]);
        // Re-read guest wishlist from LocalStorage
        const local = localStorage.getItem('shopnow_wishlist');
        if (local && productsList.length > 0) {
          try {
            const ids = JSON.parse(local);
            setWishlist(productsList.filter(p => ids.includes(p.id)));
          } catch (e) {
            setWishlist([]);
          }
        } else {
          setWishlist([]);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [productsList]);

  const refreshUserStates = async (userId: string) => {
    try {
      const headers = { 'x-user-id': userId };
      
      // Fetch Cart
      const cartRes = await fetch('/api/cart', { headers });
      if (cartRes.ok) {
        const cartData = await cartRes.json();
        setCart(cartData);
      }

      // Fetch Wishlist
      const wishlistRes = await fetch('/api/wishlist', { headers });
      if (wishlistRes.ok) {
        const wishlistData = await wishlistRes.json();
        setWishlist(wishlistData);
      }
    } catch (error) {
      console.error("Error loading user states", error);
    }
  };

  const refreshCart = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/cart', {
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const refreshWishlist = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/wishlist', {
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        const data = await res.json();
        setWishlist(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addToCart = async (productId: string, quantity: number = 1): Promise<boolean> => {
    if (!user) {
      setShowLoginModal(true);
      return false;
    }
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ productId, quantity })
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const updateCartQuantity = async (productId: string, quantity: number) => {
    if (!user) return;
    try {
      const res = await fetch('/api/cart', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ productId, quantity })
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/cart?productId=${productId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearCart = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/cart', {
        method: 'DELETE',
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addToWishlist = async (product: Product) => {
    if (!user) {
      // Guest: Add to local storage
      const local = localStorage.getItem('shopnow_wishlist');
      let ids: string[] = [];
      if (local) {
        try {
          ids = JSON.parse(local);
        } catch (e) {}
      }
      if (!ids.includes(product.id)) {
        ids.push(product.id);
        localStorage.setItem('shopnow_wishlist', JSON.stringify(ids));
        setWishlist(prev => [...prev.filter(p => p.id !== product.id), product]);
      }
    } else {
      // User: Add to DB
      try {
        const res = await fetch('/api/wishlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          },
          body: JSON.stringify({ productId: product.id })
        });
        if (res.ok) {
          const data = await res.json();
          setWishlist(data);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (!user) {
      // Guest: Remove from local storage
      const local = localStorage.getItem('shopnow_wishlist');
      if (local) {
        try {
          let ids: string[] = JSON.parse(local);
          ids = ids.filter(id => id !== productId);
          localStorage.setItem('shopnow_wishlist', JSON.stringify(ids));
          setWishlist(prev => prev.filter(p => p.id !== productId));
        } catch (e) {}
      }
    } else {
      // User: Remove from DB
      try {
        const res = await fetch(`/api/wishlist?productId=${productId}`, {
          method: 'DELETE',
          headers: { 'x-user-id': user.id }
        });
        if (res.ok) {
          const data = await res.json();
          setWishlist(data);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isLoading,
        cart,
        wishlist,
        showLoginModal,
        setShowLoginModal,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        addToWishlist,
        removeFromWishlist,
        refreshCart,
        refreshWishlist,
        logout
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppContextProvider');
  }
  return context;
}
