'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Search,
  Printer,
  PackageCheck,
  Shield,
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
  order_status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  subtotal: number;
  paid_at: string | null;
  collected_at: string | null;
  collected_by: string | null;
  qr_verification_token: string;
  created_at: string;
  customer: {
    id: string;
    display_name: string;
    account_type: string;
  };
  items: OrderItem[];
  is_eligible_for_collection: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function AdminScanPage() {
  const { adminUser, adminProfile, session, loading: authLoading } = useAdminAuth();

  const [manualToken, setManualToken] = useState('');
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
      const msg = err instanceof Error ? err.message : 'Failed to verify QR token';
      setError(msg);
    } finally {
      setVerifying(false);
    }
  };

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

      setCollectSuccess(`Order ${result.order_number} marked as collected and complete!`);
      setResult((prev) =>
        prev
          ? {
              ...prev,
              order_status: 'completed',
              is_eligible_for_collection: false,
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

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API is not supported in this browser environment. Please use manual code entry.');
        return;
      }

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
      setCameraError(`Camera permission denied or camera unavailable: ${msg}`);
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Header />
        <main className="flex-1 flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!adminUser || adminProfile?.app_role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20 px-4">
          <div className="max-w-md rounded-2xl border border-rose-900/50 bg-rose-950/20 p-8 text-center space-y-4">
            <Shield className="mx-auto h-12 w-12 text-rose-500" />
            <h1 className="text-xl font-bold text-white">Access Denied</h1>
            <p className="text-xs text-slate-400">
              Only canteen staff administrators can verify QR tokens and collect orders.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition"
            >
              Sign In with Admin Account
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-indigo-950 px-2 py-0.5 text-[11px] font-bold text-indigo-400 border border-indigo-800">
                  Phase 4.1 Feature
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-300 border border-slate-700">
                  Counter Verification
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                QR Order Scanner & Collection
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Scan customer pickup QR passes or enter manual reference tokens to authorize food dispatch.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/orders"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 transition"
              >
                <span>Orders Queue</span>
              </Link>
              <Link
                href="/wallets"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-sm"
              >
                <span>Wallets Panel</span>
              </Link>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Camera Scanner
                  </span>
                </div>
                {cameraActive ? (
                  <button
                    onClick={stopCamera}
                    className="rounded-lg bg-rose-950 border border-rose-800 px-2.5 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-900 transition"
                  >
                    Stop Camera
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="rounded-lg bg-indigo-950 border border-indigo-800 px-2.5 py-1 text-[11px] font-bold text-indigo-300 hover:bg-indigo-900 transition"
                  >
                    Start Camera
                  </button>
                )}
              </div>

              <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                  autoPlay
                  playsInline
                  muted
                />
                {!cameraActive && (
                  <div className="text-center p-6 space-y-2">
                    <QrCode className="mx-auto h-10 w-10 text-slate-600" />
                    <p className="text-xs text-slate-400">
                      Camera scanner standby. Click "Start Camera" or use manual token verification below.
                    </p>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="rounded-xl border border-amber-900/80 bg-amber-950/40 p-3 text-xs text-amber-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Search className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Manual Code Entry
                </span>
              </div>

              <p className="text-xs text-slate-400">
                Enter the QR verification code from the customer's phone (e.g., <code className="text-indigo-300">CAF-QR-XXXXXX</code>) to look up the order.
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
                    placeholder="Enter QR Verification Token..."
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifying || !manualToken.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Verifying QR Code...</span>
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
                  <div className="flex items-center gap-2">
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
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider border border-slate-700">
                      {result.order_status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Customer: <span className="text-white font-semibold">{result.customer.display_name}</span> (
                    {result.customer.account_type})
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400">Total Bill</span>
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

              {result.order_status === 'completed' && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>
                    This order was already collected at{' '}
                    <strong className="text-white">
                      {result.collected_at ? new Date(result.collected_at).toLocaleTimeString() : 'earlier'}
                    </strong>
                    .
                  </span>
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
