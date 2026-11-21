'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Footer } from '../../../components/Footer';
import { AdminSidebar } from '../../../components/AdminSidebar';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { QRCodeSvg } from '../../../components/QRCodeSvg';
import {
  Printer,
  ArrowLeft,
  Shield,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface ReceiptItem {
  id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

interface ReceiptData {
  id: string;
  order_number: string;
  created_at: string;
  paid_at: string | null;
  payment_method: string;
  payment_status: string;
  order_status: string;
  subtotal: number;
  total: number;
  qr_verification_token: string | null;
  collected_at: string | null;
  collected_by: string | null;
  customer: {
    id: string;
    display_name: string;
    account_type: string;
  };
  items: ReceiptItem[];
  canteen: {
    name: string;
    campus: string;
    address: string;
    notice: string;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

function AdminReceiptContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const { session, adminUser, isUnauthorized, loading: authLoading } = useAdminAuth();

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReceipt() {
      if (!orderId || !session?.access_token) return;

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/receipt`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || 'Failed to retrieve order receipt');
        }
        setReceipt(data.data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error loading receipt';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      if (session && orderId) {
        loadReceipt();
      } else {
        setLoading(false);
      }
    }
  }, [session, orderId, authLoading]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
      </div>
    );
  }

  if (!adminUser || isUnauthorized) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center space-y-4 my-12 shadow-sm">
        <Shield className="mx-auto h-12 w-12 text-[#D94A43]" />
        <h2 className="text-base font-bold text-[#252525]">Access Denied</h2>
        <p className="text-xs text-[#666666]">Staff privileges required to view register receipts.</p>
        <Link
          href="/login"
          className="inline-block rounded-xl bg-[#F47721] px-5 py-2.5 text-xs font-black text-white shadow-md shadow-[#F47721]/20 hover:bg-[#E06310] transition"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center space-y-4 my-12 shadow-sm">
        <AlertCircle className="mx-auto h-10 w-10 text-[#D94A43]" />
        <h2 className="text-base font-bold text-[#252525]">Receipt Not Found</h2>
        <p className="text-xs text-[#666666]">{error || 'Could not load receipt for this order.'}</p>
        <Link
          href="/orders"
          className="inline-block rounded-xl bg-[#F47721] px-5 py-2.5 text-xs font-black text-white shadow-md shadow-[#F47721]/20 hover:bg-[#E06310] transition"
        >
          Back to Orders Queue
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#666666] hover:text-[#252525] transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Orders</span>
        </Link>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#F47721] hover:bg-[#E06310] px-5 py-2 text-xs font-black text-white shadow-md shadow-[#F47721]/20 transition active:scale-95"
        >
          <Printer className="h-4 w-4" />
          <span>Print</span>
        </button>
      </div>

      <div className="rounded-3xl border border-[#EEEEEE] bg-white p-8 shadow-sm print:border-none print:shadow-none print:p-0 space-y-6 text-[#252525] font-sans">
        <div className="border-b border-[#EEEEEE] pb-6 text-center space-y-2">
          <img src="/logo/logo_bl.svg" alt="icon" className="h-16 w-full object-contain" />
          <h1 className="text-xl font-extrabold tracking-tight text-[#252525] uppercase">
            Cafeteria CEV
          </h1>
          <div className="inline-block px-3 py-0.2 text-[10px] font-bold text-black uppercase tracking-wider">
            Receipt
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs border-b border-[#EEEEEE] pb-4">
          <div>
            <span className="text-[10px] font-bold text-[#888888] uppercase tracking-wider block">
              Token No.
            </span>
            <span className="font-mono text-base font-extrabold text-[#000000]">
              {receipt.order_number}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-[#888888] uppercase tracking-wider block">
              Order Date & Time
            </span>
            <span className="font-semibold text-[#252525]">
              {new Date(receipt.created_at).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-[#888888] uppercase tracking-wider block">
              Customer Details
            </span>
            <p className="font-bold text-[#252525]">{receipt.customer.display_name}</p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-[#888888] uppercase tracking-wider block">
              Payment
            </span>
            <p className="font-bold text-[#269B62] uppercase">
              {receipt.payment_status} • {receipt.payment_method === 'pay_later' ? 'Pay Later (Staff Credit)' : 'UPI'}
            </p>
            {receipt.paid_at && (
              <p className="text-[10px] text-[#888888]">
                Paid: {new Date(receipt.paid_at).toLocaleTimeString('en-IN')}
              </p>
            )}
          </div>
        </div>

        <div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#EEEEEE] text-[10px] uppercase font-bold text-[#666666] tracking-wider">
                <th className="py-2">Item </th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEEEEE]">
              {receipt.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5 font-semibold text-[#252525]">{item.item_name}</td>
                  <td className="py-2.5 text-center font-mono font-bold text-[#252525]">
                    {item.quantity}
                  </td>
                  <td className="py-2.5 text-right font-mono text-[#666666]">
                    ₹{(item.unit_price / 100).toFixed(2)}
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold text-[#252525] tabular-nums">
                    ₹{(item.line_total / 100).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t-2 border-[#252525] pt-4 space-y-1.5 text-xs">
          <div className="flex justify-between text-[#666666]">
            <span>Subtotal</span>
            <span className="font-mono font-semibold tabular-nums text-[#252525]">
              ₹{(receipt.subtotal / 100).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-[#666666]">
            <span>CGST/SGST</span>
            <span className="font-mono tabular-nums text-[#000000] font-semibold">₹0.00</span>
          </div>
          <div className="flex justify-between items-baseline border-t border-[#EEEEEE] pt-2 text-sm font-extrabold text-[#252525]">
            <span>Grand Total</span>
            <span className="font-mono text-xl tabular-nums text-[#252525] font-black">
              ₹{(receipt.total / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {receipt.qr_verification_token && (
          <div className="border-t border-dashed border-gray-300 pt-6 text-center space-y-3">
            <div className="flex justify-center">
              <QRCodeSvg value={receipt.qr_verification_token} size={150} />
            </div>
            <div>
              <span className="text-[10px] text-[#888888]">Token ID:</span>
              <p className="font-mono text-xs font-extrabold text-[#252525] tracking-wider">
                {receipt.qr_verification_token}
              </p>
            </div>
          </div>
        )}

        <div className="border-t border-[#EEEEEE] pt-4 text-center space-y-1 text-[10px] text-[#888888]">
          <p className="font-bold text-[#666666]">{receipt.canteen.notice}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminReceiptPage() {
  return (
    <div className="min-h-screen bg-white text-[#252525] flex flex-col md:flex-row select-none">
      <div className="print:hidden">
        <AdminSidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="print:hidden">
        </div>
        <main className="flex-1 pt-10 pb-24 md:py-10 px-4 sm:px-6 lg:px-8 print:p-0 print:m-0 print:bg-white">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
              </div>
            }
          >
            <AdminReceiptContent />
          </Suspense>
        </main>
        <div className="print:hidden">
          <Footer />
        </div>
      </div>
    </div>
  );
}
