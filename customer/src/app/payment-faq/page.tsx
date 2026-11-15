'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import {
  HelpCircle,
  CreditCard,
  QrCode,
  AlertCircle,
  ChevronDown,
  ArrowLeft,
  Sparkles,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
  icon: typeof CreditCard;
}

const FAQS: FaqItem[] = [
  {
    question: 'What is the Strict No-Refund and No-Cancellation Policy?',
    answer:
      'All orders placed on Cafeteria CEV are final, non-refundable, and non-cancellable. Because our kitchen team begins freshly preparing food immediately upon order confirmation to ensure speedy pickup between lectures, orders cannot be cancelled, amended, or refunded under any circumstances, including late pickups or uncollected meals.',
    icon: ShieldAlert,
  },
  {
    question: 'What payment methods can I use at Cafeteria CEV?',
    answer:
      'You can pay online via Razorpay (supporting GooglePay, PhonePe, Paytm, all UPI apps, Rupay/Visa/MasterCard debit and credit cards, and netbanking), Pay at Counter when collecting, or use Faculty Credit (Pay Later) if you are verified college staff.',
    icon: CreditCard,
  },
  {
    question: 'How does Faculty Credit (Pay Later) work?',
    answer:
      'Verified faculty and institutional staff can place orders instantly without paying at checkout. Orders are recorded against their verified teacher profile and can be cleared periodically via digital UPI or at the canteen desk.',
    icon: UserCheck,
  },
  {
    question: 'How do I collect my food after ordering?',
    answer:
      'Once your order is confirmed, follow real-time progress on the Order Tracking page. When the status changes to READY TO PICK, present your digital QR pass or token number (#B-108) at the takeaway counter. The operator will scan your QR code and hand over your hot meal.',
    icon: QrCode,
  },
  {
    question: 'Can I cancel an order once placed?',
    answer:
      'No. Due to immediate kitchen preparation for perishable hot food, cancellation is strictly disallowed. Please verify all selected items, quantities, and totals prior to confirming checkout.',
    icon: AlertCircle,
  },
  {
    question: 'How does the digital QR pass protect my meal pickup?',
    answer:
      'Each order generates a cryptographically unique verification token rendered as a high-contrast QR code. When canteen staff scan the token at collection, it validates the itemized order and marks it as COLLECTED, preventing duplicate or unauthorized pickups.',
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
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Payment & Ordering FAQs
                </h1>
                <p className="mt-1 text-xs text-orange-100 font-medium">
                  Important guidelines regarding campus orders, no-refund policy, and pickups
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
                  className="overflow-hidden rounded-2xl border border-stone-200 dark:border-[#22242e] bg-white dark:bg-[#121316] shadow-xs transition hover:border-orange-300 dark:hover:border-orange-500/40"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="flex w-full items-center justify-between p-5 text-left transition focus:outline-none"
                  >
                    <div className="flex items-center gap-3.5 pr-4">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#ff5e3a]">
                        <IconComp className="h-5 w-5" />
                      </div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {faq.question}
                      </h3>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 flex-shrink-0 text-stone-400 dark:text-stone-500 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#ff5e3a]' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-stone-100 dark:border-[#1e2029] bg-stone-50/50 dark:bg-[#17181f]/60 px-5 pb-5 pt-3">
                      <p className="text-xs sm:text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-10 rounded-3xl border border-orange-200 dark:border-orange-500/20 bg-gradient-to-br from-orange-50/70 to-rose-50/50 dark:from-[#1c1410] dark:to-[#171418] p-6 text-stone-800 dark:text-stone-200 shadow-xs">
            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">Strict Campus Takeaway Rules</h3>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Every meal is freshly cooked for swift takeaway dispatch. Once kitchen preparation begins, orders cannot be reversed, exchanged, or refunded. Please verify your basket carefully before placing an order.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Link
                href="/menu"
                className="rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:opacity-95 transition active:scale-95"
              >
                Browse Today's Menu
              </Link>
              <Link
                href="/terms"
                className="rounded-xl border border-stone-300 dark:border-[#2b2d3c] bg-white dark:bg-[#1a1b24] px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-[#20222e] transition active:scale-95"
              >
                View Terms & Policy
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
