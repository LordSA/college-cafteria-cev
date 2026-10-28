import type { Metadata } from 'next';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { MobileBottomNav } from '../components/MobileBottomNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cafteria CEV — Smart Campus Dining',
  description: 'Digital ordering, pre-orders, and queue-free meals for college students and faculty.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased selection:bg-amber-100 selection:text-amber-900">
        <AuthProvider>
          <CartProvider>
            {children}
            <MobileBottomNav />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
