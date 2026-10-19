import type { Metadata } from 'next';
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
      <body className="flex min-h-screen flex-col antialiased selection:bg-slate-200 selection:text-slate-900">
        {children}
      </body>
    </html>
  );
}
