'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Trash2, ArrowRight, ShieldCheck, HelpCircle, Lock } from 'lucide-react';
import { useApp } from '@/components/providers/app-context';
import { Button } from '@/components/ui/button';

export default function CartPage() {
  const { user, cart, updateCartQuantity, removeFromCart, isLoading } = useApp();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 flex flex-col gap-8 animate-pulse">
        <div className="h-8 w-44 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-28 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
            <div className="h-28 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          </div>
          <div className="h-64 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  // Not logged in UI
  if (!user) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 mb-4">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Log In to View Your Cart</h2>
        <p className="text-zinc-500 mt-2 max-w-sm text-sm">
          To protect your shopping experience and enable secure checkout, please sign in or register an account.
        </p>
        <div className="mt-8 flex gap-4">
          <Link href="/auth">
            <Button className="rounded-full px-6 py-5 font-semibold cursor-pointer">Sign In Now</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="rounded-full px-6 py-5 font-semibold cursor-pointer">
              Continue Browsing
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const tax = Number((subtotal * 0.08).toFixed(2)); // 8% estimated tax
  const total = Number((subtotal + tax).toFixed(2));

  const handleQuantityChange = async (productId: string, currentQty: number, change: number) => {
    const newQty = currentQty + change;
    
    // Check if new quantity exceeds stock count
    const cartItem = cart.find(item => item.product.id === productId);
    if (change > 0 && cartItem && newQty > cartItem.product.stock) {
      alert(`Cannot add more. Only ${cartItem.product.stock} units are in stock.`);
      return;
    }

    if (newQty <= 0) {
      setUpdatingId(productId);
      await removeFromCart(productId);
    } else {
      setUpdatingId(productId);
      await updateCartQuantity(productId, newQty);
    }
    setUpdatingId(null);
  };

  const handleRemove = async (productId: string) => {
    setUpdatingId(productId);
    await removeFromCart(productId);
    setUpdatingId(null);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl mb-8">
        Your Shopping Cart
      </h1>

      {cart.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-900 text-zinc-400 mb-4">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Your cart is empty</h3>
          <p className="text-sm text-zinc-500 max-w-xs mt-1">
            Browse our collection and add premium products to your cart to begin checking out.
          </p>
          <Link href="/" className="mt-6">
            <Button className="rounded-full px-6 cursor-pointer">Start Shopping</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-3">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 bg-white p-4 rounded-xl border border-zinc-100 dark:bg-zinc-950 dark:border-zinc-900 shadow-sm"
              >
                {/* Product Image */}
                <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-zinc-50 shrink-0 border border-zinc-100 dark:border-zinc-900">
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    fill
                    className="object-cover object-center"
                  />
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${item.product.id}`}
                    className="text-sm font-bold text-zinc-900 dark:text-zinc-50 hover:underline line-clamp-1"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-xs text-zinc-400 mt-0.5 capitalize">{item.product.category}</p>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mt-1.5">
                    ₹{item.product.price.toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Quantity adjustments */}
                <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-full h-8 overflow-hidden bg-white dark:bg-zinc-950 shrink-0">
                  <button
                    onClick={() => handleQuantityChange(item.product.id, item.quantity, -1)}
                    disabled={updatingId === item.product.id || item.quantity <= 1}
                    className="px-2.5 h-full hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500 font-bold transition-colors disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="px-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(item.product.id, item.quantity, 1)}
                    disabled={updatingId === item.product.id || item.quantity >= item.product.stock}
                    className="px-2.5 h-full hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500 font-bold transition-colors disabled:opacity-40"
                  >
                    +
                  </button>
                </div>

                {/* Total Item Price & Remove Button */}
                <div className="text-right pl-2 shrink-0">
                  <span className="block text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                  </span>
                  <button
                    onClick={() => handleRemove(item.product.id)}
                    disabled={updatingId === item.product.id}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Cart Summary Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-100 dark:border-zinc-900 shadow-sm flex flex-col gap-6">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Shipping</span>
                  <span className="text-green-600 font-semibold uppercase tracking-wider text-xs">Free</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Estimated Tax</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">₹{tax.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-zinc-100 dark:border-zinc-900 pt-3 flex justify-between font-bold text-base text-zinc-900 dark:text-zinc-50">
                  <span>Total Amount</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Checkout CTA */}
              <Link href="/checkout" className="w-full">
                <Button className="w-full rounded-full py-6 font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md">
                  Proceed to Checkout
                  <ArrowRight className="h-4.5 w-4.5" />
                </Button>
              </Link>

              {/* Badges block */}
              <div className="border-t border-zinc-100 dark:border-zinc-900 pt-4 flex flex-col gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4.5 w-4.5 text-zinc-400 shrink-0" />
                  <span>Secure 256-bit SSL encrypted checkout.</span>
                </div>
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4.5 w-4.5 text-zinc-400 shrink-0" />
                  <span>Free return shipping within 30 days.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
