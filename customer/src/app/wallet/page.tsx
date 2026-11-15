'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function WalletPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0b0c0e]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-[#f47721]" />
        <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">Redirecting to Canteen...</span>
      </div>
    </div>
  );
}
