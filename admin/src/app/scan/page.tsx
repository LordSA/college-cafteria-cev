'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  QrCode,
  Camera,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
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
  order_stage?: 'ORDER_PLACED' | 'READY_TO_PICK' | 'COLLECTED';
  order_status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  subtotal: number;
  paid_at: string | null;
  ready_at?: string | null;
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

  const [markingReady, setMarkingReady] = useState(false);
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
      const msg = err instanceof Error ? err.message : 'Failed to verify QR token';
      setError(msg);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (tokenParam && session?.access_token && !result && !verifying) {
      handleVerify(tokenParam);
    }
  }, [tokenParam, session?.access_token]);

  const handleCollect = async () => {
    if (!result || !session?.access_token) return;

    setCollecting(true);
    setCollectError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/orders/${result.order_id}/collect`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to collect order');
      }

      setCollectSuccess(`Order ${result.order_number} marked as collected!`);
      setResult((prev) =>
        prev
          ? {
              ...prev,
              order_stage: 'COLLECTED',
              order_status: 'COLLECTED',
              is_eligible_for_collection: false,
              ineligibility_reason: 'Order already collected',
              collected_at: new Date().toISOString(),
            }
          : null
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error completing collection';
      setCollectError(msg);
    } finally {
      setCollecting(false);
    }
  };

  const handleMarkReady = async () => {
    if (!result || !session?.access_token) return;

    setMarkingReady(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/orders/${result.order_id}/ready`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to mark order as ready');
      }

      setResult((prev) =>
        prev
          ? {
              ...prev,
              order_stage: 'READY_TO_PICK',
              order_status: 'READY_TO_PICK',
              is_eligible_for_collection: true,
              ineligibility_reason: null,
            }
          : null
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating order stage';
      setError(msg);
    } finally {
      setMarkingReady(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to access camera';
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
    return () => {
      stopCamera();
    };
  }, []);

  const stage = result?.order_stage || (result?.order_status === 'READY_TO_PICK' || result?.order_status === 'ready_for_pickup' ? 'READY_TO_PICK' : result?.order_status === 'COLLECTED' || result?.order_status === 'completed' ? 'COLLECTED' : 'ORDER_PLACED');

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header />

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Counter Dispatch
              </span>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
                QR Order Verification & Collection
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Scan customer pickup QR pass or input manual verification token to confirm meal collection
              </p>
            </div>

            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition shadow-xs self-start sm:self-auto"
            >
              <span>View Orders Queue</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-indigo-400" />
                  <h2 className="text-sm font-bold text-white">Camera Scanner</h2>
                </div>
                {cameraActive ? (
                  <button
                    onClick={stopCamera}
                    className="rounded-lg bg-rose-950 border border-rose-800/80 px-2.5 py-1 text-xs font-bold text-rose-300 hover:bg-rose-900 transition"
                  >
                    Stop Camera
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-xs"
                  >
                    Start Scanner
                  </button>
                )}
              </div>

              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                <video
                  ref={videoRef}
                  className={`h-full w-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                  playsInline
                  muted
                />
                {!cameraActive && (
                  <div className="text-center p-6 space-y-2">
                    <QrCode className="mx-auto h-12 w-12 text-slate-700" />
                    <p className="text-xs text-slate-400">
                      Camera inactive. Click &apos;Start Scanner&apos; to use optical QR scanner.
                    </p>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="rounded-xl border border-rose-900/80 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white">Manual Token Fallback</h2>
              </div>

              <p className="text-xs text-slate-400">
                Enter the customer&apos;s verification token (e.g., <code className="font-mono text-indigo-300">CAF-QR-XXXXXX</code>) if optical scanning is unavailable.
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
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 font-mono text-xs text-white placeholder-slate-600 uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifying || !manualToken.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-xs disabled:opacity-50"
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
                <div className="rounded-xl border border-rose-900/80 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-center gap-2">
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          {result && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4 gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xl font-extrabold text-white">
                      {result.order_number}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        result.payment_status === 'paid'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {result.payment_status}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                      stage === 'READY_TO_PICK'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                        : stage === 'COLLECTED'
                        ? 'bg-slate-800 text-slate-300 border-slate-700'
                        : 'bg-blue-950/80 text-blue-300 border-blue-700'
                    }`}>
                      {stage}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Customer: <span className="text-white font-semibold">{result.customer.display_name}</span> ({result.customer.account_type})
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400">Total Amount</span>
                  <p className="font-mono text-xl font-extrabold text-emerald-400 tabular-nums">
                    ₹{(result.total / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              {collectSuccess && (
                <div className="rounded-xl border border-emerald-800/80 bg-emerald-950/50 p-4 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  <span className="font-bold">{collectSuccess}</span>
                </div>
              )}

              {collectError && (
                <div className="rounded-xl border border-rose-800/80 bg-rose-950/50 p-4 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
                  <span>{collectError}</span>
                </div>
              )}

              {stage === 'COLLECTED' && (
                <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-xs text-rose-300 flex items-center gap-2.5">
                  <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Order already collected</p>
                    <p className="text-[11px] text-rose-400 mt-0.5">
                      This QR token was consumed at {result.collected_at ? new Date(result.collected_at).toLocaleTimeString() : 'earlier'}. It cannot be collected again.
                    </p>
                  </div>
                </div>
              )}

              {stage === 'ORDER_PLACED' && (
                <div className="rounded-xl border border-amber-900/60 bg-amber-950/40 p-4 text-xs text-amber-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-5 w-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="font-bold">Order is not ready for pickup yet</p>
                      <p className="text-[11px] text-amber-400 mt-0.5">
                        Order is currently in ORDER_PLACED stage. Mark as ready to enable counter collection.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleMarkReady}
                    disabled={markingReady}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-500 transition shadow-xs self-start sm:self-auto disabled:opacity-50"
                  >
                    {markingReady ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PackageCheck className="h-3.5 w-3.5" />}
                    <span>Mark Ready to Pick</span>
                  </button>
                </div>
              )}

              {result.is_eligible_for_collection && stage === 'READY_TO_PICK' && (
                <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-4 text-xs text-emerald-300 flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Ready for Collection</p>
                    <p className="text-[11px] text-emerald-400 mt-0.5">
                      Customer payment confirmed and order is in READY_TO_PICK stage.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Item Checklist ({result.items.length} items)
                </h3>
                <div className="divide-y divide-slate-800/60 rounded-xl border border-slate-800 bg-slate-950">
                  {result.items.map((item) => (
                    <div key={item.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-indigo-400 min-w-[24px]">
                          {item.quantity}×
                        </span>
                        <span className="font-semibold text-white">{item.item_name}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-300 tabular-nums">
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
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {collecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Confirming Collection...</span>
                      </>
                    ) : (
                      <>
                        <PackageCheck className="h-4 w-4" />
                        <span>Confirm Order Collection</span>
                      </>
                    )}
                  </button>
                )}

                <Link
                  href={`/orders/receipt/?id=${result.order_id}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition"
                >
                  <Printer className="h-4 w-4 text-indigo-400" />
                  <span>Print Receipt / Bill</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function AdminScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <AdminScanContent />
    </Suspense>
  );
}
