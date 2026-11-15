import type { Metadata } from 'next';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ThemeProvider } from '../context/ThemeContext';
import { MobileBottomNav } from '../components/MobileBottomNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cafeteria CEV — Smart Campus Dining',
  description: 'Digital ordering, pre-orders, and queue-free meals for college students and faculty.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col antialiased bg-[#fafaf9] dark:bg-[#0d0e12] text-stone-900 dark:text-stone-100 transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              {children}
              <MobileBottomNav />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
