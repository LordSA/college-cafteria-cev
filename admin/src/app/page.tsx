import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import {
  ShieldAlert,
  ClipboardList,
  Layers,
  BarChart3,
  Flame,
  LockKeyhole,
  CheckCircle2,
  Server,
} from 'lucide-react';

export default function AdminLandingPage() {
  return (
    <>
      <Header />

      <main className="flex-1 bg-slate-950 text-slate-100">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/50 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 shadow-sm">
              <Server className="h-3.5 w-3.5 text-indigo-400" />
              Phase 1: Project Foundation Active
            </div>

            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
              Cafteria Management Dashboard
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
              The operational headquarters for college canteen administrators, kitchen staff, and cashier desks.
              Streamlining inventory, real-time ticket dispatch, menu availability, and sales reconciliation.
            </p>

            {/* Strict Security Guard Card */}
            <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6 text-left shadow-lg backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-amber-200">
                    Administrative Controls Locked
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-amber-300/80">
                    To maintain strict zero-trust security across the platform, no privileged operations (menu mutations, price adjustments, kitchen status transitions, or settlement logs) are exposed in this phase.
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    All administrative capabilities will be guarded by Supabase Auth with server-side Role-Based Access Control (RBAC) and JWT validation in Phase 2.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Planned Modules Overview */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Planned Modules</h2>
              <p className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Canteen Operations Architecture
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                  <Flame className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">Kitchen Display System</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Live order ticketing queue with cooking status timers and order fulfillment markers.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
                  <LockKeyhole className="h-3.5 w-3.5" /> Gated: Phase 4
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                  <Layers className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">Menu & Pricing Engine</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Instant item stock toggling, daily lunch combos, categories, and meal window rules.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
                  <LockKeyhole className="h-3.5 w-3.5" /> Gated: Phase 3
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                  <ClipboardList className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">Inventory Tracking</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Raw ingredients and stock replenishment threshold alerts to prevent sold-out orders.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
                  <LockKeyhole className="h-3.5 w-3.5" /> Gated: Phase 3
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                  <BarChart3 className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">Sales & Settlement</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Daily revenue totals, peak hour traffic analytics, and Razorpay settlement auditing.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
                  <LockKeyhole className="h-3.5 w-3.5" /> Gated: Phase 6
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Architecture Specs */}
        <section className="border-t border-slate-800/80 bg-slate-900/40 py-12">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h3 className="text-sm font-semibold text-slate-300">Phase 1 Architecture Specifications</h3>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 shadow-sm border border-slate-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Next.js App Router (Static Export)
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 shadow-sm border border-slate-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Strict TypeScript
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 shadow-sm border border-slate-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Port 3001 Dedicated Dev Target
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 shadow-sm border border-slate-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Cloudflare Pages Target
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 shadow-sm border border-slate-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Dedicated REST API (:8787)
              </span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
