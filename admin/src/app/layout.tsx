import type { Metadata } from 'next';
import { AdminAuthProvider } from '../context/AdminAuthContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cafteria Admin — Canteen Management Interface',
  description: 'Operations, kitchen display, inventory, and order management dashboard.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased selection:bg-[#F47721] selection:text-white bg-[#FFFFFF] text-[#252525]">
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </body>
    </html>
  );
}
