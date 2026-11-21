'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  Printer,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Receipt,
  Volume2,
  Sliders,
  Check,
} from 'lucide-react';

interface PrintedBill {
  id: string;
  order_number: string;
  total: number;
  customer_name: string;
  timestamp: string;
  items_count: number;
}

interface ReceiptDetails {
  receipt_id: string;
  order_id: string;
  order_number: string;
  order_stage: string;
  created_at: string;
  collected_at: string;
  customer: {
    name: string;
    account_type: string;
  };
  canteen: {
    name: string;
    campus: string;
  };
  items: Array<{
    name: string;
    unit_price: number;
    quantity: number;
    line_total: number;
  }>;
  financials: {
    subtotal: number;
    tax: number;
    total: number;
    payment_method: string;
    payment_status: string;
  };
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

export default function PrinterKioskPage() {
  const router = useRouter();
  const { adminUser, isUnauthorized, loading: authLoading, session, canScanQr } = useAdminAuth();

  const [scanToken, setScanToken] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptDetails | null>(null);
  const [recentBills, setRecentBills] = useState<PrintedBill[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoPrint, setAutoPrint] = useState(true);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!adminUser) {
        router.push('/login');
      } else if (isUnauthorized || !canScanQr) {
        router.push('/unauthorized');
      }
    }
  }, [adminUser, isUnauthorized, canScanQr, authLoading, router]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [processing, activeReceipt]);

  const playBeep = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {}
  };

  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const token = scanToken.trim();
    if (!token || !session?.access_token || processing) return;

    setProcessing(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const collectRes = await fetch(`${API_BASE_URL}/api/v1/admin/orders/collect-qr`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qr_token: token }),
      });

      const collectJson = await collectRes.json();

      if (!collectRes.ok || !collectJson.success) {
        throw new Error(collectJson.error?.message || 'Failed to verify and collect QR order');
      }

      const orderData = collectJson.data?.order || collectJson.data;
      const orderId = orderData?.id;

      if (!orderId) {
        throw new Error('Order verification succeeded but order identifier is missing');
      }

      playBeep();

      const receiptRes = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/receipt`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const receiptJson = await receiptRes.json();
      if (receiptRes.ok && receiptJson.success) {
        const receiptData = receiptJson.data as ReceiptDetails;
        setActiveReceipt(receiptData);

        const newBill: PrintedBill = {
          id: receiptData.order_id,
          order_number: receiptData.order_number,
          total: receiptData.financials.total,
          customer_name: receiptData.customer.name,
          timestamp: new Date().toLocaleTimeString(),
          items_count: receiptData.items.length,
        };

        setRecentBills((prev) => [newBill, ...prev.slice(0, 19)]);
        setStatusMessage(`Order #${receiptData.order_number} verified and checkout collected successfully`);

        if (autoPrint) {
          setTimeout(() => {
            window.print();
          }, 300);
        }
      } else {
        setStatusMessage(`Order #${orderData.order_number || ''} marked COLLECTED.`);
      }

      setScanToken('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with collection terminal');
    } finally {
      setProcessing(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#252525] flex flex-col md:flex-row select-none">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 pt-6 pb-20 md:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#EEEEEE] gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
                <Printer className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#F47721]">
                  Hardware Terminal Mode
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-[#252525] tracking-tight">
                  Kiosk Scanner & Thermal Printer
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#EEEEEE] text-[11px] font-bold text-[#666666] shadow-xs">
                <span className="h-2 w-2 rounded-full bg-[#269B62] animate-pulse" />
                <span>Scanner Active</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#EEEEEE] text-[11px] font-bold text-[#666666] shadow-xs">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span>Printer ESC/POS ({paperWidth})</span>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-3xl bg-white border border-[#EEEEEE] p-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-[#EEEEEE]">
                  <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-[#F47721]" />
                    <span>Barcode / QR Token Capture</span>
                  </h2>
                  <span className="text-[10px] font-mono text-[#888888] bg-[#FAFAFA] border border-[#EEEEEE] px-2 py-0.5 rounded-full">
                    Auto-Focused
                  </span>
                </div>

                <form onSubmit={handleScanSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#666666] mb-2 uppercase tracking-wider text-[10px]">
                      Scan Token or Input Manually
                    </label>
                    <input
                      ref={inputRef}
                      type="text"
                      value={scanToken}
                      onChange={(e) => setScanToken(e.target.value)}
                      placeholder="Point scanner at diner's QR code..."
                      disabled={processing}
                      className="w-full text-base sm:text-lg font-mono px-4 py-3.5 rounded-2xl bg-[#FAFAFA] border-2 border-[#EEEEEE] focus:border-[#F47721] focus:bg-white focus:outline-none transition-all shadow-inner"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={processing || !scanToken.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#F47721] hover:bg-[#E06310] text-white font-bold text-sm shadow-md shadow-[#F47721]/20 transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing Token & Printing Bill...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 stroke-[3]" />
                        <span>Accept Checkout & Print Bill</span>
                      </>
                    )}
                  </button>
                </form>

                {statusMessage && (
                  <div className="mt-4 p-4 rounded-2xl bg-green-50 border border-green-200 flex items-center gap-3 text-xs font-semibold text-[#269B62]">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                    <span>{statusMessage}</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3 text-xs font-semibold text-[#D94A43]">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              <div className="rounded-3xl bg-white border border-[#EEEEEE] p-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-[#EEEEEE]">
                  <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-[#F47721]" />
                    <span>Hardware Kiosk Configuration</span>
                  </h2>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE]">
                    <span className="text-[10px] font-bold text-[#888888] uppercase tracking-wider block mb-1.5">
                      Auto-Print Bill
                    </span>
                    <button
                      type="button"
                      onClick={() => setAutoPrint(!autoPrint)}
                      className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        autoPrint ? 'bg-[#269B62] text-white shadow-xs' : 'bg-gray-200 text-[#666666]'
                      }`}
                    >
                      {autoPrint ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE]">
                    <span className="text-[10px] font-bold text-[#888888] uppercase tracking-wider block mb-1.5">
                      Paper Width
                    </span>
                    <button
                      type="button"
                      onClick={() => setPaperWidth(paperWidth === '80mm' ? '58mm' : '80mm')}
                      className="w-full py-1.5 px-3 rounded-xl bg-white border border-[#EEEEEE] text-xs font-bold text-[#252525] shadow-xs hover:border-[#F47721] transition"
                    >
                      {paperWidth} (POS Roll)
                    </button>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE]">
                    <span className="text-[10px] font-bold text-[#888888] uppercase tracking-wider block mb-1.5">
                      Sound Feedback
                    </span>
                    <button
                      type="button"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        soundEnabled ? 'bg-blue-600 text-white shadow-xs' : 'bg-gray-200 text-[#666666]'
                      }`}
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>{soundEnabled ? 'Chime On' : 'Mute'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white border border-[#EEEEEE] p-6 shadow-xs">
                <h2 className="text-sm font-bold text-[#252525] pb-4 border-b border-[#EEEEEE] flex items-center justify-between">
                  <span>Recent Terminal Print Feed</span>
                  <span className="text-xs font-normal text-[#888888]">{recentBills.length} printed today</span>
                </h2>

                <div className="mt-4 divide-y divide-[#EEEEEE] max-h-64 overflow-y-auto no-scrollbar">
                  {recentBills.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#888888]">
                      No orders scanned or bills printed in this session yet.
                    </div>
                  ) : (
                    recentBills.map((bill) => (
                      <div key={bill.id + bill.timestamp} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#252525]">#{bill.order_number}</span>
                          <span className="ml-2 text-[#888888]">{bill.customer_name}</span>
                          <div className="text-[10px] text-[#888888] mt-0.5">
                            {bill.items_count} items • {bill.timestamp}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-[#252525]">₹{(bill.total / 100).toFixed(2)}</span>
                          <span className="block text-[10px] text-[#269B62] font-semibold">COLLECTED</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="sticky top-20 rounded-3xl bg-white border border-[#EEEEEE] p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-[#EEEEEE]">
                  <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-[#F47721]" />
                    <span>Thermal Bill Preview</span>
                  </h2>
                  {activeReceipt && (
                    <button
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 transition shadow-xs"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print</span>
                    </button>
                  )}
                </div>

                {activeReceipt ? (
                  <div className="mt-6 p-6 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] font-mono text-xs text-[#252525] print:p-0 print:border-none print:bg-white print:m-0 space-y-4">
                    <div className="text-center pb-3 border-b border-dashed border-[#CCCCCC]">
                      <h3 className="font-black text-sm uppercase tracking-wider">{activeReceipt.canteen.name}</h3>
                      <p className="text-[11px] text-[#666666]">{activeReceipt.canteen.campus}</p>
                      <p className="text-[10px] text-[#888888] mt-1">Official Collection Receipt</p>
                    </div>

                    <div className="text-[11px] space-y-1 pb-3 border-b border-dashed border-[#CCCCCC]">
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Order #:</span>
                        <span className="font-bold">{activeReceipt.order_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Diner:</span>
                        <span>{activeReceipt.customer.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Type:</span>
                        <span className="capitalize">{activeReceipt.customer.account_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Time:</span>
                        <span>{new Date(activeReceipt.collected_at).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pb-3 border-b border-dashed border-[#CCCCCC]">
                      <div className="flex justify-between text-[10px] text-[#888888] font-bold uppercase">
                        <span>Item</span>
                        <span>Qty x Price</span>
                        <span>Total</span>
                      </div>
                      {activeReceipt.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-[11px]">
                          <span className="max-w-[140px] truncate">{it.name}</span>
                          <span className="text-[#666666]">
                            {it.quantity} x ₹{(it.unit_price / 100).toFixed(0)}
                          </span>
                          <span className="font-bold">₹{(it.line_total / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5 pt-1 text-sm">
                      <div className="flex justify-between font-black text-base">
                        <span>TOTAL PAID:</span>
                        <span>₹{(activeReceipt.financials.total / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-[#666666]">
                        <span>Payment Method:</span>
                        <span className="uppercase font-bold">{activeReceipt.financials.payment_method}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-[#666666]">
                        <span>Status:</span>
                        <span className="font-bold text-[#269B62]">COLLECTED</span>
                      </div>
                    </div>

                    <div className="text-center pt-3 text-[10px] text-[#888888] border-t border-dashed border-[#CCCCCC]">
                      Thank you for dining at College Cafeteria!
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 py-16 text-center space-y-3">
                    <Receipt className="h-10 w-10 text-[#CCCCCC] mx-auto" />
                    <p className="text-xs text-[#888888]">
                      Scan a customer QR code to view and print the thermal receipt.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
