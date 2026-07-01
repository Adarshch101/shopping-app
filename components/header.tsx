'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, Heart, LogOut, Menu, X, Sparkles, AlertCircle } from 'lucide-react';
import { useApp } from './providers/app-context';
import { Button } from './ui/button';

export default function Header() {
  const { user, cart, wishlist, logout, showLoginModal, setShowLoginModal } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = wishlist.length;

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const navLinks = [
    { name: 'Shop All', href: '/shop' },
    { name: 'Wishlist', href: '/wishlist' },
    { name: 'Cart', href: '/cart' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-100 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-black/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-md transition-all duration-300 group-hover:scale-105 dark:bg-zinc-100 dark:text-black">
                <ShoppingBag className="h-5 w-5" />
              </span>
              <span className="text-xl font-bold tracking-tight text-neutral-950 dark:text-zinc-50">
                shop<span className="text-neutral-500 dark:text-zinc-400">now</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`text-sm font-medium transition-colors hover:text-black dark:hover:text-white ${
                      isActive
                        ? 'text-black dark:text-white font-semibold'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-4">
            {/* Wishlist Link */}
            <Link
              href="/wishlist"
              className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-zinc-700 dark:text-zinc-300"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white animate-in fade-in zoom-in-50 dark:bg-white dark:text-black">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Link */}
            <Link
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-zinc-700 dark:text-zinc-300"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white animate-in fade-in zoom-in-50 dark:bg-white dark:text-black">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User Auth */}
            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-zinc-100 dark:border-zinc-800">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 group cursor-pointer hover:opacity-80 transition-opacity"
                  title="View Profile"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-zinc-500 max-w-[120px] truncate hidden lg:inline-block">
                    {user.email}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link href="/auth">
                <Button className="rounded-full px-5 py-2 text-xs font-semibold cursor-pointer">
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {/* Wishlist Link Mobile */}
            <Link
              href="/wishlist"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 dark:text-zinc-300"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[9px] font-bold text-white dark:bg-white dark:text-black">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Link Mobile */}
            <Link
              href="/cart"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 dark:text-zinc-300"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[9px] font-bold text-white dark:bg-white dark:text-black">
                  {cartCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-zinc-700 dark:text-zinc-300"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-30 bg-white dark:bg-black p-4 md:hidden animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col gap-4 text-lg font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 border-b border-zinc-50 dark:border-zinc-900 transition-colors ${
                  pathname === link.href ? 'text-black dark:text-white font-bold' : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {link.name}
              </Link>
            ))}

            {user ? (
              <div className="flex flex-col gap-4 pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">View Profile</span>
                    <span className="text-xs text-zinc-500">{user.email}</span>
                  </div>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-full cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Link href="/auth" onClick={() => setMobileMenuOpen(false)} className="pt-4">
                <Button className="w-full rounded-full cursor-pointer">Sign In</Button>
              </Link>
            )}
          </nav>
        </div>
      )}

      {/* Login Requirement Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 rounded-full p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 mb-4">
                <Sparkles className="h-6 w-6" />
              </div>

              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Join ShopNow
              </h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Adding items to your cart and checking out requires a free ShopNow account.
              </p>
              
              <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl flex items-start gap-2.5 text-left text-xs text-zinc-600 dark:text-zinc-400 border border-zinc-100/50 dark:border-zinc-800/50">
                <AlertCircle className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Tip:</strong> You can add this item to your wishlist right now without signing in! Your wishlist will sync automatically once you create an account.
                </span>
              </div>

              <div className="mt-6 flex w-full flex-col gap-2">
                <Button
                  onClick={() => {
                    setShowLoginModal(false);
                    router.push('/auth');
                  }}
                  className="w-full rounded-full cursor-pointer font-medium py-5"
                >
                  Sign In to Add to Cart
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowLoginModal(false)}
                  className="w-full rounded-full cursor-pointer text-zinc-600 dark:text-zinc-400 py-5"
                >
                  Continue Browsing
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
