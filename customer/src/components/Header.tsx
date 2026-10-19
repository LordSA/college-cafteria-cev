import { UtensilsCrossed } from 'lucide-react';
import { ApiHealthBadge } from './ApiHealthBadge';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-stone-50/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-500/30">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-stone-900">Cafteria</span>
            <span className="ml-2 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              Customer
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ApiHealthBadge />
        </div>
      </div>
    </header>
  );
}
