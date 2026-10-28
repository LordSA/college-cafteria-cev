'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

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
    <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/20 bg-white/15 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs backdrop-blur-md shadow-xs text-white transition-all">
      <span className="hidden sm:inline-flex items-center gap-1 font-semibold text-orange-100">
        <Activity className="h-3 w-3 text-amber-200" />
        <span>API:</span>
      </span>

      {loading ? (
        <span className="flex items-center gap-1 text-orange-100">
          <RefreshCw className="h-3 w-3 animate-spin text-amber-200" />
          <span className="hidden sm:inline">Connecting...</span>
        </span>
      ) : error ? (
        <span className="flex items-center gap-1 text-white bg-rose-500/80 px-2 py-0.5 rounded-full font-bold text-[10px]" title={`Failed to reach ${apiUrl}/health (${error})`}>
          <AlertCircle className="h-3 w-3" />
          <span>Offline</span>
        </span>
      ) : (
        <span className="flex items-center gap-1 text-white font-bold">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
          <span>Online {data?.version ? `v${data.version}` : ''}</span>
        </span>
      )}
    </div>
  );
}
