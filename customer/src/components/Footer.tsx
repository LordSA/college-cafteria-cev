import Link from 'next/link';
import { HelpCircle, FileText, Lock, ShieldAlert } from 'lucide-react';

export function Footer() {
  return (
    <footer className="hidden md:block mt-auto border-t border-stone-200/80 dark:border-white/10 bg-gradient-to-b from-stone-50 to-white dark:from-[#121316] dark:to-[#0d0e12] text-stone-600 dark:text-stone-300 transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex items-center px-3 py-1.5 rounded-2xl bg-black dark:bg-white/[0.08] border border-white/10 shadow-xs">
                <img
                  src="/logo title.svg"
                  alt="Cafeteria CEV"
                  className="h-5 w-auto object-contain"
                />
              </div>
            </Link>

            <p className="mt-4 max-w-sm text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              Smart dining built exclusively for students, faculty, and campus staff at College of Engineering Vadakara.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-stone-900 dark:text-white">
              Canteen Menu
            </h3>
            <ul className="mt-4 space-y-2 text-xs">
              <li>
                <Link href="/menu" className="hover:text-[#ff5e3a] transition">
                  Today's Full Menu
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-[#ff5e3a] transition">
                  Active Food Cart
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-stone-900 dark:text-white">
              My Account
            </h3>
            <ul className="mt-4 space-y-2 text-xs text-stone-500 dark:text-stone-400">
              <li>
                <Link href="/orders" className="hover:text-[#ff5e3a] text-stone-600 dark:text-stone-300 transition">
                  My Orders
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-[#ff5e3a] text-stone-600 dark:text-stone-300 transition">
                  Profile & Presets
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-[#ff5e3a] text-stone-600 dark:text-stone-300 transition">
                  Account Settings & Theme
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-stone-900 dark:text-white">
              Policies & Help
            </h3>
            <ul className="mt-4 space-y-2 text-xs text-stone-500 dark:text-stone-400">
              <li>
                <Link href="/payment-faq" className="hover:text-[#ff5e3a] transition flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-[#ff5e3a]" />
                  <span>Payment FAQs & No Refund Policy</span>
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#ff5e3a] transition flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-stone-400" />
                  <span>Terms & Strict No Refund</span>
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#ff5e3a] transition flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-stone-400" />
                  <span>Privacy Policy</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-stone-200/80 dark:border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500 dark:text-stone-400">
          <p>© {new Date().getFullYear()} Cafeteria CEV. All rights reserved.</p>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
            <ShieldAlert className="h-3.5 w-3.5 text-[#ff5e3a]" />
            <span>Strict No-Refund & No-Cancellation Policy: Prepared fresh on-demand.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
