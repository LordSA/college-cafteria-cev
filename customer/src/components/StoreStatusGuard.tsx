'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useStoreStatus } from '../context/StoreStatusContext';
import { CanteenClosedView } from './CanteenClosedView';

const EXEMPT_PATHS = [
  '/support',
  '/settings',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/closed',
];

export function StoreStatusGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isOpen, loading } = useStoreStatus();

  if (loading) {
    return <>{children}</>;
  }

  if (!isOpen) {
    const isExempt =
      EXEMPT_PATHS.includes(pathname) ||
      pathname.startsWith('/orders') ||
      pathname.startsWith('/support');

    if (!isExempt) {
      return <CanteenClosedView />;
    }
  }

  return <>{children}</>;
}
