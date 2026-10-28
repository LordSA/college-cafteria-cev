import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { FileText, CheckCircle2, Clock, AlertTriangle, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function TermsAndConditionsPage() {
  return (
    <>
      <Header />
      <main className="flex-1 pb-28 md:pb-16">
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
                  Effective: October 2026 &bull; Cafteria CEV Service Rules
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="space-y-8 text-xs sm:text-sm leading-relaxed text-stone-600">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <h3 className="font-bold text-sm text-stone-900">1. Acceptance of Terms</h3>
              <p className="mt-2 text-stone-600">
                By accessing or placing orders through the Cafteria CEV platform, you agree to comply with these terms, college canteen operating guidelines, and general campus regulations. This platform is designed specifically for students, faculty, and authorized staff of the college.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#ff5e3a]" />
                <span>2. Ordering & Kitchen Preparation</span>
              </h3>
              <ul className="mt-3 list-disc list-inside space-y-1 pl-1 text-stone-600">
                <li>Orders placed online are transmitted directly to the kitchen display queue.</li>
                <li>Preparation times (typically 5 to 15 minutes) vary depending on current rush hour volume between lectures.</li>
                <li>Menu items and pricing in integer paise are subject to daily availability and pantry stock. Out-of-stock items are marked sold out immediately.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>3. Order Collection & Pickup</span>
              </h3>
              <ul className="mt-3 list-disc list-inside space-y-1 pl-1 text-stone-600">
                <li>Customers must present their active digital order token or high-contrast QR pass at the collection desk to pick up prepared food.</li>
                <li>When an order transitions to <strong>READY_TO_PICK</strong>, please collect your meal promptly to ensure food remains fresh and hot.</li>
                <li>Once scanned and confirmed by canteen staff, the QR token is permanently consumed and marked as <strong>COLLECTED</strong>.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#ff5e3a]" />
                <span>4. Testing Wallet & Demo Credit Terms</span>
              </h3>
              <p className="mt-2 text-stone-600">
                The integrated Testing Wallet provides simulated demo credits for testing digital checkouts on campus:
              </p>
              <ul className="mt-3 list-disc list-inside space-y-1 pl-1 text-stone-600">
                <li><strong>No Real Currency:</strong> Demo wallet balances carry zero monetary cash value and cannot be withdrawn, refunded in cash, or converted into bank funds.</li>
                <li><strong>Testing Audit Ledger:</strong> All adjustments and deductions are tracked on an auditable ledger for transparency and queue simulation.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#ff5e3a]" />
                <span>5. Campus Dining Etiquette</span>
              </h3>
              <p className="mt-2 text-stone-600">
                Please maintain decorum in the canteen hall, return trays and utensils to the designated collection area, and follow staff guidance during peak rush periods.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
