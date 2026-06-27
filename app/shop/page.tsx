'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Search, 
  Heart, 
  ShoppingBag, 
  Star, 
  SlidersHorizontal, 
  ArrowUpDown, 
  ArrowLeft, 
  ArrowRight, 
  Loader2,
  LayoutGrid,
  Headphones,
  Watch,
  Coffee,
  Footprints,
  Home,
  Dumbbell,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { useApp } from '@/components/providers/app-context';
import { Product } from '@/lib/products-data';
import { Button } from '@/components/ui/button';

const categoryMetadata = [
  { name: 'All', label: 'All Products', icon: LayoutGrid },
  { name: 'Electronics', label: 'Electronics', icon: Headphones },
  { name: 'Accessories', label: 'Accessories', icon: Watch },
  { name: 'Lifestyle', label: 'Lifestyle', icon: Coffee },
  { name: 'Footwear', label: 'Footwear', icon: Footprints },
  { name: 'Home & Kitchen', label: 'Home & Kitchen', icon: Home },
  { name: 'Fitness', label: 'Fitness', icon: Dumbbell },
  { name: 'Books', label: 'Books', icon: BookOpen },
  { name: 'Beauty', label: 'Beauty', icon: Sparkles },
];

const categories = ['All', 'Electronics', 'Accessories', 'Lifestyle', 'Footwear', 'Home & Kitchen', 'Fitness', 'Books', 'Beauty'];
const PAGE_SIZE_LIMIT = 9; // 3x3 layout as requested

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'All';

  const { wishlist, cart, addToCart, addToWishlist, removeFromWishlist } = useApp();
  
  // State variables
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProductsCount, setTotalProductsCount] = useState(0);

  const [cartAddingId, setCartAddingId] = useState<string | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  // Fetch category counts when search query changes
  useEffect(() => {
    async function loadCounts() {
      try {
        const queryParams = new URLSearchParams();
        if (searchQuery) {
          queryParams.append('search', searchQuery);
        }
        
        const res = await fetch(`/api/products/counts?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setCategoryCounts(data);
        }
      } catch (error) {
        console.error("Error loading category counts", error);
      }
    }

    const timer = setTimeout(() => {
      loadCounts();
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync category state with query parameter if it changes from homepage category clicks
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat && categories.includes(cat)) {
      setSelectedCategory(cat);
      setCurrentPage(1); // Reset page on category change
    }
  }, [searchParams]);

  // Fetch paginated products
  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectedCategory && selectedCategory !== 'All') {
          queryParams.append('category', selectedCategory);
        }
        if (searchQuery) {
          queryParams.append('search', searchQuery);
        }
        queryParams.append('page', currentPage.toString());
        queryParams.append('limit', PAGE_SIZE_LIMIT.toString());
        if (sortBy !== 'featured') {
          queryParams.append('sortBy', sortBy);
        }

        const res = await fetch(`/api/products?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          // The API returns paginated structure
          setProducts(data.products || []);
          setTotalProductsCount(data.total || 0);
          setTotalPages(data.totalPages || 1);
        }
      } catch (error) {
        console.error("Error loading paginated products", error);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      loadProducts();
    }, 200);

    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery, currentPage, sortBy]);

  // Reset page when category or search query changes
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    
    // Update URL query parameters silently
    const params = new URLSearchParams(window.location.search);
    if (category === 'All') {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    router.push(`/shop?${params.toString()}`, { scroll: false });
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleSortChange = (val: string) => {
    setSortBy(val);
    setCurrentPage(1);
  };

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

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Title */}
      <div className="flex flex-col gap-1 mb-8 border-b border-zinc-100 dark:border-zinc-900 pb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          Shop All Collections
        </h1>
        <p className="text-sm text-zinc-500 font-medium">
          Explore and filter our premium products.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Vertical Sidebar of Categories */}
        <aside className="w-full md:w-60 shrink-0">
          <div className="bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200/50 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm md:sticky md:top-24">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4 px-2">
              Browse Categories
            </h2>
            <nav className="flex flex-col sm:flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 sm:pb-0 scrollbar-none">
              {categoryMetadata.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => handleCategorySelect(cat.name)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 border text-left cursor-pointer group shrink-0 sm:shrink md:shrink-0 ${
                      isActive
                        ? 'bg-zinc-950 border-zinc-950 text-white shadow-md shadow-zinc-950/5 dark:bg-zinc-100 dark:border-zinc-100 dark:text-black'
                        : 'bg-transparent border-transparent hover:bg-zinc-100/60 dark:hover:bg-zinc-900/50 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className={`p-1.5 rounded-xl transition-colors ${
                      isActive 
                        ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-black' 
                        : 'bg-zinc-200/50 dark:bg-zinc-800/50 group-hover:bg-zinc-200/80 dark:group-hover:bg-zinc-700/60'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold tracking-tight">{cat.label}</span>
                    <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                      isActive 
                        ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-black' 
                        : 'bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 group-hover:bg-zinc-250 dark:group-hover:bg-zinc-800/80'
                    }`}>
                      {categoryCounts[cat.name] || 0}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Right Side Contents: Search, Sort & Product Grid */}
        <main className="flex-1 min-w-0">
          {/* Filter Options */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 dark:border-zinc-900 pb-5 mb-8">
            <p className="text-sm text-zinc-500 font-medium">
              Showing {products.length} of {totalProductsCount} items
            </p>

            {/* Search & Sort Inputs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-60">
                <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 text-sm bg-white border border-zinc-200 rounded-full focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:bg-zinc-950 dark:border-zinc-800 dark:focus:ring-zinc-700"
                />
              </div>

              <div className="relative w-full sm:w-auto flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-zinc-400 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="w-full sm:w-44 h-10 px-3 pr-8 text-sm bg-white border border-zinc-200 rounded-full focus:outline-none focus:ring-1 focus:ring-zinc-400 appearance-none dark:bg-zinc-950 dark:border-zinc-800 dark:focus:ring-zinc-700 cursor-pointer"
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Customer Rating</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 border-l border-t border-zinc-400 h-1.5 w-1.5 rotate-[135deg]" />
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 py-12">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col gap-3 animate-pulse">
                  <div className="aspect-square w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-5 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-4 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center justify-center">
              <SlidersHorizontal className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-3" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">No products found</h3>
              <p className="text-sm text-zinc-500 max-w-xs mt-1">
                Try adjusting your search query or filters.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => {
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
                          sizes="(max-w-7xl) 33vw, 100vw"
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-16 border-t border-zinc-100 dark:border-zinc-900 pt-8">
                  <Button
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="rounded-full px-4 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="rounded-full px-4 flex items-center gap-1 cursor-pointer"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ShopAllPage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    }>
      <ShopContent />
    </Suspense>
  );
}
