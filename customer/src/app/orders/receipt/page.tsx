'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../../components/Header';
import { Footer } from '../../../components/Footer';
import { useAuth } from '../../../context/AuthContext';
import { QRCodeSvg } from '../../../components/QRCodeSvg';
import {
  Printer,
  ArrowLeft,
  UtensilsCrossed,
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
  order_status?: string;
  order_stage?: 'ORDER_PLACED' | 'READY_TO_PICK' | 'COLLECTED';
  subtotal: number;
  total: number;
  qr_verification_token: string | null;
  collected_at: string | null;
  customer: {
    id: string;
    display_name: string;
    email: string | null;
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

function ReceiptContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const { session, loading: authLoading } = useAuth();

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReceipt() {
      if (!orderId || !session?.access_token) return;

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}/receipt`, {
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

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs space-y-4 my-12">
        <AlertCircle className="mx-auto h-10 w-10 text-rose-600" />
        <h2 className="text-base font-bold text-stone-900">Receipt Not Found</h2>
        <p className="text-xs text-stone-500">{error || 'Could not load receipt for this order.'}</p>
        <Link
          href="/orders"
          className="inline-block rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/orders/track/?id=${receipt.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Order Tracking</span>
        </Link>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-stone-800 transition active:scale-95"
        >
          <Printer className="h-4 w-4" />
          <span>Print Receipt</span>
        </button>
      </div>

      <div className="rounded-3xl border border-stone-300 bg-white p-8 shadow-sm print:border-none print:shadow-none print:p-0 space-y-6 text-stone-900 font-sans">
        <div className="border-b border-stone-200 pb-6 text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs print:border print:border-stone-900">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-stone-900 uppercase">
            {receipt.canteen.name}
          </h1>
          <p className="text-xs text-stone-600">{receipt.canteen.campus}</p>
          <p className="text-[11px] text-stone-500">{receipt.canteen.address}</p>
          <div className="inline-block rounded-full bg-emerald-100 px-3 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider print:border print:border-emerald-800">
            Official Canteen Tax Invoice / Bill
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs border-b border-stone-200 pb-4">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Bill / Token No.
            </span>
            <span className="font-mono text-base font-extrabold text-amber-700">
              {receipt.order_number}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Order Date & Time
            </span>
            <span className="font-semibold text-stone-800">
              {new Date(receipt.created_at).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Billed To
            </span>
            <p className="font-bold text-stone-900">{receipt.customer.display_name}</p>
            <p className="text-[11px] text-stone-500 capitalize">{receipt.customer.account_type}</p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Payment & Order Stage
            </span>
            <p className="font-bold text-emerald-700 uppercase">
              {receipt.payment_status} • {receipt.order_stage || receipt.order_status || 'ORDER_PLACED'}
            </p>
            {receipt.paid_at && (
              <p className="text-[10px] text-stone-400">
                Paid: {new Date(receipt.paid_at).toLocaleTimeString('en-IN')}
              </p>
            )}
            {receipt.collected_at && (
              <p className="text-[10px] font-semibold text-stone-600">
                Collected: {new Date(receipt.collected_at).toLocaleTimeString('en-IN')}
              </p>
            )}
          </div>
        </div>

        <div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                <th className="py-2">Item Description</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {receipt.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5 font-semibold text-stone-900">{item.item_name}</td>
                  <td className="py-2.5 text-center font-mono font-bold text-stone-700">
                    {item.quantity}
                  </td>
                  <td className="py-2.5 text-right font-mono text-stone-600">
                    ₹{(item.unit_price / 100).toFixed(2)}
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold text-stone-900 tabular-nums">
                    ₹{(item.line_total / 100).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t-2 border-stone-900 pt-4 space-y-1.5 text-xs">
          <div className="flex justify-between text-stone-600">
            <span>Subtotal</span>
            <span className="font-mono font-semibold tabular-nums">
              ₹{(receipt.subtotal / 100).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Campus Surcharge / SGST / CGST</span>
            <span className="font-mono tabular-nums text-emerald-700 font-semibold">₹0.00</span>
          </div>
          <div className="flex justify-between items-baseline border-t border-stone-200 pt-2 text-sm font-extrabold text-stone-900">
            <span>Grand Total</span>
            <span className="font-mono text-xl tabular-nums text-amber-700 font-black">
              ₹{(receipt.total / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {receipt.qr_verification_token && (
          receipt.order_stage === 'COLLECTED' || receipt.collected_at ? (
            <div className="border-t border-dashed border-stone-300 pt-6 text-center space-y-2">
              <div className="inline-block rounded-xl border-2 border-stone-800 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-stone-900">
                Order Collected
              </div>
              <p className="text-[11px] text-stone-500">
                This receipt has been collected and the QR verification token is permanently expired.
              </p>
              {receipt.collected_at && (
                <p className="font-mono text-[10px] text-stone-400">
                  Collected on: {new Date(receipt.collected_at).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          ) : (
            <div className="border-t border-dashed border-stone-300 pt-6 text-center space-y-3">
              <p className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                Counter Verification Pickup Ticket
              </p>
              <div className="flex justify-center">
                <QRCodeSvg value={receipt.qr_verification_token} size={150} />
              </div>
              <div>
                <span className="text-[10px] text-stone-400">Token String:</span>
                <p className="font-mono text-xs font-extrabold text-stone-800 tracking-wider">
                  {receipt.qr_verification_token}
                </p>
              </div>
            </div>
          )
        )}

        <div className="border-t border-stone-200 pt-4 text-center space-y-1 text-[10px] text-stone-500">
          <p className="font-bold text-stone-700">{receipt.canteen.notice}</p>
          <p>Thank you for dining at Cafteria! Please retain this bill for collection.</p>
        </div>
      </div>
    </div>
  );
}

export default function CustomerReceiptPage() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <div className="print:hidden">
        <Header />
      </div>
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 print:p-0 print:m-0">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          }
        >
          <ReceiptContent />
        </Suspense>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
