import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { FileText, CheckCircle2, Clock, ShieldAlert, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function TermsAndConditionsPage() {
  return (
    <>
      <Header />
      <main className="flex-1 pb-28 md:pb-16 bg-[#fafafa] dark:bg-[#0b0c0e]">
        <section className="bg-gradient-to-r from-[#ff5e3a] via-[#ff7043] to-[#ffa040] py-12 text-white">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-100 hover:text-white transition mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Canteen</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-sm">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Terms & Conditions
                </h1>
                <p className="mt-1 text-xs text-orange-100 font-medium">
                  Effective: November 2026 &bull; Cafeteria CEV Service & Ordering Rules
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="space-y-6 text-xs sm:text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            <div className="rounded-2xl border border-stone-200 dark:border-[#22242e] bg-white dark:bg-[#121316] p-5 shadow-xs">
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">1. Acceptance of Terms</h3>
              <p className="mt-2 text-stone-600 dark:text-stone-300">
                By accessing or placing orders through the Cafeteria CEV platform, you agree to comply with these terms, college canteen operating guidelines, and general campus regulations. This platform is provided exclusively for students, faculty, and authorized staff of College of Engineering Vadakara.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-[#22242e] bg-white dark:bg-[#121316] p-5 shadow-xs">
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#ff5e3a]" />
                <span>2. Ordering & Kitchen Preparation</span>
              </h3>
              <ul className="mt-3 list-disc list-inside space-y-1 pl-1 text-stone-600 dark:text-stone-300">
                <li>Orders placed online are transmitted directly into the live kitchen preparation display queue.</li>
                <li>Preparation times (typically 5 to 15 minutes) vary depending on rush hour volume between lectures.</li>
                <li>Menu items and pricing are subject to daily availability and pantry stock. Sold-out dishes are locked immediately.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-[#22242e] bg-white dark:bg-[#121316] p-5 shadow-xs">
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>3. Order Collection & Pickup</span>
              </h3>
              <ul className="mt-3 list-disc list-inside space-y-1 pl-1 text-stone-600 dark:text-stone-300">
                <li>Customers must present their active digital order token or high-contrast QR pass at the collection desk to pick up prepared food.</li>
                <li>When an order transitions to <strong>READY TO PICK</strong>, collect your meal promptly so it remains fresh and hot.</li>
                <li>Once scanned and validated by canteen counter staff, the QR token is permanently consumed and marked as <strong>COLLECTED</strong>.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-rose-300 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-950/20 p-5 shadow-xs">
              <h3 className="font-bold text-sm text-rose-900 dark:text-rose-200 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <span>4. Strict No-Refund & No-Cancellation Policy</span>
              </h3>
              <p className="mt-2 text-rose-900 dark:text-rose-300">
                All takeaway food orders placed through Cafeteria CEV are final, non-cancellable, and non-refundable:
              </p>
              <ul className="mt-3 list-disc list-inside space-y-1 pl-1 text-rose-900 dark:text-rose-300">
                <li><strong>Fresh Preparation:</strong> Because all cafeteria meals are prepared freshly to order for immediate consumption, kitchen operations begin right after order confirmation.</li>
                <li><strong>No Cancellations:</strong> Orders cannot be cancelled or modified once placed.</li>
                <li><strong>No Refunds or Exchanges:</strong> No monetary refunds, partial refunds, or item exchanges are granted under any circumstances, including late pickups or uncollected meals.</li>
                <li><strong>Verification:</strong> Please review your item selections, special instructions, and totals before confirming payment or placing your order.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-[#22242e] bg-white dark:bg-[#121316] p-5 shadow-xs">
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#ff5e3a]" />
                <span>5. Campus Dining Etiquette</span>
              </h3>
              <p className="mt-2 text-stone-600 dark:text-stone-300">
                Please maintain decorum in the campus dining hall, return trays and recyclable food packaging to designated bins, and follow staff guidance during peak rush periods.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
