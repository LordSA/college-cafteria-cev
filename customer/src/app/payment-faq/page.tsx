'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import {
  HelpCircle,
  Wallet,
  CreditCard,
  QrCode,
  AlertCircle,
  ChevronDown,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FAQS: FaqItem[] = [
  {
    question: 'What payment methods can I use at our college canteen shop?',
    answer:
      'You can checkout using two methods: (1) Testing Wallet (Demo Credits) for instant digital pre-orders without entering bank cards, or (2) Pay at Counter when collecting your order at Counter #1 (via UPI, physical cash, or campus tokens).',
    icon: CreditCard,
  },
  {
    question: 'What is the "Testing Wallet" and how do demo credits work?',
    answer:
      'The Testing Wallet is an integrated feature built to test digital canteen pre-ordering. It uses simulated demo credits (e.g. ₹500.00) so students and staff can test ordering without risking real financial transactions. Demo credits carry no real monetary value and cannot be withdrawn.',
    icon: Wallet,
  },
  {
    question: 'Can I add real money to the testing wallet or withdraw credits?',
    answer:
      'No. Testing Wallet demo credits are strictly non-monetary. They cannot be topped up with real bank funds, refunded to a bank account, or converted into physical cash. Balance adjustments during testing are managed exclusively by canteen administrators.',
    icon: AlertCircle,
  },
  {
    question: 'How do I collect my food after paying or ordering?',
    answer:
      'Once your order is placed, our kitchen prepares your meal. You can monitor progress on the live Order Tracking page. When the status changes to "READY_TO_PICK", head to Counter #1 and show your high-contrast QR pass or order token (e.g. #B-108). Staff will verify and hand over your meal immediately.',
    icon: QrCode,
  },
  {
    question: 'Can I cancel an order and get my credits back?',
    answer:
      'Yes! As long as your order is in the initial "ORDER_PLACED" stage and the kitchen has not begun cooking, you can tap "Cancel Order" on your tracking page. Your demo credits will be instantly refunded to your Testing Wallet and logged on your ledger.',
    icon: CheckCircle2,
  },
  {
    question: 'How does the digital QR pass protect my meal from someone else taking it?',
    answer:
      'Each order generates a cryptographically random verification token (#CAF-QR-XXXXXX) rendered as a secure SVG QR code. When the canteen operator scans your QR code at Counter #1, it validates your order and permanently marks it as COLLECTED, preventing duplicate pickups.',
    icon: Sparkles,
  },
];

export default function PaymentFaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <>
      <Header />
      <main className="flex-1 pb-16">
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
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Payment & Ordering FAQs
                </h1>
                <p className="mt-1 text-xs text-orange-100 font-medium">
                  Everything you need to know about campus pre-orders, wallet credits, and pickups
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="space-y-4">
            {FAQS.map((faq, index) => {
              const isOpen = openIndex === index;
              const IconComp = faq.icon;

              return (
                <div
                  key={faq.question}
                  className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs transition hover:border-amber-300"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="flex w-full items-center justify-between p-5 text-left transition focus:outline-none"
                  >
                    <div className="flex items-center gap-3.5 pr-4">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#ff5e3a]">
                        <IconComp className="h-5 w-5" />
                      </div>
                      <h3 className="text-sm font-bold text-stone-900">
                        {faq.question}
                      </h3>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 flex-shrink-0 text-stone-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#ff5e3a]' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-stone-100 bg-stone-50/50 px-5 pb-5 pt-3">
                      <p className="text-xs sm:text-sm leading-relaxed text-stone-600">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-10 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/60 p-6 text-stone-800">
            <h3 className="font-bold text-sm text-stone-900">Still have a question?</h3>
            <p className="mt-1 text-xs text-stone-600">
              Visit our canteen staff at <strong>Counter #1</strong> in the campus dining hall between 8:00 AM and 7:00 PM, or explore our full menu.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Link
                href="/menu"
                className="rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95 transition"
              >
                Browse Today's Menu
              </Link>
              <Link
                href="/wallet"
                className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
              >
                Check Demo Wallet
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

