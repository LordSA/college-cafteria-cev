import { Shield, Lock } from 'lucide-react';
import { ApiHealthBadge } from './ApiHealthBadge';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/95 text-slate-100 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">Cafteria Admin</span>
            <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-700">
              Management Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-400/90 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-md">
            <Lock className="h-3.5 w-3.5" />
            <span>Auth Gated (Phase 2)</span>
          </div>
          <ApiHealthBadge />
        </div>
      </div>
    </header>
  );
}
