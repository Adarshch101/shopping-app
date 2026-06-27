'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Trash2, ShoppingBag, Star, HelpCircle } from 'lucide-react';
import { useApp } from '@/components/providers/app-context';
import { Button } from '@/components/ui/button';

export default function WishlistPage() {
  const { wishlist, removeFromWishlist, addToCart, isLoading } = useApp();
  const [actionId, setActionId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 flex flex-col gap-8 animate-pulse">
        <div className="h-8 w-44 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const handleAddToCart = async (productId: string) => {
    setActionId(productId);
    await addToCart(productId, 1);
    setActionId(null);
  };

  const handleRemove = async (productId: string) => {
    setActionId(productId);
    await removeFromWishlist(productId);
    setActionId(null);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl mb-8">
        Your Wishlist
      </h1>

      {wishlist.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-900 text-zinc-400 mb-4">
            <Heart className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Your wishlist is empty</h3>
          <p className="text-sm text-zinc-500 max-w-xs mt-1">
            Save items that you like to your wishlist. They will be saved and synced automatically when you sign in.
          </p>
          <Link href="/" className="mt-6">
            <Button className="rounded-full px-6 cursor-pointer">Explore Products</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {wishlist.map((product) => (
            <div
              key={product.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900/50 p-3 shadow-sm hover:shadow-md transition-all duration-300"
            >
              {/* Product Image */}
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-50 dark:bg-zinc-900">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />

                {/* Remove from wishlist overlay */}
                <button
                  onClick={() => handleRemove(product.id)}
                  disabled={actionId === product.id}
                  className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-zinc-500 hover:text-red-500 shadow-sm transition-all dark:bg-zinc-900/90 dark:text-zinc-400"
                  title="Remove from Wishlist"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Product details */}
              <div className="flex flex-col flex-1 mt-4">
                <Link
                  href={`/product/${product.id}`}
                  className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1 hover:underline"
                >
                  {product.name}
                </Link>

                <div className="flex items-center gap-1 mt-1.5">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {product.rating.rate}
                  </span>
                  <span className="text-[10px] text-zinc-400">({product.rating.count})</span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    ₹{product.price.toLocaleString('en-IN')}
                  </span>

                  <button
                    onClick={() => handleAddToCart(product.id)}
                    disabled={actionId === product.id}
                    className="flex h-9 items-center justify-center gap-1.5 px-3 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white transition-all cursor-pointer shrink-0"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
