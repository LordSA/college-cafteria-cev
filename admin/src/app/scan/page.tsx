'use client';

import { useState, useEffect, useRef, useCallback, Suspense, type ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import jsQR from 'jsqr';
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
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  Image as ImageIcon,
  RotateCcw,
  CheckSquare,
  Square,
  User,
  Clock,
  ArrowRight,
  ShieldCheck,
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
    teacher_id?: string;
  };
  items: OrderItem[];
  is_eligible_for_collection: boolean;
  ineligibility_reason?: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

function parseToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.token) return String(parsed.token).trim();
      if (parsed.qr_token) return String(parsed.qr_token).trim();
      if (parsed.qr_verification_token) return String(parsed.qr_verification_token).trim();
    } catch {}
  }

  if (trimmed.includes('http://') || trimmed.includes('https://') || trimmed.includes('/scan?') || trimmed.includes('/receipt?')) {
    try {
      const match = trimmed.match(/[?&]token=([^&#\s]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]).trim();
      }
      const idMatch = trimmed.match(/[?&]id=([^&#\s]+)/);
      if (idMatch && idMatch[1]) {
        return decodeURIComponent(idMatch[1]).trim();
      }
    } catch {}
  }

  const cafMatch = trimmed.match(/CAF-QR-[A-Za-z0-9_-]+/i);
  if (cafMatch) {
    return cafMatch[0].trim();
  }

  return trimmed;
}

function playScanBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

function triggerHaptic() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate([40, 50, 40]);
    } catch {}
  }
}

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
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastScanTimestamp = useRef<number>(0);
  const isPaused = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleVerify = useCallback(async (tokenToVerify: string) => {
    const cleaned = parseToken(tokenToVerify);
    if (!cleaned || !session?.access_token) return;

    setVerifying(true);
    setError(null);
    setResult(null);
    setCollectError(null);
    setCollectSuccess(null);
    setCheckedItems({});

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/orders/verify-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ qr_token: cleaned }),
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
  }, [session]);

  const onCodeDetected = useCallback((rawCode: string) => {
    const now = Date.now();
    if (now - lastScanTimestamp.current < 2000) return;
    lastScanTimestamp.current = now;

    const token = parseToken(rawCode);
    if (!token) return;

    playScanBeep();
    triggerHaptic();

    isPaused.current = true;
    setIsScanning(false);
    setManualToken(token);
    handleVerify(token);
  }, [handleVerify]);

  const scanFrame = useCallback(() => {
    if (!cameraActive || isPaused.current || !videoRef.current) return;

    const video = videoRef.current;
    if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        let detected = false;

        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            const detector = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector({ formats: ['qr_code'] });
            detector.detect(video).then((barcodes) => {
              const first = barcodes?.[0];
              if (first?.rawValue) {
                onCodeDetected(first.rawValue);
              }
            }).catch(() => {});
          } catch {}
        }

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            detected = true;
            onCodeDetected(code.data);
            return;
          }
        } catch {}

        if (!detected) {
          setIsScanning(true);
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [cameraActive, onCodeDetected]);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setTorchOn(false);
    setTorchSupported(false);
    setIsScanning(false);
  }, []);

  const startCamera = useCallback(async (facing: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setCameraError(null);
    isPaused.current = false;

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by your browser environment');
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities = (track.getCapabilities?.() || {}) as { torch?: boolean };
          setTorchSupported(Boolean(capabilities.torch));
        } catch {}
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setIsScanning(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not access device camera';
      setCameraError(msg);
      setCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (cameraActive && !isPaused.current) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [cameraActive, scanFrame]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextTorch = !torchOn;
        await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setTorchOn(nextTorch);
      } catch {}
    }
  };

  const switchCamera = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    await startCamera(nextFacing);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setCameraError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);

        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            const detector = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector({ formats: ['qr_code'] });
            detector.detect(img).then((barcodes) => {
              const first = barcodes?.[0];
              if (first?.rawValue) {
                onCodeDetected(first.rawValue);
              }
            }).catch(() => {});
          } catch {}
        }

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            onCodeDetected(code.data);
            return;
          }
        } catch {}

        setError('No QR code detected in the selected image. Please try another image or enter token manually.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  const resetForNextScan = () => {
    setResult(null);
    setError(null);
    setCollectSuccess(null);
    setCollectError(null);
    setManualToken('');
    setCheckedItems({});
    isPaused.current = false;
    if (cameraActive) {
      setIsScanning(true);
      animFrameRef.current = requestAnimationFrame(scanFrame);
    } else {
      startCamera();
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

      setCollectSuccess(`Order #${result.order_number} marked as COLLECTED. Meal dispatched to customer.`);
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

  const toggleCheckItem = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCheckAll = () => {
    if (!result) return;
    const allChecked = result.items.every((it) => checkedItems[it.id]);
    const next: Record<string, boolean> = {};
    result.items.forEach((it) => {
      next[it.id] = !allChecked;
    });
    setCheckedItems(next);
  };

  useEffect(() => {
    if (tokenParam) {
      handleVerify(tokenParam);
    }
    return () => {
      stopCamera();
    };
  }, [tokenParam, handleVerify, stopCamera]);

  const stage = result?.order_stage || (result?.order_status === 'COLLECTED' || result?.order_status === 'completed' ? 'COLLECTED' : 'ORDER_PLACED');
  const allItemsChecked = result && result.items.length > 0 && result.items.every((it) => checkedItems[it.id]);

  return (
    <div className="min-h-screen bg-[#fafaf9] text-[#252525] flex flex-col md:flex-row select-none">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 pt-6 pb-24 md:py-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#EEEEEE] pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-[#F47721]">
                    <QrCode className="h-4 w-4" />
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#252525]">
                    Pickup Pass Scanner
                  </h1>
                </div>
                <p className="mt-1 text-xs text-[#666666]">
                  Scan student and faculty counter pickup QR pass or enter code manually
                </p>
              </div>

              {result && (
                <button
                  type="button"
                  onClick={resetForNextScan}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F47721] hover:bg-[#E06310] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-[#F47721]/20 transition active:scale-95"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Scan Next Order</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-3xl border border-[#EEEEEE] bg-white p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-[#F47721]" />
                    <h2 className="text-sm font-bold text-[#252525]">Camera Scanner</h2>
                    {isScanning && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-[#269B62]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#269B62] animate-pulse" />
                        Live
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {cameraActive && torchSupported && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`flex h-8 w-8 items-center justify-center rounded-xl border transition ${
                          torchOn
                            ? 'bg-amber-100 border-amber-300 text-amber-800'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                        title="Toggle Flashlight"
                      >
                        {torchOn ? <Flashlight className="h-4 w-4" /> : <FlashlightOff className="h-4 w-4" />}
                      </button>
                    )}

                    {cameraActive && (
                      <button
                        type="button"
                        onClick={switchCamera}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100 transition"
                        title="Switch Camera (Front/Rear)"
                      >
                        <SwitchCamera className="h-4 w-4" />
                      </button>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100 transition"
                      title="Upload QR Image"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </button>

                    {cameraActive ? (
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-[#D94A43] hover:bg-rose-100 transition"
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="rounded-xl bg-[#F47721] hover:bg-[#E06310] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-[#F47721]/20 transition"
                      >
                        Start Camera
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative aspect-square sm:aspect-video w-full overflow-hidden rounded-2xl bg-[#111216] border border-[#EEEEEE] flex items-center justify-center">
                  <video
                    ref={videoRef}
                    className={`h-full w-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                    playsInline
                    muted
                  />

                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                      <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl border-2 border-white/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                        <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#F47721] rounded-tl-lg" />
                        <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#F47721] rounded-tr-lg" />
                        <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#F47721] rounded-bl-lg" />
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#F47721] rounded-br-lg" />

                        <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-[#F47721] to-transparent shadow-[0_0_8px_#F47721] animate-scanner-laser" />
                      </div>

                      <p className="mt-4 text-[11px] font-semibold text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                        Align customer QR pass within the frame
                      </p>
                    </div>
                  )}

                  {!cameraActive && (
                    <div className="text-center p-6 space-y-3">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-stone-400">
                        <QrCode className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Camera is currently inactive</p>
                        <p className="text-[11px] text-stone-400 mt-1 max-w-xs mx-auto">
                          Click &apos;Start Camera&apos; to scan customer QR passes optically or upload an image file
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#F47721] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#F47721]/30 hover:bg-[#E06310] transition"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <span>Start Camera Scanner</span>
                      </button>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-[#D94A43] flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-[#D94A43]" />
                    <span className="flex-1">{cameraError}</span>
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="font-bold underline text-xs"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-[#EEEEEE] bg-white p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-[#F47721]" />
                  <h2 className="text-sm font-bold text-[#252525]">Manual Token Lookup</h2>
                </div>

                <p className="text-xs text-[#666666]">
                  Enter the verification token string (e.g. <span className="font-mono text-[#F47721] font-bold">CAF-QR-XXXXXX</span>) or paste the customer receipt URL.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleVerify(manualToken);
                  }}
                  className="space-y-3"
                >
                  <div className="relative">
                    <input
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="e.g. CAF-QR-9F8K2A or paste link"
                      className="w-full rounded-2xl border border-[#EEEEEE] hover:border-stone-300 bg-white px-4 py-3 font-mono text-xs text-[#252525] placeholder:text-stone-400 focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={verifying || !manualToken.trim()}
                      className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F47721] hover:bg-[#E06310] py-3 text-xs font-bold text-white shadow-md shadow-[#F47721]/20 transition disabled:opacity-50 active:scale-95"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Verifying Pass...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4" />
                          <span>Verify Order Pass</span>
                        </>
                      )}
                    </button>

                    {manualToken && (
                      <button
                        type="button"
                        onClick={() => setManualToken('')}
                        className="rounded-2xl border border-stone-200 px-3 py-3 text-xs font-semibold text-stone-500 hover:bg-stone-50 transition"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </form>

                {error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-[#D94A43] flex items-center gap-2">
                    <XCircle className="h-4 w-4 flex-shrink-0 text-[#D94A43]" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>

            {result && (
              <div className="rounded-3xl border border-[#EEEEEE] bg-white p-6 shadow-sm space-y-6 animate-in fade-in zoom-in-95">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#EEEEEE] pb-4 gap-3">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-2xl font-black text-[#F47721]">
                        #{result.order_number}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider border ${
                          stage === 'COLLECTED'
                            ? 'bg-emerald-50 text-[#269B62] border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {stage === 'COLLECTED' ? 'Collected' : 'Ready for Pickup'}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider border ${
                          result.payment_status === 'paid'
                            ? 'bg-emerald-50 text-[#269B62] border-emerald-200'
                            : result.payment_method === 'pay_later'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-rose-50 text-[#D94A43] border-rose-200'
                        }`}
                      >
                        {result.payment_status === 'paid'
                          ? 'Paid'
                          : result.payment_method === 'pay_later'
                          ? 'Faculty Pay Later'
                          : result.payment_status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-stone-600 mt-2">
                      <span className="flex items-center gap-1 font-semibold text-stone-900">
                        <User className="h-3.5 w-3.5 text-[#F47721]" />
                        {result.customer.display_name}
                      </span>
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase text-stone-600">
                        {result.customer.account_type === 'staff_t'
                          ? `Teacher ${result.customer.teacher_id ? `(${result.customer.teacher_id})` : ''}`
                          : result.customer.account_type}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-stone-400">
                        <Clock className="h-3 w-3" />
                        {new Date(result.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                      Total Bill
                    </span>
                    <p className="font-mono text-2xl font-black text-stone-900 tabular-nums">
                      ₹{(result.total / 100).toFixed(2)}
                    </p>
                  </div>
                </div>

                {collectSuccess && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-[#269B62] flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-[#269B62] flex-shrink-0" />
                    <div>
                      <p className="font-bold">{collectSuccess}</p>
                      <p className="text-[11px] text-[#269B62]/80 mt-0.5">
                        Meal has been handed over. Customer order record updated in real-time.
                      </p>
                    </div>
                  </div>
                )}

                {collectError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-[#D94A43] flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-[#D94A43] flex-shrink-0" />
                    <span>{collectError}</span>
                  </div>
                )}

                {stage === 'COLLECTED' && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-[#269B62] flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-[#269B62] flex-shrink-0" />
                    <div>
                      <p className="font-bold">Pass Already Fulfilled</p>
                      <p className="text-[11px] text-[#269B62]/80 mt-0.5">
                        This order was marked as collected {result.collected_at ? `at ${new Date(result.collected_at).toLocaleTimeString()}` : ''}. The pickup pass is no longer active.
                      </p>
                    </div>
                  </div>
                )}

                {result.payment_status !== 'paid' && result.payment_method !== 'pay_later' && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-[#D94A43] flex items-center gap-2.5">
                    <AlertCircle className="h-5 w-5 text-[#D94A43] flex-shrink-0" />
                    <div>
                      <p className="font-bold">Payment Unconfirmed</p>
                      <p className="text-[11px] text-[#D94A43]/80 mt-0.5">
                        Payment status is {result.payment_status}. Order cannot be dispatched until payment is settled.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Item Packing Checklist ({result.items.length} items)
                    </h3>
                    <button
                      type="button"
                      onClick={toggleCheckAll}
                      className="text-[11px] font-bold text-[#F47721] hover:underline"
                    >
                      {allItemsChecked ? 'Uncheck All' : 'Check All Items'}
                    </button>
                  </div>

                  <div className="divide-y divide-[#EEEEEE] rounded-2xl border border-[#EEEEEE] bg-[#FAFAFA] overflow-hidden">
                    {result.items.map((item) => {
                      const isChecked = Boolean(checkedItems[item.id]);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleCheckItem(item.id)}
                          className={`w-full p-3.5 flex items-center justify-between text-left transition ${
                            isChecked ? 'bg-orange-50/50' : 'hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {isChecked ? (
                              <CheckSquare className="h-4 w-4 text-[#F47721] flex-shrink-0" />
                            ) : (
                              <Square className="h-4 w-4 text-stone-400 flex-shrink-0" />
                            )}
                            <span className="font-mono font-bold text-[#F47721] min-w-[28px]">
                              {item.quantity}×
                            </span>
                            <span className={`text-xs font-semibold ${isChecked ? 'text-stone-400 line-through' : 'text-[#252525]'}`}>
                              {item.item_name}
                            </span>
                          </div>
                          <span className="font-mono text-xs font-bold text-[#252525] tabular-nums">
                            ₹{(item.line_total / 100).toFixed(2)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  {result.is_eligible_for_collection && (
                    <button
                      type="button"
                      onClick={handleCollect}
                      disabled={collecting}
                      className="w-full sm:flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl bg-[#269B62] hover:bg-[#1f8050] py-3.5 text-xs font-bold text-white shadow-md shadow-[#269B62]/20 transition disabled:opacity-50 active:scale-95"
                    >
                      {collecting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Dispatching Order...</span>
                        </>
                      ) : (
                        <>
                          <PackageCheck className="h-4 w-4" />
                          <span>Dispatch Meal (Mark as Collected)</span>
                        </>
                      )}
                    </button>
                  )}

                  <Link
                    href={`/orders/receipt/?id=${result.order_id}`}
                    className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 px-5 py-3.5 text-xs font-bold text-[#252525] transition active:scale-95"
                  >
                    <Printer className="h-4 w-4 text-stone-500" />
                    <span>Print Bill Receipt</span>
                  </Link>

                  <button
                    type="button"
                    onClick={resetForNextScan}
                    className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl border border-[#F47721]/30 bg-[#FFF7F0] hover:bg-orange-100/60 px-5 py-3.5 text-xs font-bold text-[#F47721] transition active:scale-95"
                  >
                    <span>Next Customer</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
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
