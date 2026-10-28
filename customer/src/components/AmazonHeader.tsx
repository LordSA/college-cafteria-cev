'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  ShoppingCart,
  Menu,
  ChevronDown,
  Wallet,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface AmazonHeaderProps {
  onOpenSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
}

export function AmazonHeader({
  onOpenSidebar,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
}: AmazonHeaderProps) {
  const { user, profile } = useAuth();
  const { itemCount, subtotal } = useCart();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Kaliraj';

  const categoryOptions = [
    { id: 'all', label: 'All Categories' },
    { id: 'meals', label: 'Hot Meals' },
    { id: 'coffee', label: 'Coffee & Tea' },
    { id: 'snacks', label: 'Snacks & Combos' },
    { id: 'juice', label: 'Fresh Juices' },
    { id: 'cake', label: 'Bakery & Cake' },
    { id: 'pizza', label: 'Pizza & Fast Food' },
    { id: 'fruits', label: 'Fresh Fruits' },
  ];

  const currentCategoryLabel =
    categoryOptions.find((c) => c.id === selectedCategory)?.label || 'All';

  return (
    <div className="hidden md:block select-none sticky top-0 z-40 shadow-md">
      <header className="bg-gradient-to-r from-[#ff5e3a] via-[#ff7043] to-[#ffa040] text-white px-4 py-2.5">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-white/10 transition"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#ff5e3a] shadow-md">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xl font-black tracking-tight text-white">
                Cafteria<span className="text-amber-200">.cev</span>
              </span>
              <span className="text-[10px] tracking-wider text-orange-100 uppercase font-bold">
                College Canteen Shop
              </span>
            </div>
          </Link>

          <div className="relative flex flex-1 items-center">
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex h-10 items-center gap-1.5 rounded-l-full bg-white/95 px-4 text-xs font-bold text-stone-800 hover:bg-white transition border-r border-stone-200 whitespace-nowrap shadow-xs"
              >
                <span>{currentCategoryLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 text-stone-500" />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 top-full z-50 mt-1.5 w-48 rounded-2xl border border-stone-200 bg-white py-1.5 shadow-xl">
                  {categoryOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(opt.id);
                        setDropdownOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-xs font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-600"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hot dishes, snacks, canteen specials, juices..."
              className="h-10 w-full bg-white px-4 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none"
            />

            <button
              type="button"
              className="flex h-10 w-12 items-center justify-center rounded-r-full bg-white text-[#ff5e3a] hover:bg-orange-50 transition border-l border-stone-200 shadow-xs"
              title="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/wallet"
              className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 backdrop-blur-md hover:bg-white/25 transition text-xs font-bold text-white shadow-xs"
              title="Testing Wallet Demo Credits"
            >
              <Wallet className="h-4 w-4 text-amber-200" />
              <span>Wallet</span>
            </Link>

            <Link
              href={user ? '/profile' : '/login'}
              className="flex flex-col leading-tight rounded-xl bg-white/10 px-3 py-1 hover:bg-white/20 transition"
            >
              <span className="text-[10px] text-orange-100 font-medium">
                Hello, {displayName}
              </span>
              <span className="text-xs font-bold text-white flex items-center gap-0.5">
                <span>Account & Profile</span>
                <ChevronDown className="h-3 w-3 text-orange-200" />
              </span>
            </Link>

            <Link
              href="/orders"
              className="flex flex-col leading-tight rounded-xl bg-white/10 px-3 py-1 hover:bg-white/20 transition"
            >
              <span className="text-[10px] text-orange-100 font-medium">Canteen</span>
              <span className="text-xs font-bold text-white">Orders</span>
            </Link>

            <Link
              href="/cart"
              className="flex items-center gap-2 rounded-2xl bg-white px-3.5 py-1.5 text-stone-900 shadow-md hover:bg-orange-50 transition"
            >
              <div className="relative">
                <ShoppingCart className="h-5 w-5 text-[#ff5e3a]" />
                {itemCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#ff4b4b] px-1 text-[9px] font-black text-white">
                    {itemCount}
                  </span>
                )}
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-xs font-black text-stone-900">Cart</span>
                <span className="font-mono text-[10px] font-bold text-[#ff5e3a] tabular-nums">
                  ₹{(subtotal / 100).toFixed(0)}
                </span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-stone-200/80 text-stone-700">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs font-semibold">
          <div className="flex items-center gap-3 overflow-x-auto">
            <button
              type="button"
              onClick={onOpenSidebar}
              className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1 text-[#ff5e3a] hover:bg-orange-100 transition whitespace-nowrap"
            >
              <Menu className="h-4 w-4" />
              <span>All Categories</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`rounded-lg px-2.5 py-1 transition whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white shadow-xs'
                  : 'hover:bg-stone-100 text-stone-600'
              }`}
            >
              Hot Products
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('meals')}
              className={`rounded-lg px-2.5 py-1 transition whitespace-nowrap ${
                selectedCategory === 'meals'
                  ? 'bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white shadow-xs'
                  : 'hover:bg-stone-100 text-stone-600'
              }`}
            >
              Lunch Meals & Thali
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('snacks')}
              className={`rounded-lg px-2.5 py-1 transition whitespace-nowrap ${
                selectedCategory === 'snacks'
                  ? 'bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white shadow-xs'
                  : 'hover:bg-stone-100 text-stone-600'
              }`}
            >
              Evening Snacks
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('coffee')}
              className={`rounded-lg px-2.5 py-1 transition whitespace-nowrap ${
                selectedCategory === 'coffee'
                  ? 'bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white shadow-xs'
                  : 'hover:bg-stone-100 text-stone-600'
              }`}
            >
              Tea & Coffee
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('juice')}
              className={`rounded-lg px-2.5 py-1 transition whitespace-nowrap ${
                selectedCategory === 'juice'
                  ? 'bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white shadow-xs'
                  : 'hover:bg-stone-100 text-stone-600'
              }`}
            >
              Fresh Juices
            </button>

            <Link
              href="/menu"
              className="rounded-lg px-2.5 py-1 hover:bg-stone-100 text-stone-600 transition whitespace-nowrap"
            >
              Full Menu Catalog
            </Link>

            <Link
              href="/payment-faq"
              className="rounded-lg px-2.5 py-1 hover:bg-stone-100 text-stone-600 transition whitespace-nowrap"
            >
              Payment FAQs
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60 whitespace-nowrap">
            <Sparkles className="h-3 w-3 text-amber-600" />
            <span>Counter #1 &bull; Open 8:00 AM &ndash; 7:00 PM</span>
          </div>
        </div>
      </nav>
    </div>
  );
}
