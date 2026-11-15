import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { ShieldCheck, Lock, Eye, Database, HelpCircle, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Privacy Policy
                </h1>
                <p className="mt-1 text-xs text-orange-100 font-medium">
                  Last updated: November 2026 &bull; Cafeteria CEV Platform
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="space-y-6 text-xs sm:text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            <div className="rounded-2xl border border-orange-200 dark:border-orange-500/30 bg-orange-50/70 dark:bg-orange-950/20 p-5 text-orange-950 dark:text-orange-200">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-[#ff5e3a] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm">Campus Privacy Commitment</h3>
                  <p className="mt-1 text-xs leading-relaxed text-orange-900/90 dark:text-orange-300">
                    Cafeteria CEV is built exclusively for our campus community. We do not sell, rent, or monetize your personal data. All data collected is strictly utilized to prepare and fulfill your daily meals at the college canteen.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-[#22242e] bg-white dark:bg-[#121316] p-5 shadow-xs">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#ff5e3a]" />
                <span>1. Information We Collect</span>
              </h2>
              <p className="mt-2 text-stone-600 dark:text-stone-300">
                When you create an account or place an order at the campus canteen, we collect:
              </p>
              <ul className="mt-2 list-disc list-inside space-y-1 pl-2 text-stone-700 dark:text-stone-300">
                <li><strong>Account Credentials:</strong> Your campus email address and chosen display name.</li>
                <li><strong>Role Classification:</strong> Student or faculty classification to apply staff approval workflows where requested.</li>
                <li><strong>Order History:</strong> Dish selections, order timestamps, quantities, and unique pickup token identifiers.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-[#22242e] bg-white dark:bg-[#121316] p-5 shadow-xs">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Database className="h-4 w-4 text-[#ff5e3a]" />
                <span>2. Payment & Transaction Security</span>
              </h2>
              <p className="mt-2 text-stone-600 dark:text-stone-300">
                Online payments are securely processed by standard payment gateways (such as Razorpay):
              </p>
              <ul className="mt-2 list-disc list-inside space-y-1 pl-2 text-stone-700 dark:text-stone-300">
                <li>We do not store or process raw credit cards, debit card CVVs, or net banking passwords on our servers.</li>
                <li>Transactions are end-to-end encrypted and tokenized according to RBI compliance guidelines.</li>
                <li>Faculty credit transactions are recorded against verified teacher profiles and settled with canteen administration.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-[#22242e] bg-white dark:bg-[#121316] p-5 shadow-xs">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#ff5e3a]" />
                <span>3. How We Use and Protect Your Data</span>
              </h2>
              <p className="mt-2 text-stone-600 dark:text-stone-300">
                Your data is strictly restricted to authorized canteen operations:
              </p>
              <ul className="mt-2 list-disc list-inside space-y-1 pl-2 text-stone-700 dark:text-stone-300">
                <li><strong>Kitchen Dispatch:</strong> Showing chef queue tickets with ordered dishes and order numbers.</li>
                <li><strong>Collection:</strong> Verifying order tokens and QR passes at the pickup point.</li>
                <li><strong>Access Control:</strong> Enforcing Row Level Security (RLS) on PostgreSQL so students cannot view other users' personal profiles or order history.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-[#22242e] bg-white dark:bg-[#121316] p-5 shadow-xs">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-[#ff5e3a]" />
                <span>4. Contact & Inquiries</span>
              </h2>
              <p className="mt-2 text-stone-600 dark:text-stone-300">
                For questions regarding your account or order privacy, contact the cafeteria management team in person at College of Engineering Vadakara.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
