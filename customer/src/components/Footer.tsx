import Link from 'next/link';
import { HelpCircle, FileText, Lock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';



export function Footer() {
  const { activeTheme } = useTheme();
  return (
    <footer className="hidden md:block mt-auto border-t border-stone-200/80 dark:border-white/10 bg-gradient-to-b from-stone-50 to-white dark:from-[#121316] dark:to-[#0d0e12] text-stone-600 dark:text-stone-300 transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex items-center px-0 py-1.5">
                <img
                  src={activeTheme === 'dark' ? '/logo title.svg' : '/lg_title_blk.svg'}
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
        </div>
      </div>
    </footer>
  );
}
