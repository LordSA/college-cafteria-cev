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
    <div className="inline-flex items-center gap-3 rounded-full border border-stone-200 bg-white/90 px-4 py-2 text-xs backdrop-blur-sm shadow-sm transition-all">
      <span className="flex items-center gap-1.5 font-medium text-stone-600">
        <Activity className="h-3.5 w-3.5 text-stone-400" />
        Backend API:
      </span>

      {loading ? (
        <span className="flex items-center gap-1 text-stone-500">
          <RefreshCw className="h-3 w-3 animate-spin text-amber-500" />
          Connecting...
        </span>
      ) : error ? (
        <span className="flex items-center gap-1 text-rose-600" title={`Failed to reach ${apiUrl}/health (${error})`}>
          <AlertCircle className="h-3 w-3" />
          Offline ({apiUrl})
        </span>
      ) : (
        <span className="flex items-center gap-1 text-emerald-600 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Online ({data?.service} v{data?.version})
        </span>
      )}
    </div>
  );
}
