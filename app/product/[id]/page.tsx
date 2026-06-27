'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star, Heart, ShoppingBag, Truck, ShieldAlert, RotateCcw } from 'lucide-react';
import { useApp } from '@/components/providers/app-context';
import { Product } from '@/lib/products-data';
import { Button } from '@/components/ui/button';

export default function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { wishlist, cart, addToCart, updateCartQuantity, addToWishlist, removeFromWishlist } = useApp();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // Sync quantity state with cart quantity if item already exists in cart
  useEffect(() => {
    if (product) {
      const cartItem = cart.find(item => item.product.id === product.id);
      if (cartItem) {
        setQuantity(cartItem.quantity);
      } else {
        setQuantity(1);
      }
    }
  }, [cart, product]);

  // Fetch product detail
  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await fetch(`/api/products/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data);
        } else {
          setProduct(null);
        }
      } catch (e) {
        console.error("Error loading product detail", e);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 flex flex-col gap-8 animate-pulse">
        <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square w-full bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
          <div className="flex flex-col gap-4">
            <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-8 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-1/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-6 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-20 w-full bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center flex flex-col items-center justify-center">
        <ShieldAlert className="h-12 w-12 text-zinc-400 mb-4" />
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Product Not Found</h2>
        <p className="text-zinc-500 mt-2 max-w-md">
          The product you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link href="/" className="mt-6">
          <Button className="rounded-full">Back to Shop</Button>
        </Link>
      </div>
    );
  }

  const isWishlisted = wishlist.some(item => item.id === product.id);
  const isInCart = cart.some(item => item.product.id === product.id);

  const handleWishlistToggle = async () => {
    if (isWishlisted) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(product);
    }
  };

  const handleAddToCart = async () => {
    setAddingToCart(true);
    const cartItem = cart.find(item => item.product.id === product.id);
    if (cartItem) {
      await updateCartQuantity(product.id, quantity);
    } else {
      await addToCart(product.id, quantity);
    }
    setAddingToCart(false);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Products
      </Link>

      <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-2">
        {/* Left Column: Image Gallery */}
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-900 shadow-sm">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-w-7xl) 50vw, 100vw"
            className="object-cover object-center"
            priority
          />
        </div>

        {/* Right Column: Product Info & Actions */}
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            {product.category}
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            {product.name}
          </h1>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-3">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(product.rating.rate)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-zinc-200 dark:text-zinc-800'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {product.rating.rate}
            </span>
            <span className="text-xs text-zinc-400">
              ({product.rating.count} customer reviews)
            </span>
          </div>

          {/* Price */}
          <div className="mt-4">
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Description */}
          <p className="mt-6 text-zinc-600 dark:text-zinc-400 leading-relaxed text-sm">
            {product.description}
          </p>

          {/* Key Features */}
          <div className="mt-6 border-t border-zinc-100 dark:border-zinc-900 pt-6">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Key Features</h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {product.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-900 dark:bg-zinc-100 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Quantity selector */}
          <div className="mt-6 flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Quantity</span>
              <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-full h-10 overflow-hidden bg-white dark:bg-zinc-950">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="px-3 h-full hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500 font-bold transition-colors disabled:opacity-40"
                >
                  -
                </button>
                <span className="px-4 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock}
                  className="px-3 h-full hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500 font-bold transition-colors disabled:opacity-40"
                >
                  +
                </button>
              </div>
              <span className="text-xs text-zinc-400">
                {product.stock} items remaining in stock
              </span>
            </div>
            {/* Cart count status */}
            {cart.find(item => item.product.id === product.id) && (
              <span className="text-xs text-green-600 dark:text-green-400 font-semibold animate-in fade-in duration-200 mt-1">
                ✓ You currently have {cart.find(item => item.product.id === product.id)?.quantity} of this item in your cart.
              </span>
            )}
          </div>

          {/* Actions: Add to Cart / Add to Wishlist */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {(() => {
              const currentCartQty = cart.find(item => item.product.id === product.id)?.quantity || 0;
              const isQtyUnchanged = currentCartQty > 0 && quantity === currentCartQty;

              return (
                <Button
                  onClick={handleAddToCart}
                  disabled={addingToCart || (currentCartQty > 0 && isQtyUnchanged)}
                  className="flex-1 rounded-full py-6 font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                >
                  <ShoppingBag className="h-5 w-5" />
                  {addingToCart
                    ? "Updating..."
                    : currentCartQty > 0
                    ? isQtyUnchanged
                      ? "Item in Cart"
                      : "Update Cart Quantity"
                    : "Add to Cart"}
                </Button>
              );
            })()}
            <Button
              variant="outline"
              onClick={handleWishlistToggle}
              className={`rounded-full py-6 font-semibold flex items-center justify-center gap-2 cursor-pointer ${
                isWishlisted
                  ? 'border-red-200 bg-red-500/5 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:border-red-950 dark:bg-red-500/10'
                  : ''
              }`}
            >
              <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-red-600' : ''}`} />
              {isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
            </Button>
          </div>

          {/* Badges Block */}
          <div className="mt-8 border-t border-zinc-100 dark:border-zinc-900 pt-6 grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center gap-1.5">
              <Truck className="h-5 w-5 text-zinc-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Free Shipping</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <RotateCcw className="h-5 w-5 text-zinc-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">30-day Return</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <ShieldAlert className="h-5 w-5 text-zinc-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">2 Year Warranty</span>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications Block */}
      <section className="mt-16 border-t border-zinc-100 dark:border-zinc-900 pt-10">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">Technical Specifications</h2>
        <div className="overflow-hidden rounded-xl border border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950">
          <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-900">
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 text-sm">
              {Object.entries(product.specs).map(([key, val], idx) => (
                <tr key={key} className={idx % 2 === 0 ? 'bg-zinc-50/50 dark:bg-zinc-900/10' : ''}>
                  <td className="px-6 py-4 font-semibold text-zinc-500 dark:text-zinc-400 w-1/3">{key}</td>
                  <td className="px-6 py-4 text-zinc-800 dark:text-zinc-200">{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
