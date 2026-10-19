import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Clock, Smartphone, CreditCard, Sparkles, ChefHat, CheckCircle2 } from 'lucide-react';

export default function CustomerLandingPage() {
  return (
    <>
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-stone-200/60 bg-gradient-to-b from-amber-50/50 via-white to-stone-50/30 py-20 sm:py-28">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-900 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Phase 1: Project Foundation Active
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-stone-900 sm:text-5xl md:text-6xl">
              Smart dining for your campus. <br className="hidden sm:inline" />
              <span className="text-amber-600">Zero wait, zero queues.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
              <strong>Cafteria</strong> is the modern digital ordering platform designed specifically for college canteens.
              Browse fresh daily specials, customize your meals, pre-order between lectures, and pick up your hot food without standing in line.
            </p>

            {/* Phase Notice Card */}
            <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-amber-300/70 bg-gradient-to-br from-amber-50 to-orange-50/50 p-6 text-left shadow-sm">
              <div className="flex items-start gap-3.5">
                <ChefHat className="h-6 w-6 flex-shrink-0 text-amber-600" />
                <div>
                  <h2 className="text-sm font-bold text-amber-950">
                    Live Menu & Ordering Coming in Phase 3 & 4
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
                    We are currently completing the foundational architecture (independent Next.js static client, Cloudflare Workers REST API, and edge proxying). Real-time menu feeds, Supabase authentication, and Razorpay checkout will be activated in upcoming development phases.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Previews Section */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600">Upcoming Features</h2>
              <p className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                Built to elevate the campus canteen experience
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Smartphone className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-stone-900">Digital Menu & Specials</h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-500">
                  Real-time stock indicators, morning breakfast specials, lunch combos, and snack availability right on your phone.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Planned for Phase 3
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-stone-900">Express Pre-Orders</h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-500">
                  Schedule meal preparation times between lecture intervals. Grab your token, verify your order, and pick up immediately.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Planned for Phase 4
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-stone-900">Campus UPI & Cards</h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-500">
                  Instant, cashless payments powered by Razorpay with automatic refund protection and itemized digital receipts.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Planned for Phase 6
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Architecture Badge */}
        <section className="border-t border-stone-200/80 bg-stone-100/50 py-12">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h3 className="text-sm font-semibold text-stone-700">Phase 1 Architecture Specifications</h3>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-stone-600">
              <span className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 shadow-sm border border-stone-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Next.js App Router (Static Export)
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 shadow-sm border border-stone-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Strict TypeScript
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 shadow-sm border border-stone-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Tailwind CSS
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 shadow-sm border border-stone-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Cloudflare Pages Target
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 shadow-sm border border-stone-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Dedicated REST API (:8787)
              </span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
