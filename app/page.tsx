'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Heart, Star, Sparkles, ArrowRight, Laptop, Watch, ShoppingCart, Sparkle } from 'lucide-react';
import { useApp } from '@/components/providers/app-context';
import { Product } from '@/lib/products-data';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { wishlist, cart, addToCart, addToWishlist, removeFromWishlist } = useApp();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartAddingId, setCartAddingId] = useState<string | null>(null);

  // Fetch only featured products
  useEffect(() => {
    async function loadFeatured() {
      try {
        const res = await fetch('/api/products?featured=true');
        if (res.ok) {
          const data = await res.json();
          setFeaturedProducts(data);
        }
      } catch (error) {
        console.error("Failed to load featured products", error);
      } finally {
        setLoading(false);
      }
    }
    loadFeatured();
  }, []);

  const handleAddToCart = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCartAddingId(productId);
    await addToCart(productId, 1);
    setCartAddingId(null);
  };

  const handleWishlistToggle = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    const isWishlisted = wishlist.some(item => item.id === product.id);
    if (isWishlisted) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(product);
    }
  };

  const homeCategories = [
    { name: 'Electronics', count: '3 Items', href: '/shop?category=Electronics', icon: Laptop },
    { name: 'Accessories', count: '2 Items', href: '/shop?category=Accessories', icon: Watch },
    { name: 'Lifestyle', count: '2 Items', href: '/shop?category=Lifestyle', icon: Sparkle },
    { name: 'Footwear', count: '1 Item', href: '/shop?category=Footwear', icon: ShoppingCart },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 1. Hero Landing Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-neutral-950 px-6 py-20 sm:px-12 sm:py-24 lg:px-20 text-white shadow-xl mb-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(80,80,80,0.4),transparent)] pointer-events-none" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-neutral-900/30 blur-3xl pointer-events-none" />
        
        <div className="relative max-w-2xl flex flex-col items-start gap-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3.5 py-1 text-xs font-semibold tracking-wide text-zinc-300">
            <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
            Define Your Style
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
            Curated Goods for Global Lifestyles
          </h1>
          <p className="text-zinc-400 sm:text-lg max-w-lg leading-relaxed">
            Discover a standard of premium accessories, electronics, and sneakers designed for modern day-to-day utility.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link href="/shop">
              <Button className="rounded-full px-7 py-6 font-semibold bg-white text-black hover:bg-zinc-200 transition-colors shadow-md text-sm cursor-pointer">
                Shop the Collection
              </Button>
            </Link>
            <Link href="/shop">
              <Button variant="outline" className="rounded-full px-7 py-6 text-black font-semibold border-zinc-700 hover:bg-zinc-900 hover:text-white transition-colors text-sm cursor-pointer">
                View All items
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Shop Categories Quick Navigation */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
            Browse by Category
          </h2>
          <Link href="/shop" className="text-sm font-semibold text-neutral-500 hover:text-black dark:hover:text-white flex items-center gap-1">
            All Collections <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {homeCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.name}
                href={cat.href}
                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900/50 p-6 hover:shadow-md transition-all duration-300 flex flex-col gap-4 text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 group-hover:scale-105 transition-transform duration-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-neutral-500 dark:group-hover:text-zinc-400 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{cat.count}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Featured Products section */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-8 border-b border-zinc-100 dark:border-zinc-900 pb-4">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
            Featured Products
          </h2>
          <span className="text-xs text-zinc-400 uppercase tracking-wider font-bold">
            Customer favorites
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col gap-3 animate-pulse">
                <div className="aspect-square w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-5 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => {
              const isInWishlist = wishlist.some(item => item.id === product.id);
              const isInCart = cart.some(item => item.product.id === product.id);
              
              return (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900/50 p-3 hover:shadow-lg transition-all duration-300"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-50 dark:bg-zinc-900">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-w-7xl) 25vw, 100vw"
                      className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />

                    <button
                      onClick={(e) => handleWishlistToggle(e, product)}
                      className="absolute top-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-zinc-700 hover:text-red-500 hover:scale-105 shadow-sm transition-all dark:bg-zinc-900/90 dark:text-zinc-300"
                    >
                      <Heart
                        className={`h-4.5 w-4.5 transition-colors ${
                          isInWishlist ? 'fill-red-500 text-red-500' : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                      />
                    </button>
                    
                    <span className="absolute bottom-2 left-2 text-[10px] uppercase tracking-wider font-bold bg-neutral-900/85 text-white px-2 py-0.5 rounded backdrop-blur-sm dark:bg-zinc-100/85 dark:text-black">
                      {product.category}
                    </span>
                  </div>

                  <div className="flex flex-col flex-1 mt-4">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1 group-hover:text-neutral-500 dark:group-hover:text-zinc-400 transition-colors">
                      {product.name}
                    </h3>
                    
                    <div className="flex items-center gap-1 mt-1.5">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{product.rating.rate}</span>
                      <span className="text-[10px] text-zinc-400">({product.rating.count})</span>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 gap-2">
                      <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        ₹{product.price.toLocaleString('en-IN')}
                      </span>

                      <button
                        onClick={(e) => handleAddToCart(e, product.id)}
                        disabled={cartAddingId === product.id}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg shadow-sm border transition-all duration-200 cursor-pointer ${
                          isInCart
                            ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/20'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-black dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white'
                        }`}
                      >
                        <ShoppingBag className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Large Landing Call to Action */}
      <section className="bg-zinc-100 dark:bg-zinc-900/40 rounded-3xl py-12 px-6 sm:px-12 text-center flex flex-col items-center gap-4">
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          Ready to Explore the Entire Store?
        </h2>
        <p className="text-zinc-500 max-w-sm text-sm">
          Browse all categories with dynamic sorting, fast searches, and complete page indexing.
        </p>
        <Link href="/shop" className="mt-2">
          <Button className="rounded-full px-8 py-6 font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md">
            Go to Shop All
            <ArrowRight className="h-4.5 w-4.5" />
          </Button>
        </Link>
      </section>
    </div>
  );
}
