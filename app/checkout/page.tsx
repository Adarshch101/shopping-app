'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Lock, MapPin, Phone, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useApp } from '@/components/providers/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CheckoutPage() {
  const { user, cart, refreshCart, isLoading, activeCoupon, applyCoupon, removeCoupon } = useApp();

  // Form states
  const [fullName, setFullName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  
  // Coupon states
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleApplyPromo = async () => {
    if (!couponCodeInput.trim()) return;
    setCouponError('');
    setCouponSuccess('');
    setIsApplyingCoupon(true);
    try {
      const result = await applyCoupon(couponCodeInput);
      if (result.success) {
        setCouponSuccess(result.message);
        setCouponCodeInput('');
      } else {
        setCouponError(result.message);
      }
    } catch {
      setCouponError('Error applying promo code.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 flex flex-col gap-8 animate-pulse">
        <div className="h-8 w-44 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-44 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
            <div className="h-32 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          </div>
          <div className="h-64 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  // Guest warning
  if (!user) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 mb-4">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Log In to Checkout</h2>
        <p className="text-zinc-500 mt-2 max-w-sm text-sm">
          Checking out and placing orders requires a registered ShopNow account.
        </p>
        <Link href="/auth" className="mt-8">
          <Button className="rounded-full px-6 py-5 font-semibold cursor-pointer">Sign In Now</Button>
        </Link>
      </div>
    );
  }

  // Cart is empty and no successful order placed
  if (cart.length === 0 && !orderSuccess) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-900 text-zinc-400 mb-4">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Your cart is empty</h3>
        <p className="text-sm text-zinc-500 max-w-xs mt-1">
          Add items to your cart before proceeding to checkout.
        </p>
        <Link href="/" className="mt-6">
          <Button className="rounded-full px-6 cursor-pointer">Explore Products</Button>
        </Link>
      </div>
    );
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  
  let discount = 0;
  if (activeCoupon) {
    if (activeCoupon.discount_percent > 0) {
      discount = Number(((subtotal * Number(activeCoupon.discount_percent)) / 100).toFixed(2));
    } else if (activeCoupon.discount_amount > 0) {
      discount = Math.min(Number(activeCoupon.discount_amount), subtotal);
    }
  }

  const tax = Number((Math.max(0, subtotal - discount) * 0.01).toFixed(2));
  const total = Number((Math.max(0, subtotal - discount) + tax).toFixed(2));

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const shippingAddress = {
      fullName,
      addressLine1,
      city,
      postalCode,
      phone
    };

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ 
          shippingAddress,
          couponCode: activeCoupon?.code || null
        })
      });

      if (res.ok) {
        const orderData = await res.json();
        setOrderSuccess(orderData);
        removeCoupon(); // Clear coupon after order placement
        await refreshCart(); // Refresh cart in state (should now be empty)
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to place order.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success Screen
  if (orderSuccess) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-600 mb-6 border border-green-500/20">
          <CheckCircle2 className="h-8 w-8 animate-in zoom-in duration-300" />
        </div>
        
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Thank You for Your Order!
        </h1>
        <p className="text-zinc-500 mt-2 max-w-md text-sm">
          Your order has been placed successfully and is currently being processed.
        </p>

        {/* Order Details box */}
        <div className="mt-8 w-full bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 p-6 rounded-2xl text-left shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-4 mb-4">
            <span className="text-sm font-semibold text-zinc-500">Order Reference</span>
            <span className="text-sm font-bold text-neutral-900 dark:text-zinc-200">{orderSuccess.id}</span>
          </div>

          {/* Delivery Details */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Shipping Address
            </h3>
            <div className="text-sm text-zinc-700 dark:text-zinc-300">
              <p className="font-semibold">{orderSuccess.shipping_address.fullName}</p>
              <p>{orderSuccess.shipping_address.addressLine1}</p>
              <p>{orderSuccess.shipping_address.city}, {orderSuccess.shipping_address.postalCode}</p>
              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                <Phone className="h-3 w-3" /> {orderSuccess.shipping_address.phone}
              </p>
            </div>
          </div>

          {/* Items Summary */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" />
              Items Ordered
            </h3>
            <div className="space-y-3">
              {orderSuccess.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400 line-clamp-1 flex-1 pr-4">
                    {item.name} <span className="text-xs text-zinc-400">x{item.quantity}</span>
                  </span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div className="border-t border-zinc-100 dark:border-zinc-900 pt-3 flex justify-between font-bold text-base text-zinc-900 dark:text-zinc-50">
                <span>Total Paid</span>
                <span>₹{orderSuccess.total_amount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        <Link href="/" className="mt-8">
          <Button className="rounded-full px-8 py-5 cursor-pointer">Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl mb-8">
        Checkout Secured
      </h1>

      {errorMsg && (
        <div className="mb-6 p-4 text-sm text-red-600 bg-red-500/5 rounded-xl border border-red-500/10 dark:text-red-400">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-3">
        {/* Forms column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Form */}
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-100 dark:border-zinc-900 shadow-sm">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 mb-6">
              <MapPin className="h-5 w-5 text-zinc-400 shrink-0" />
              Shipping Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Full Name</label>
                <Input
                  required
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isSubmitting}
                  className="rounded-xl h-11"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Address Line 1</label>
                <Input
                  required
                  placeholder="123 Main Street, Apt 4B"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  disabled={isSubmitting}
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">City</label>
                <Input
                  required
                  placeholder="New York"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={isSubmitting}
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Postal Code</label>
                <Input
                  required
                  placeholder="10001"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  disabled={isSubmitting}
                  className="rounded-xl h-11"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Phone Number</label>
                <Input
                  required
                  type="tel"
                  placeholder="+1 (555) 019-2834"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                  className="rounded-xl h-11"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Order details panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-100 dark:border-zinc-900 shadow-sm flex flex-col gap-6">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Review Your Order</h2>

            {/* Cart products breakdown */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900 max-h-48 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between py-3 text-sm">
                  <div className="flex-1 pr-4">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-1">{item.product.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Quantity: {item.quantity}</p>
                  </div>
                  <span className="font-bold text-zinc-950 dark:text-zinc-100">
                    ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            {/* Promo Code Input */}
            <div className="border-t border-zinc-100 dark:border-zinc-900 pt-4 flex flex-col gap-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Promo Code</label>
              {activeCoupon ? (
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 px-3 py-2 rounded-xl border border-zinc-100 dark:border-zinc-900 text-xs">
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase">{activeCoupon.code}</span>
                    <p className="text-[10px] text-zinc-500">{activeCoupon.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code (e.g. SAVE10)"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value)}
                    className="rounded-xl h-9 text-xs uppercase"
                    disabled={isApplyingCoupon}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyPromo}
                    disabled={!couponCodeInput.trim() || isApplyingCoupon}
                    className="rounded-xl px-3 h-9 text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    {isApplyingCoupon ? '...' : 'Apply'}
                  </Button>
                </div>
              )}
              {couponError && <p className="text-[10px] text-red-500 font-medium">{couponError}</p>}
              {couponSuccess && <p className="text-[10px] text-emerald-500 font-medium">{couponSuccess}</p>}
            </div>

            {/* Price Calculations */}
            <div className="space-y-3 text-sm border-t border-zinc-100 dark:border-zinc-900 pt-4">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-500 font-medium">
                  <span>Discount ({activeCoupon?.code})</span>
                  <span>-₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
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

            {/* Place Order Action */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full py-6 font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  Processing Order...
                </>
              ) : (
                <>
                  Place Your Order
                  <ShieldCheck className="h-4.5 w-4.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
