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
      <body className="flex min-h-screen flex-col antialiased selection:bg-[#f5a4c6] selection:text-[#101114] bg-[#101114] text-slate-100">
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </body>
    </html>
  );
}
