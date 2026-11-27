import type { Metadata } from 'next';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ThemeProvider } from '../context/ThemeContext';
import { StoreStatusProvider } from '../context/StoreStatusContext';
import { StoreStatusGuard } from '../components/StoreStatusGuard';
import { MobileBottomNav } from '../components/MobileBottomNav';
import './globals.css';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cafeteria.campus.shibili.xyz';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: 'Cafeteria CEV',
  description: 'Digital ordering, pre-orders, and queue-free meals for college students and faculty at College of Engineering Vadakara.',
  openGraph: {
    title: 'Cafeteria CEV',
    description: 'Digital ordering, pre-orders, and queue-free meals for college students and faculty at College of Engineering Vadakara.',
    url: appUrl,
    siteName: 'Cafeteria CEV',
    images: [
      {
        url: '/banner.png',
        width: 1200,
        height: 630,
        alt: 'Cafeteria CEV',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cafeteria CEV',
    description: 'Digital ordering, pre-orders, and queue-free meals for college students and faculty at College of Engineering Vadakara.',
    images: ['/banner.png'],
  },
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
          <StoreStatusProvider>
            <AuthProvider>
              <CartProvider>
                <StoreStatusGuard>
                  {children}
                </StoreStatusGuard>
                <MobileBottomNav />
              </CartProvider>
            </AuthProvider>
          </StoreStatusProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
