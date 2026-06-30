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
  activeCoupon: any | null;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  userPreferences: any;
  updateUserPreferences: (prefs: any) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [activeCoupon, setActiveCoupon] = useState<any | null>(null);
  const [userPreferences, setUserPreferences] = useState<any>({});

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

  // Load Coupon & Preferences on mount and user change
  useEffect(() => {
    const savedCoupon = sessionStorage.getItem('shopnow_active_coupon');
    if (savedCoupon) {
      try {
        setActiveCoupon(JSON.parse(savedCoupon));
      } catch {}
    }

    async function loadPreferences() {
      if (user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('preferences')
            .eq('id', user.id)
            .maybeSingle();

          if (profile?.preferences) {
            setUserPreferences(profile.preferences);
          } else {
            const guestPrefs = sessionStorage.getItem('shopnow_user_preferences');
            if (guestPrefs) {
              try {
                const parsed = JSON.parse(guestPrefs);
                setUserPreferences(parsed);
                await supabase
                  .from('profiles')
                  .update({ preferences: parsed })
                  .eq('id', user.id);
                sessionStorage.removeItem('shopnow_user_preferences');
              } catch {}
            }
          }
        } catch (e) {
          console.error("Error loading user preferences from DB", e);
        }
      } else {
        const guestPrefs = sessionStorage.getItem('shopnow_user_preferences');
        if (guestPrefs) {
          try {
            setUserPreferences(JSON.parse(guestPrefs));
          } catch {}
        }
      }
    }
    loadPreferences();
  }, [user]);

  // Automatically validate coupon when cart or subtotal changes
  useEffect(() => {
    if (activeCoupon) {
      const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      if (subtotal < Number(activeCoupon.min_order_amount)) {
        setActiveCoupon(null);
        sessionStorage.removeItem('shopnow_active_coupon');
      }
    }
  }, [cart, activeCoupon]);

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
          } catch {
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
        } catch {}
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
        } catch {}
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

  const applyCoupon = async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('active', true)
        .maybeSingle();

      if (error || !coupon) {
        return { success: false, message: 'Invalid or expired coupon code' };
      }

      const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      if (subtotal < Number(coupon.min_order_amount)) {
        return { 
          success: false, 
          message: `Minimum order amount of ₹${coupon.min_order_amount} required for this coupon` 
        };
      }

      setActiveCoupon(coupon);
      sessionStorage.setItem('shopnow_active_coupon', JSON.stringify(coupon));
      return { success: true, message: `Coupon ${coupon.code} applied successfully!` };
    } catch (err) {
      console.error("Error applying coupon", err);
      return { success: false, message: 'Error applying coupon' };
    }
  };

  const removeCoupon = () => {
    setActiveCoupon(null);
    sessionStorage.removeItem('shopnow_active_coupon');
  };

  const updateUserPreferences = async (prefs: any) => {
    const merged = { ...userPreferences, ...prefs };
    setUserPreferences(merged);
    
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ preferences: merged })
          .eq('id', user.id);
      } catch (e) {
        console.error("Failed to sync user preferences to DB", e);
      }
    } else {
      sessionStorage.setItem('shopnow_user_preferences', JSON.stringify(merged));
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
        logout,
        activeCoupon,
        applyCoupon,
        removeCoupon,
        userPreferences,
        updateUserPreferences
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
