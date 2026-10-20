import Link from 'next/link';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import {
  ArrowRight,
  Utensils,
  Clock,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Coffee,
  ChefHat,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';

export default function CustomerLandingPage() {
  return (
    <>
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-stone-200/60 bg-gradient-to-b from-amber-50/60 via-stone-50/30 to-white py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-900 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>Phase 3 Live: Digital Menu & Verified Campus Accounts</span>
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-stone-900 sm:text-5xl md:text-6xl">
              Smart dining for your campus. <br className="hidden sm:inline" />
              <span className="text-amber-600">Zero wait, zero queues.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
              <strong>Cafteria</strong> is the modern dining portal built for college students, faculty, and campus staff.
              Browse daily kitchen specials, verify live dish availability, and get ready for pre-orders between lectures.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/menu"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-amber-600/20 hover:bg-amber-700 transition active:scale-95"
              >
                <Utensils className="h-4 w-4" />
                <span>Browse Today's Menu</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-6 py-3.5 text-sm font-bold text-stone-700 shadow-sm hover:bg-stone-50 hover:text-stone-900 transition active:scale-95"
              >
                <UserCheck className="h-4 w-4 text-amber-600" />
                <span>Create Campus Account</span>
              </Link>
            </div>

            <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/90 to-orange-50/60 p-6 text-left shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                    <ChefHat className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-amber-950">
                      Live Canteen Menu Feed Active
                    </h2>
                    <p className="mt-0.5 text-xs text-amber-900/80 leading-relaxed">
                      Check real-time stock indicators, breakfast specials, and afternoon snack items before heading to the counter.
                    </p>
                  </div>
                </div>

                <Link
                  href="/menu"
                  className="inline-flex items-center justify-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 whitespace-nowrap"
                >
                  <span>Explore Menu</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600">Platform Features</h2>
              <p className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                Engineered for college rush hours
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-stone-900">Live Menu & Daily Specials</h3>
                  <p className="mt-2 text-xs leading-relaxed text-stone-500">
                    Instant availability toggles updated directly by canteen chefs. Sold-out dishes are marked instantly so you never wait for an unavailable meal.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Live Now
                  </span>
                  <Link href="/menu" className="text-xs font-bold text-amber-700 hover:text-amber-800">
                    View Dishes &rarr;
                  </Link>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-stone-900">Verified Campus Profiles</h3>
                  <p className="mt-2 text-xs leading-relaxed text-stone-500">
                    Register with university credentials, verify via 6-digit email OTP, and request faculty/staff dining access with administrative approval.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Live Now
                  </span>
                  <Link href="/signup" className="text-xs font-bold text-amber-700 hover:text-amber-800">
                    Sign Up &rarr;
                  </Link>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <Clock className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-stone-900">Express Pre-Orders & Pickup</h3>
                  <p className="mt-2 text-xs leading-relaxed text-stone-500">
                    Order ahead between lecture intervals. Grab your unique digital order token and collect your hot meal at the counter without queuing.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-700">
                    Planned for Phase 4
                  </span>
                  <span className="text-xs text-stone-400 font-mono">Kitchen KDS</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-stone-200/80 bg-stone-100/60 py-14">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              Campus Canteen Operating Windows
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Kitchen timings and daily meal preparation slots
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <Coffee className="h-4 w-4 text-amber-600" />
                  <span>Breakfast Service</span>
                </div>
                <p className="mt-2 text-xs text-stone-600 font-medium">8:00 AM &ndash; 11:00 AM</p>
                <p className="mt-1 text-[11px] text-stone-400">Dosiraks, idlis, tea, coffee</p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <Utensils className="h-4 w-4 text-amber-600" />
                  <span>Lunch Rush</span>
                </div>
                <p className="mt-2 text-xs text-stone-600 font-medium">12:00 PM &ndash; 3:00 PM</p>
                <p className="mt-1 text-[11px] text-stone-400">Rice bowls, thali, noodles, combos</p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>Evening Snacks</span>
                </div>
                <p className="mt-2 text-xs text-stone-600 font-medium">4:00 PM &ndash; 7:00 PM</p>
                <p className="mt-1 text-[11px] text-stone-400">Samosas, puffs, juices, quick bites</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
