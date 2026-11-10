'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { QRCodeSvg } from './QRCodeSvg';

export type ReceiptPrinterStage = 'processing' | 'printing' | 'complete';
export type ReceiptFeedMotion = 'smooth' | 'stepped';

export interface OrderItem {
  id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Order {
  id: string;
  order_number: string;
  order_status?: string;
  order_stage?: 'ORDER_PLACED' | 'COLLECTED';
  payment_status: string;
  payment_method?: string;
  qr_verification_token?: string | null;
  subtotal: number;
  total: number;
  items: OrderItem[];
}

export interface ReceiptPrinterProps {
  order: Order;
  onComplete?: () => void;
}

type ReceiptPrinterContextValue = {
  animate: boolean;
  feedMotion: ReceiptFeedMotion;
  shouldMove: boolean;
  stage: ReceiptPrinterStage;
};

const ReceiptPrinterContext = createContext<ReceiptPrinterContextValue | null>(null);

const receiptToothCount = 36;
const receiptToothDepth = 5;
const receiptToothPoints = Array.from({ length: receiptToothCount * 2 }, (_, index) => {
  const x = 100 - ((index + 1) * 100) / (receiptToothCount * 2);
  const y = index % 2 === 0 ? '100%' : `calc(100% - ${receiptToothDepth}px)`;
  return `${x}% ${y}`;
}).join(', ');
const receiptClipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${receiptToothDepth}px), ${receiptToothPoints})`;

function formatCurrency(paise: number) {
  return `₹${(paise / 100).toFixed(2)}`;
}

function useReceiptPrinter(component: string) {
  const context = useContext(ReceiptPrinterContext);
  if (!context) {
    throw new Error(`${component} must be used inside ReceiptPrinterRoot.`);
  }
  return context;
}

function ReceiptPrinterRoot({
  stage,
  animate = true,
  feedMotion = 'stepped',
  children,
  className = '',
}: {
  stage: ReceiptPrinterStage;
  animate?: boolean;
  feedMotion?: ReceiptFeedMotion;
  children: ReactNode;
  className?: string;
}) {
  const context = {
    animate,
    feedMotion,
    shouldMove: animate,
    stage,
  };

  return (
    <ReceiptPrinterContext.Provider value={context}>
      <section
        aria-label="Campus Cafeteria Receipt Printer"
        className={`relative isolate flex w-full max-w-sm flex-col items-center mx-auto ${className}`}
      >
        <style>{`
          @keyframes receipt-printer-feed {
            0% { transform: translateY(calc(-100% + 2px)); opacity: 1; }
            8% { transform: translateY(-88%); }
            12% { transform: translateY(-88%); }
            22% { transform: translateY(-72%); }
            26% { transform: translateY(-72%); }
            40% { transform: translateY(-55%); }
            44% { transform: translateY(-55%); }
            58% { transform: translateY(-38%); }
            62% { transform: translateY(-38%); }
            76% { transform: translateY(-22%); }
            80% { transform: translateY(-22%); }
            92% { transform: translateY(-8%); }
            95% { transform: translateY(-8%); }
            100% { transform: translateY(0%); opacity: 1; }
          }
        `}</style>
        {children}
      </section>
    </ReceiptPrinterContext.Provider>
  );
}

function ReceiptPrinterMachine({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate w-full overflow-hidden rounded-3xl border border-[#252525] bg-gradient-to-b from-[#2e2e2e] to-[#1a1a1a] p-3.5 pb-7 shadow-2xl shadow-black/25">
      {children}
      <div
        aria-hidden="true"
        className="absolute inset-x-8 bottom-3 z-40 h-2 rounded-full border border-black/80 bg-black shadow-inner"
      />
    </div>
  );
}

function ReceiptPrinterScreen({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 isolate overflow-hidden rounded-2xl border border-white/10 bg-[#121212] p-3 text-white shadow-inner">
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function ReceiptPrinterStatus({ orderNumber }: { orderNumber: string }) {
  const { stage } = useReceiptPrinter('ReceiptPrinterStatus');
  const isComplete = stage === 'complete';

  const labels: Record<ReceiptPrinterStage, string> = {
    processing: 'Verifying Token & Kitchen…',
    printing: 'Printing Takeaway Token…',
    complete: 'Takeaway Receipt Ready!',
  };

  return (
    <div className="flex items-center justify-between text-xs font-mono">
      <div className="flex items-center gap-2">
        <span className="relative grid size-4 place-items-center">
          {isComplete ? (
            <span className="text-[#269B62]">
              <CheckCircle2 size={16} />
            </span>
          ) : (
            <span className="text-[#F47721]">
              <Loader2 size={15} className="animate-spin" />
            </span>
          )}
        </span>
        <span className="text-gray-300 font-sans font-medium text-xs">
          {labels[stage]}
        </span>
      </div>

      <span className="text-[10px] text-[#F47721] bg-[#F47721]/15 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
        #{orderNumber.slice(-4).toUpperCase()}
      </span>
    </div>
  );
}

function ReceiptPrinterOutput({ children }: { children: ReactNode }) {
  const { stage } = useReceiptPrinter('ReceiptPrinterOutput');
  const isReceiptVisible = stage !== 'processing';

  const containerStyle: React.CSSProperties = {
    opacity: isReceiptVisible ? 1 : 0,
    transform: stage === 'complete' ? 'translateY(0%)' : stage === 'printing' ? undefined : 'translateY(calc(-100% + 2px))',
    animation: stage === 'printing' ? 'receipt-printer-feed 2.4s linear forwards' : undefined,
  };

  return (
    <div className="relative z-30 -mt-3 w-full overflow-hidden px-4">
      {isReceiptVisible && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 top-0 z-20 h-3 bg-gradient-to-b from-black/60 to-transparent blur-xs"
        />
      )}

      <div
        style={containerStyle}
        className="relative drop-shadow-xl transition-opacity duration-200"
      >
        {children}
      </div>
    </div>
  );
}

function ThermalReceiptPaper({ order }: { order: Order }) {
  const grandTotal = order.total;

  return (
    <article
      style={{ clipPath: receiptClipPath }}
      className="relative z-10 bg-[#FAFAFA] border-x border-t border-[#E5E5E5] px-6 pt-6 pb-9 font-mono text-[#252525] shadow-sm select-none"
    >
      <div className="text-center pb-3 border-b border-dashed border-gray-300">
        <span className="text-[10px] font-bold text-[#F47721] tracking-widest uppercase block font-sans">
          College of Engineering Vadakara
        </span>
        <h3 className="text-base font-extrabold tracking-wider text-[#252525] uppercase mt-0.5 font-sans">
          CAFETERIA
        </h3>
        <p className="text-[10px] text-gray-500 mt-0.5 font-sans">Takeaway Pickup Receipt</p>
      </div>

      <div className="flex justify-between items-center py-2 text-xs border-b border-dashed border-gray-300">
        <div>
          <span className="text-[10px] text-gray-500 block uppercase font-sans">Order Token</span>
          <span className="font-bold text-sm text-[#F47721] font-mono">
            #{order.order_number}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-gray-500 block uppercase font-sans">Payment</span>
          <span className={`font-bold text-[11px] uppercase font-sans ${order.payment_status === 'paid' ? 'text-[#269B62]' : 'text-[#F47721]'}`}>
            {order.payment_status === 'paid' ? 'PAID ONLINE (UPI)' : 'PAY AT COUNTER'}
          </span>
        </div>
      </div>

      <div className="py-2.5 space-y-1 text-xs border-b border-dashed border-gray-300">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between items-center text-[11px]">
            <span className="truncate max-w-[170px] font-medium">
              {item.quantity}× {item.item_name}
            </span>
            <span className="font-medium text-gray-700 tabular-nums">
              {formatCurrency(item.line_total)}
            </span>
          </div>
        ))}
      </div>

      <div className="py-2.5 space-y-1 border-b border-dashed border-gray-300 text-xs">
        <div className="flex justify-between text-gray-500 text-[11px]">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatCurrency(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-500 text-[11px]">
          <span>Campus Tax / SGST / CGST</span>
          <span className="tabular-nums font-semibold text-[#269B62]">₹0.00</span>
        </div>
        <div className="flex justify-between font-extrabold text-sm text-[#252525] pt-1 border-t border-gray-200">
          <span>Total Amount</span>
          <span className="text-[#F47721] tabular-nums">{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      <div className="pt-4 pb-2 text-center flex flex-col items-center">
        <div className="p-2.5 bg-white border border-gray-300 rounded-xl shadow-xs inline-block">
          <QRCodeSvg
            value={order.qr_verification_token || order.id}
            size={110}
          />
        </div>
        <span className="text-[9px] font-bold text-[#F47721] mt-2 font-sans uppercase tracking-wider block">
          SCAN AT DELIVERY COUNTER
        </span>
        <p className="text-[10px] text-gray-500 mt-0.5 font-sans leading-tight max-w-[210px]">
          Show this QR token to collect your takeaway order.
        </p>
      </div>

      <div className="text-center pt-2.5 border-t border-dashed border-gray-300 text-[9px] text-gray-400 font-sans">
        Designed & Developed by IEDC CEV
      </div>
    </article>
  );
}

export function ReceiptPrinterAnimation({ order, onComplete }: ReceiptPrinterProps) {
  const [stage, setStage] = useState<ReceiptPrinterStage>('processing');

  useEffect(() => {
    const t1 = setTimeout(() => {
      setStage('printing');
    }, 900);

    const t2 = setTimeout(() => {
      setStage('complete');
      onComplete?.();
    }, 3300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  return (
    <ReceiptPrinterRoot stage={stage} feedMotion="stepped">
      <ReceiptPrinterMachine>
        <ReceiptPrinterScreen>
          <ReceiptPrinterStatus orderNumber={order.order_number} />
        </ReceiptPrinterScreen>
      </ReceiptPrinterMachine>

      <ReceiptPrinterOutput>
        <ThermalReceiptPaper order={order} />
      </ReceiptPrinterOutput>
    </ReceiptPrinterRoot>
  );
}
