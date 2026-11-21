'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Timer,
  ListTodo,
  ListCollapse,
  Layers,
  Settings,
  Terminal,
  Printer,
  LogOut,
  QrCode,
  FileCheck,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

export function AdminSidebar() {
  const pathname = usePathname();
  const {
    signOut,
    canAccessDashboard,
    canManageOrders,
    canScanQr,
    canManageInventory,
    canUpdateStockOnly,
    canManageMenu,
    canReviewStaff,
    canAccessDeveloper,
    isPrinter,
  } = useAdminAuth();

  const navLinks = [
    { label: 'Dashboard', shortLabel: 'Dashboard', href: '/', icon: Home, show: canAccessDashboard },
    { label: 'Orders Queue', shortLabel: 'Orders', href: '/orders', icon: Timer, show: canManageOrders },
    { label: 'QR Scanner', shortLabel: 'Scanner', href: '/scan', icon: QrCode, show: canScanQr && !isPrinter },
    { label: 'Inventory', shortLabel: 'Inventory', href: '/inventory', icon: ListTodo, show: canManageInventory || canUpdateStockOnly },
    { label: 'Menu', shortLabel: 'Menu', href: '/menu', icon: ListCollapse, show: canManageMenu },
    { label: 'Categories', shortLabel: 'Categories', href: '/categories', icon: Layers, show: canReviewStaff },
    { label: 'Teacher Requests', shortLabel: 'Teachers', href: '/staff-requests', icon: FileCheck, show: canReviewStaff },
    { label: 'Printer Kiosk', shortLabel: 'Printer', href: '/printer', icon: Printer, show: isPrinter },
    { label: 'Developer', shortLabel: 'Developer', href: '/developer', icon: Terminal, show: canAccessDeveloper },
  ];

  const visibleLinks = navLinks.filter((l) => l.show);

  return (
    <>
      <aside className="hidden md:flex w-20 bg-white border-r border-[#EEEEEE] flex-col items-center justify-between py-6 px-3 flex-shrink-0 z-30 select-none min-h-screen sticky top-0 h-screen print:hidden">
        <div className="flex flex-col items-center gap-7">
          <Link href="/" className="flex flex-col items-center gap-1.5 group">
            <div className="flex h-10 w-10 items-center justify-center">
              <img src="/logo/logo_clr.svg" alt="Cafeteria Logo" className="h-8 w-8 object-contain" />
            </div>
          </Link>

          <nav className="flex flex-col items-center gap-3">
            {visibleLinks.map((link) => {
              const Icon = link.icon;
              const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={link.label}
                  className={`flex items-center justify-center transition active:scale-95 ${isActive
                    ? 'h-12 w-12 rounded-[20px] bg-[#FFF7F0] text-[#F47721] border border-[#F47721]/30 shadow-md shadow-[#F47721]/15 font-bold'
                    : 'h-10 w-10 rounded-xl text-[#666666] hover:text-[#252525] hover:bg-gray-50'
                    }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={signOut}
            title="Sign Out"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#666666] hover:text-[#D94A43] hover:bg-red-50 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#EEEEEE] px-2 py-1.5 shadow-2xl safe-area-bottom print:hidden">
        <div className="flex items-center justify-around gap-1 overflow-x-auto no-scrollbar max-w-lg mx-auto">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center flex-1 min-w-[56px] py-1 px-1 rounded-xl transition active:scale-95 ${isActive
                  ? 'text-[#F47721]'
                  : 'text-[#666666] hover:text-[#252525]'
                  }`}
              >
                <div
                  className={`flex items-center justify-center h-8 w-8 rounded-xl transition ${isActive ? 'bg-[#FFF7F0] text-[#F47721]' : ''
                    }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                </div>
                <span
                  className={`text-[9px] font-medium tracking-tight mt-0.5 truncate max-w-[62px] ${isActive ? 'font-bold text-[#F47721]' : ''
                    }`}
                >
                  {link.shortLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
