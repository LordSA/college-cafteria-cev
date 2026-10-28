'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Activity, AlertTriangle, RefreshCw } from 'lucide-react';

interface HealthData {
  status: string;
  timestamp: string;
  service: string;
  version: string;
  environment: string;
}

export function ApiHealthBadge() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/health`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as HealthData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#282a38] bg-[#17181f] px-3 py-1.5 text-xs text-stone-300 shadow-xs backdrop-blur-sm">
      <span className="flex items-center gap-1.5 font-semibold text-stone-400">
        <Activity className="h-3.5 w-3.5 text-[#9d8bf0]" />
        API:
      </span>

      {loading ? (
        <span className="flex items-center gap-1 text-stone-400">
          <RefreshCw className="h-3 w-3 animate-spin text-stone-400" />
          Checking...
        </span>
      ) : error ? (
        <span className="flex items-center gap-1 font-semibold text-rose-400" title={`Failed to reach ${apiUrl}/health (${error})`}>
          <AlertTriangle className="h-3.5 w-3.5" />
          Unreachable
        </span>
      ) : (
        <span className="flex items-center gap-1.5 font-bold text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Operational
        </span>
      )}
    </div>
  );
}
