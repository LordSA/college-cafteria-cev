'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  QrCode,
  Camera,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Printer,
  PackageCheck,
  Loader2,
} from 'lucide-react';

interface OrderItem {
  id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

interface VerificationResult {
  order_id: string;
  order_number: string;
  order_stage?: 'ORDER_PLACED' | 'COLLECTED';
  order_status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  subtotal: number;
  paid_at: string | null;
  collected_at: string | null;
  collected_by: string | null;
  qr_verification_token: string;
  qr_consumed_at?: string | null;
  created_at: string;
  customer: {
    id: string;
    display_name: string;
    account_type: string;
  };
  items: OrderItem[];
  is_eligible_for_collection: boolean;
  ineligibility_reason?: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

function AdminScanContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const { session } = useAdminAuth();

  const [manualToken, setManualToken] = useState(tokenParam || '');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);
  const [collectSuccess, setCollectSuccess] = useState<string | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleVerify = async (tokenToVerify: string) => {
    const trimmed = tokenToVerify.trim();
    if (!trimmed || !session?.access_token) return;

    setVerifying(true);
    setError(null);
    setResult(null);
    setCollectError(null);
    setCollectSuccess(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/orders/verify-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ qr_token: trimmed }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Invalid or unrecognized QR token');
      }

      setResult(json.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error validating verification token';
      setError(msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleCollect = async () => {
    if (!result || !session?.access_token) return;

    setCollecting(true);
    setCollectError(null);
    setCollectSuccess(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${result.order_id}/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ qr_token: result.qr_verification_token }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to complete order collection');
      }

      setCollectSuccess(`Order ${result.order_number} marked as COLLECTED. Meal dispatched to counter.`);
      setResult((prev) =>
        prev
          ? {
              ...prev,
              order_stage: 'COLLECTED',
              order_status: 'COLLECTED',
              collected_at: new Date().toISOString(),
              is_eligible_for_collection: false,
            }
          : null
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to finalize meal collection';
      setCollectError(msg);
    } finally {
      setCollecting(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by your browser environment');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not access device camera';
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (tokenParam) {
      handleVerify(tokenParam);
    }
    return () => {
      stopCamera();
    };
  }, [tokenParam]);

  const stage = result?.order_stage || (result?.order_status === 'COLLECTED' || result?.order_status === 'completed' ? 'COLLECTED' : 'ORDER_PLACED');

  return (
    <div className="min-h-screen bg-white text-[#252525] flex flex-col md:flex-row select-none">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 pt-8 pb-24 md:py-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="border-b border-[#EEEEEE] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#F47721]">
                  Cafeteria.cev • Counter Dispatch
                </span>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-[#252525] sm:text-3xl">
                  QR Order Verification & Collection
                </h1>
                <p className="mt-1 text-xs text-[#666666]">
                  Scan customer pickup QR pass or input manual verification token to confirm meal collection
                </p>
              </div>

              <Link
                href="/orders"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-4 py-2 text-xs font-bold text-[#252525] hover:text-[#F47721] transition shadow-xs self-start sm:self-auto"
              >
                <span>View Orders Queue</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-3xl border border-[#EEEEEE] bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-[#F47721]" />
                    <h2 className="text-sm font-bold text-[#252525]">Camera Scanner</h2>
                  </div>
                  {cameraActive ? (
                    <button
                      onClick={stopCamera}
                      className="rounded-xl bg-red-50 border border-red-200 px-3 py-1 text-xs font-bold text-[#D94A43] hover:bg-red-100 transition"
                    >
                      Stop Camera
                    </button>
                  ) : (
                    <button
                      onClick={startCamera}
                      className="rounded-xl bg-[#F47721] hover:bg-[#E06310] px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-[#F47721]/20 transition"
                    >
                      Start Scanner
                    </button>
                  )}
                </div>

                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] flex items-center justify-center">
                  <video
                    ref={videoRef}
                    className={`h-full w-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                    playsInline
                    muted
                  />
                  {!cameraActive && (
                    <div className="text-center p-6 space-y-2">
                      <QrCode className="mx-auto h-12 w-12 text-[#888888]" />
                      <p className="text-xs text-[#666666]">
                        Camera inactive. Click &apos;Start Scanner&apos; to use optical QR scanner.
                      </p>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-[#D94A43] flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-[#D94A43]" />
                    <span>{cameraError}</span>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-[#EEEEEE] bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-[#F47721]" />
                  <h2 className="text-sm font-bold text-[#252525]">Manual Token Fallback</h2>
                </div>

                <p className="text-xs text-[#666666]">
                  Enter the customer&apos;s verification token (e.g., <code className="font-mono text-[#F47721] font-bold">CAF-QR-XXXXXX</code>) if optical scanning is unavailable.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleVerify(manualToken);
                  }}
                  className="space-y-3"
                >
                  <div>
                    <input
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="CAF-QR-..."
                      className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-4 py-2.5 font-mono text-xs text-[#252525] placeholder:text-[#888888] uppercase focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={verifying || !manualToken.trim()}
                    className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#F47721] hover:bg-[#E06310] py-2.5 text-xs font-bold text-white shadow-md shadow-[#F47721]/20 transition disabled:opacity-50 active:scale-95"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Verifying Token...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="h-3.5 w-3.5" />
                        <span>Verify Order Pass</span>
                      </>
                    )}
                  </button>
                </form>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-[#D94A43] flex items-center gap-2">
                    <XCircle className="h-4 w-4 flex-shrink-0 text-[#D94A43]" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>

            {result && (
              <div className="rounded-3xl border border-[#EEEEEE] bg-white p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#EEEEEE] pb-4 gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xl font-extrabold text-[#F47721]">
                        {result.order_number}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                          result.payment_status === 'paid'
                            ? 'bg-green-50 text-[#269B62] border-green-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {result.payment_status}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                        stage === 'COLLECTED'
                          ? 'bg-green-50 text-[#269B62] border-green-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {stage}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#666666]">
                      Customer: <span className="text-[#252525] font-semibold">{result.customer.display_name}</span> ({result.customer.account_type})
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666] block">Total Amount</span>
                    <p className="font-mono text-xl font-extrabold text-[#252525] tabular-nums">
                      ₹{(result.total / 100).toFixed(2)}
                    </p>
                  </div>
                </div>

                {collectSuccess && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-xs text-[#269B62] flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-[#269B62] flex-shrink-0" />
                    <span className="font-bold">{collectSuccess}</span>
                  </div>
                )}

                {collectError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-[#D94A43] flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-[#D94A43] flex-shrink-0" />
                    <span>{collectError}</span>
                  </div>
                )}

                {stage === 'COLLECTED' && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-xs text-[#269B62] flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-[#269B62] flex-shrink-0" />
                    <div>
                      <p className="font-bold">Order Collected</p>
                      <p className="text-[11px] text-[#269B62]/80 mt-0.5">
                        This order was collected {result.collected_at ? `at ${new Date(result.collected_at).toLocaleTimeString()}` : 'successfully'}. The QR pass has been fulfilled.
                      </p>
                    </div>
                  </div>
                )}

                {result.payment_status !== 'paid' && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-[#D94A43] flex items-center gap-2.5">
                    <AlertCircle className="h-5 w-5 text-[#D94A43] flex-shrink-0" />
                    <div>
                      <p className="font-bold">Payment Unconfirmed</p>
                      <p className="text-[11px] text-[#D94A43]/80 mt-0.5">
                        Payment status is {result.payment_status}. Order cannot be dispatched until payment is verified.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-[10px] font-bold text-[#666666] uppercase tracking-wider mb-3">
                    Item Checklist ({result.items.length} items)
                  </h3>
                  <div className="divide-y divide-[#EEEEEE] rounded-2xl border border-[#EEEEEE] bg-[#FAFAFA]">
                    {result.items.map((item) => (
                      <div key={item.id} className="p-3.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-[#F47721] min-w-[24px]">
                            {item.quantity}×
                          </span>
                          <span className="font-semibold text-[#252525]">{item.item_name}</span>
                        </div>
                        <span className="font-mono font-bold text-[#252525] tabular-nums">
                          ₹{(item.line_total / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  {result.is_eligible_for_collection && (
                    <button
                      onClick={handleCollect}
                      disabled={collecting}
                      className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#269B62] hover:bg-[#1f8050] py-3 text-xs font-black text-white shadow-md shadow-[#269B62]/20 transition disabled:opacity-50 active:scale-95"
                    >
                      {collecting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Completing Order...</span>
                        </>
                      ) : (
                        <>
                          <PackageCheck className="h-4 w-4" />
                          <span>Complete Order (Mark as Collected)</span>
                        </>
                      )}
                    </button>
                  )}

                  <Link
                    href={`/orders/receipt/?id=${result.order_id}`}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-5 py-3 text-xs font-bold text-[#252525] hover:text-[#F47721] transition active:scale-95"
                  >
                    <Printer className="h-4 w-4 text-[#F47721]" />
                    <span>Print Receipt / Bill</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}

export default function AdminScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white text-[#666666]">
          <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
        </div>
      }
    >
      <AdminScanContent />
    </Suspense>
  );
}
